/**
 * @file friends.component.ts
 * @brief Componente para la gestión de la red social y actividad de amigos.
 * @description Maneja la búsqueda de usuarios, solicitudes de amistad, visualización de la 
 * actividad reciente de amigos y sistema de recomendaciones musicales.
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafeUrl } from '@angular/platform-browser';
import { interval, Subscription } from 'rxjs';

import { formatDate } from '../../utils/formDate';
import { ToastService } from '../../services/toast.service'; 
import { UserService } from '../../services/user.service';
import { MusicService } from '../../services/music.service';


/**
 * @interface UserBase
 * @description Estructura básica para representar a un usuario en las listas.
 */
interface UserBase {
  _id: string;
  username_: string;
  profilePictureUrl_: string;
  email_: string;
  displayAvatar?: SafeUrl | string; 
}

/**
 * @interface FriendRecommendation
 * @description Estructura para las recomendaciones de canciones recibidas de amigos.
 */
interface FriendRecommendation {
  _id: string; /**< ID único de la notificación/recomendación */
  friendId: string;
  friendUsername: string;
  songThumbnail: string;
  songTitle: string;
  artistName: string;
  timestamp: string;
  displayAvatar?: SafeUrl | string;
  youtubeUrl: string;
}

/**
 * @class FriendsComponent
 * @description Gestiona la interacción social, búsqueda y consumo de actividad musical de terceros.
 */
@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.css'
})
export class FriendsComponent implements OnInit, OnDestroy {
  /** @property {UserBase[]} filteredUsers - Resultados de la búsqueda de nuevos amigos. */
  filteredUsers: UserBase[] = [];
  /** @property {string} searchFriend - Cadena de texto para filtrar/buscar usuarios. */
  searchFriend: string = '';

  /** @property {UserBase[]} friends - Lista de amigos confirmados del usuario. */
  friends: UserBase[] = [];
  /** @property {UserBase[]} friendRequests - Solicitudes de amistad pendientes de aprobación. */
  friendRequests: UserBase[] = [];
  /** @property {any[]} friendsActivity - Flujo de las últimas canciones escuchadas por los amigos. */
  friendsActivity: any[] = []; 

  /** @property {FriendRecommendation[]} friendsRecommendations - Canciones recomendadas directamente por amigos. */
  friendsRecommendations: FriendRecommendation[] = [];

  // Propiedades del Overlay (Notificaciones internas)
  overlayMessage: string = '';
  overlayType: 'success' | 'error' = 'success';
  overlayVisible: boolean = false;
  private timeoutId: any;

  /** @private @property {Subscription} updateSubscription - Maneja el ciclo de vida del polling automático. */
  private updateSubscription: Subscription | undefined;

  /**
   * @constructor
   * @param {NotificationService} notificationService - Servicio de notificaciones (no utilizado directamente aquí pero inyectado).
   * @param {UserService} userService - Servicio para gestión de perfiles, amigos y avatares.
   * @param {MusicService} musicService - Servicio para obtener datos de canciones y recomendaciones.
   */
  constructor(
    private toast: ToastService,
    private userService: UserService, 
    private musicService: MusicService
  ) {}

  /**
   * @method ngOnInit
   * @description Inicializa la carga de datos y establece un intervalo de actualización cada 10 segundos.
   */
  ngOnInit() {
    this.loadAllData();
    this.updateSubscription = interval(10000).subscribe(() => this.loadAllData());
  }

  /**
   * @method ngOnDestroy
   * @description Limpia la suscripción al intervalo para evitar fugas de memoria (memory leaks).
   */
  ngOnDestroy() {
    if (this.updateSubscription) this.updateSubscription.unsubscribe();
  }

  /**
   * @method loadAllData
   * @description Ejecuta de forma paralela la carga de amigos, solicitudes, actividad y recomendaciones.
   */
  loadAllData() {
    this.loadFriends();
    this.loadFriendRequests();
    this.loadFriendsActivity();
    this.loadRecommendations();
  }

