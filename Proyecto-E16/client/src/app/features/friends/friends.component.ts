import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafeUrl } from '@angular/platform-browser';
import { interval, Subscription } from 'rxjs';

import { UserService } from '../../services/user.service';
import { MusicService } from '../../services/music.service';
import { NotificationService } from '../../services/notification.service'; 

// Interfaces simplificadas
interface UserBase {
  _id: string;
  username_: string;
  profilePictureUrl_: string;
  email_: string;
  displayAvatar?: SafeUrl | string; 
}

interface FriendRecommendation {
  _id: string; // ID de la notificación
  friendId: string;
  friendUsername: string;
  songThumbnail: string;
  songTitle: string;
  artistName: string; // En notificaciones a veces no guardamos artista, podemos poner 'Recomendado'
  timestamp: string;
  displayAvatar?: SafeUrl | string;
  youtubeUrl: string; // 🔥 Importante: la URL directa
}

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.css'
})
export class FriendsComponent implements OnInit, OnDestroy {
  filteredUsers: UserBase[] = [];
  searchFriend: string = '';

  friends: UserBase[] = [];
  friendRequests: UserBase[] = [];
  friendsActivity: any[] = []; // Puedes usar la interfaz completa si quieres

  friendsRecommendations: FriendRecommendation[] = [];

  // Overlay
  overlayMessage: string = '';
  overlayType: 'success' | 'error' = 'success';
  overlayVisible: boolean = false;
  private timeoutId: any;

  private updateSubscription: Subscription | undefined;

  constructor(
    private notificationService: NotificationService,
    private userService: UserService, 
    private musicService: MusicService
  ) {}

  ngOnInit() {
    this.loadAllData();
    // Recarga automática cada 10s (Polling)
    this.updateSubscription = interval(10000).subscribe(() => this.loadAllData());
  }

  ngOnDestroy() {
    if (this.updateSubscription) this.updateSubscription.unsubscribe();
  }

  // Función helper para cargar todo junto
  loadAllData() {
    this.loadFriends();
    this.loadFriendRequests();
    this.loadFriendsActivity();
    this.loadRecommendations();
  }

  // -----------------------------
  // CARGA DE DATOS + IMÁGENES
  // -----------------------------
  
  // Helper centralizado para cargar imagen
  private loadImage(entity: any) {
    // Detectamos qué ID usar: 
    // - Si tiene 'friendId' (Actividad/Recomendación), usamos ese.
    // - Si no, usamos '_id' (Amigo normal).
    const userId = entity.friendId || entity._id;
    
    if (!userId) {
      entity.displayAvatar = 'assets/perfil.png';
      return;
    }

    // Inicializar con default
    if (!entity.displayAvatar) entity.displayAvatar = 'assets/perfil.png';

    this.userService.getAvatar(userId).subscribe({
      next: (safeUrl) => entity.displayAvatar = safeUrl,
      error: () => { /* Se queda con default */ }
    });
  }

  loadFriends() {
    this.userService.getFriendsList().subscribe({
      next: (res: any) => {
        this.friends = res || [];
        this.friends.forEach(f => this.loadImage(f));
      },
      error: () => console.error('Error cargando amigos')
    });
  }

  loadFriendRequests() {
    this.userService.getFriendRequests().subscribe({
      next: (res: any) => {
        this.friendRequests = res || [];
        this.friendRequests.forEach(req => this.loadImage(req));
      },
      error: () => console.error('Error cargando solicitudes')
    });
  }

  loadFriendsActivity() {
    this.userService.getFriendsActivity().subscribe({
      next: (res: any) => {
        if (!res) return;
        this.friendsActivity = res.map((f: any) => ({
          _id: f.friendId,

          friendUsername: f.username || f.friendUsername,
          id_song: f.lastSong?.songId,
          songThumbnail: f.lastSong?.thumbnail || 'assets/default-album.png',
          songTitle: f.lastSong?.title || 'Nada reproducido',
          artistName: f.lastSong?.artist || '',
          timestamp: this.formatDate(f.lastSong?.listenedAt),
          displayAvatar: 'assets/perfil.png'
        }));

        this.friendsActivity.forEach(act => this.loadImage(act));
      },
      error: () => console.error('Error cargando actividad')
    });
  }

   loadRecommendations() {
    this.notificationService.getMyNotifications().subscribe({
      next: (notifs: any[]) => {
        // Filtrar solo canciones
        const recs = notifs.filter(n => n.type_ === 'song_recommendation');

        this.friendsRecommendations = recs.map(n => ({
          _id: n._id, // ID de notificación
          friendId: n.senderId_?._id, 
          friendUsername: n.senderId_?.username_ || 'Anónimo',
          
          // Datos de canción (Defensivo: busca thumbnail O thumbnailUrl)
          songTitle: n.data_?.title || 'Canción desconocida',
          songThumbnail: n.data_?.thumbnail || n.data_?.thumbnailUrl || 'assets/default-album.png',
          youtubeUrl: n.data_?.youtubeUrl || '',
          artistName: n.message_ || 'Te recomienda esto',
          
          timestamp: this.formatDate(n.createdAt_),
          displayAvatar: 'assets/perfil.png'
        }));

        // Cargar fotos
        this.friendsRecommendations.forEach(rec => this.loadImage(rec));
      },
      error: () => console.error('Error recommendations')
    });
  }