  /**
   * @private @method loadImage
   * @description Solicita el avatar procesado (SafeUrl) para una entidad (amigo, solicitud o actividad).
   * @param {any} entity - Objeto que requiere un avatar (debe tener _id o friendId).
   */
  private loadImage(entity: any) {
    const userId = entity.friendId || entity._id;
    
    if (!userId) {
      entity.displayAvatar = 'assets/perfil.png';
      return;
    }

    if (!entity.displayAvatar) entity.displayAvatar = 'assets/perfil.png';

    this.userService.getAvatar(userId).subscribe({
      next: (safeUrl) => entity.displayAvatar = safeUrl,
      error: () => { /* Mantiene el placeholder por defecto */ }
    });
  }

  /**
   * @method loadFriends
   * @description Obtiene la lista de amigos y carga sus imágenes de perfil.
   */
  loadFriends() {
    this.userService.getFriendsList().subscribe({
      next: (res: any) => {
        this.friends = res || [];
        this.friends.forEach(f => this.loadImage(f));
      },
      error: () => console.error('Error cargando amigos')
    });
  }

  /**
   * @method loadFriendRequests
   * @description Recupera las solicitudes de amistad entrantes.
   */
  loadFriendRequests() {
    this.userService.getFriendRequests().subscribe({
      next: (res: any) => {
        this.friendRequests = res || [];
        this.friendRequests.forEach(req => this.loadImage(req));
      },
      error: () => console.error('Error cargando solicitudes')
    });
  }

  /**
   * @method loadFriendsActivity
   * @description Obtiene el historial de escucha reciente de la red de amigos.
   */
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
          timestamp: formatDate(f.lastSong?.listenedAt),
          displayAvatar: 'assets/perfil.png'
        }));
        this.friendsActivity.forEach(act => this.loadImage(act));
      },
      error: () => console.error('Error cargando actividad')
    });
  }

  /**
   * @method loadRecommendations
   * @description Carga las canciones recomendadas por amigos, mapeando los objetos populados del backend.
   */
  loadRecommendations() {
    this.musicService.getMyRecommendations().subscribe({
      next: (data: any[]) => {
        // 1. Filtramos para ignorar recomendaciones con datos rotos (null)
        this.friendsRecommendations = data
          .filter(rec => rec.fromUserId_ && rec.songId_) 
          .map(rec => {
            const sender = rec.fromUserId_;
            const song = rec.songId_;

            return {
              _id: rec._id,
              friendId: sender._id,
              friendUsername: sender.username_ || 'Usuario desconocido',
              songTitle: song.title_ || 'Sin título',
              songThumbnail: song.thumbnailURL_ || 'assets/default-song.png',
              youtubeUrl: song.youtubeURL_,
              artistName: rec.message_ || 'Te recomienda esto',
              timestamp: formatDate(rec.receivedAt_),
              displayAvatar: 'assets/perfil.png'
            };
          });
          
        this.friendsRecommendations.forEach(rec => this.loadImage(rec));
      },
      error: (err) => console.error('Error cargando recomendaciones', err)
    });
  }
  /**
   * @method searchUsers
   * @description Busca usuarios en el sistema que no sean ya amigos del usuario actual.
   */
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
      error: () => this.toast.error('Error al buscar el usuario deseado')
    });
  }

  /**
   * @method addFriend
   * @description Envía una solicitud de amistad a un usuario específico.
   * @param {any} user - Objeto del usuario al que se desea agregar.
   */
  addFriend(user?: any) {
    const friendId = user?._id;
    if (!friendId) return;

    this.userService.addFriend(friendId).subscribe({
      next: (res) => {
        this.searchFriend = '';
        this.filteredUsers = [];
        this.toast.success(res?.message || 'Solicitud enviada');
        setTimeout(() => this.loadAllData(), 2000);
      },
      error: (err) => this.toast.error(err.error?.message || 'Error al añadir amigo')
    });
  }

  /**
   * @method acceptRequest
   * @description Acepta una solicitud de amistad pendiente.
   * @param {string} requesterId - ID del usuario que envió la solicitud.
   */
  acceptRequest(requesterId: string) {
    this.userService.acceptFriendRequest(requesterId).subscribe({
      next: () => {
        this.friendRequests = this.friendRequests.filter(r => r._id !== requesterId);
        this.toast.success('Solicitud de amistad aceptada');
        setTimeout(() => this.loadAllData(), 2000);
      },
      error: (err) => this.toast.error(err.error?.message || 'Error al aceptar solicitud')
    });
  }

  /**
   * @method rejectRequest
   * @description Rechaza y elimina una solicitud de amistad de la lista.
   * @param {string} requesterId - ID del usuario que envió la solicitud.
   */
  rejectRequest(requesterId: string) {
    this.userService.rejectFriendRequest(requesterId).subscribe({
      next: () => {
        this.friendRequests = this.friendRequests.filter(r => r._id !== requesterId);
        this.toast.success('Solicitud de amistad rechazada');
      },
      error: (err) => this.toast.error(err.error?.message || 'Error al rechazar solicitud')
    });
  }

  /**
   * @method removeFriend
   * @description Elimina la relación de amistad con un usuario tras confirmación.
   * @param {string} friendId - ID del amigo a eliminar.
   */
  removeFriend(friendId: string) {
    if(!confirm("¿Eliminar a este amigo?")) return;

    this.userService.removeFriend(friendId).subscribe({
      next: () => {
        this.friends = this.friends.filter(f => f._id !== friendId);
        this.toast.success('Amigo eliminado');
        setTimeout(() => this.loadAllData(), 2000);
      },
      error: (err) => this.toast.error(err.error?.message || 'Error al eliminar amigo')
    });
  }

  /**
   * @method handleSongClick
   * @description Procesa el clic en una canción de la actividad: abre YouTube y registra en el historial.
   * @param {any} activity - Objeto de actividad que contiene el `id_song`.
   */
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

          this.toast.error('Enlace no disponible');
        }
      },
      error: () => this.toast.error('Error al obtener canción')
    });
  }

  /**
   * @method handleRecommendationClick
   * @description Abre la URL de una recomendación y guarda la acción en el historial de reproducción.
   * @param {FriendRecommendation} rec - El objeto de recomendación seleccionado.
   */
  handleRecommendationClick(rec: FriendRecommendation) {
    if (!rec.youtubeUrl) return;
    window.open(rec.youtubeUrl, '_blank');

    const songObj = {
      title_: rec.songTitle,
      youtubeURL_: rec.youtubeUrl,
      thumbnailURL_: rec.songThumbnail,
      artist_: "Recomendado por " + rec.friendUsername
    };
    this.musicService.addSongToHistory(songObj).subscribe();
  }

  /**
   * @method deleteRecommendation
   * @description Elimina permanentemente una recomendación recibida.
   * @param {string} recId - ID de la recomendación en la base de datos.
   */
  deleteRecommendation(recId: string) {
    if (!confirm("¿Borrar esta recomendación?")) return;

    this.musicService.deleteRecommendation(recId).subscribe({
      next: () => {
        this.friendsRecommendations = this.friendsRecommendations.filter(r => r._id !== recId);

        this.toast.success('Recomendación eliminada');
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Error al eliminar recomendación');
      }
    });
  }

  /**
   * @method showOverlay
   * @description Muestra un mensaje temporal en pantalla con una duración variable según el tipo.
   * @param {string} message - Texto a mostrar.
   * @param {'success' | 'error'} type - Categoría del mensaje para el estilo visual.
   */
  showOverlay(message: string, type: 'success' | 'error' = 'success') {
    if (this.timeoutId) clearTimeout(this.timeoutId);

    this.overlayMessage = message;
    this.overlayType = type;
    this.overlayVisible = true;

    let duration = 3000;
    if (type === 'error' || message.length > 25) duration = 5000;

    this.timeoutId = setTimeout(() => {
      this.overlayVisible = false;
      this.timeoutId = null;
    }, duration);
  }

}