  // -----------------------------
  // Amigos (Añadir, Aceptar y Borrar)
  // -----------------------------

  searchUsers() {
    if (!this.searchFriend.trim()) {
      this.filteredUsers = [];
      return;
    }
    this.userService.searchUsers(this.searchFriend).subscribe({
      next: (res: any) => {
        const users = res.users || [];
        this.filteredUsers = users.filter((u: any) => !this.friends.some(f => f._id === u._id));
        this.filteredUsers.forEach(u => this.loadImage(u));
      },
      error: () => this.showOverlay('Error al buscar', 'error')
    });
  }

  addFriend(user?: any) {
    const friendId = user?._id;
    if (!friendId) return;

    this.userService.addFriend(friendId).subscribe({
      next: (res) => {
        // 1. Feedback visual inmediato
        this.searchFriend = '';
        this.filteredUsers = [];
        
        const msg = res?.message || 'Solicitud enviada';
        this.showOverlay(msg, 'success');

        // 2. Recarga real tras 2 segundos
        setTimeout(() => this.loadAllData(), 2000);
      },
      error: (err) => this.showOverlay(err.error?.message || 'Error al añadir', 'error')
    });
  }

  acceptRequest(requesterId: string) {
    this.userService.acceptFriendRequest(requesterId).subscribe({
      next: () => {
        // 1. Quitar de la lista visualmente
        this.friendRequests = this.friendRequests.filter(r => r._id !== requesterId);
        this.showOverlay('Solicitud aceptada', 'success');
        
        // 2. Recarga real
        setTimeout(() => this.loadAllData(), 2000);
      },
      error: (err) => this.showOverlay(err.error?.message || 'Error', 'error')
    });
  }

  rejectRequest(requesterId: string) {
    this.userService.rejectFriendRequest(requesterId).subscribe({
      next: () => {
        this.friendRequests = this.friendRequests.filter(r => r._id !== requesterId);
        this.showOverlay('Solicitud rechazada', 'success');
        // No hace falta recargar todo aquí, solo desaparece
      },
      error: (err) => this.showOverlay(err.error?.message || 'Error', 'error')
    });
  }

  removeFriend(friendId: string) {
    if(!confirm("¿Eliminar a este amigo?")) return;

    this.userService.removeFriend(friendId).subscribe({
      next: () => {
        this.friends = this.friends.filter(f => f._id !== friendId);
        this.showOverlay('Amigo eliminado', 'success');
        setTimeout(() => this.loadAllData(), 2000);
      },
      error: (err) => this.showOverlay(err.error?.message || 'Error', 'error')
    });
  }

  // -----------------------------
  // MÚSICA Y UTILIDADES
  // -----------------------------

  handleSongClick(activity: any) {
    const id_song = activity.id_song;
    if (!id_song) return;

    this.musicService.getSongById(id_song).subscribe({
      next: (res: any) => {
        const song = res.song || res;
        if (song?.youtubeURL_) {
          window.open(song.youtubeURL_, '_blank');
          this.musicService.addSongToHistory(song).subscribe();
        } else {
          this.showOverlay('Enlace no disponible', 'error');
        }
      },
      error: () => this.showOverlay('Error al obtener canción', 'error')
    });
  }

  // Click en Recomendación (usa URL directa)
  handleRecommendationClick(rec: FriendRecommendation) {
    if (!rec.youtubeUrl) {
      this.showOverlay('Enlace no disponible', 'error');
      return;
    }

    window.open(rec.youtubeUrl, '_blank');

    // Guardar en Historial
    const songObj = {
      title_: rec.songTitle,
      youtubeURL_: rec.youtubeUrl,
      thumbnailURL_: rec.songThumbnail,
      artist_: "Recomendado por " + rec.friendUsername
    };

    this.musicService.addSongToHistory(songObj).subscribe();

    // Marcar como leída (opcional)
    this.notificationService.markAsRead(rec._id).subscribe();
  }

  // -----------------------------
  // UTILS
  // -----------------------------

  showOverlay(message: string, type: 'success' | 'error' = 'success') {
    if (this.timeoutId) clearTimeout(this.timeoutId);

    this.overlayMessage = message;
    this.overlayType = type;
    this.overlayVisible = true;

    // Lógica inteligente de duración
    let duration = 3000;
    if (type === 'error' || message.length > 25) duration = 5000;

    this.timeoutId = setTimeout(() => {
      this.overlayVisible = false;
      this.timeoutId = null;
    }, duration);
  }

  private formatDate(isoDate: string): string {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} - ${hours}:${minutes}`;
  }
}