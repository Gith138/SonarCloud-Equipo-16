import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
interface Friend {
  _id: string;
  username_: string;
  profilePictureUrl_: string;
  email_: string;
}

interface FriendRequest {
  _id: string;
  username_: string;
  profilePictureUrl_: string;
  email_: string;
}

interface FriendActivity {
  friendUsername: string;
  friendProfilePictureUrl: string;
  songTitle: string;
  artistName: string;
  timestamp: string;
}
@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css']
})
export class FriendsComponent implements OnInit {
  searchFriend: string = '';
  filteredUsers: any[] = [];

  friends: Friend[] = [];
  friendRequests: FriendRequest[] = [];
  friendsActivity: FriendActivity[] = [];

  overlayMessage: string = '';
  overlayType: 'success' | 'error' = 'success';
  overlayVisible: boolean = false;


  constructor(private userService: UserService) {}

  ngOnInit() {
    this.loadFriends();
    this.loadFriendRequests(); 
    this.loadFriendsActivity();
  }

    // ---- Cargar lista de amigos ----
  loadFriends() {
    this.userService.getFriendsList().subscribe({
      next: (res: any) => {
        console.log('Amigos cargados:', res); // <-- prueba para ver datos
        this.friends = res || []; // res ya es un array, según tu Postman
      },
      error: err => {
        console.error('Error al cargar amigos', err);
        this.showOverlay('Error al cargar amigos', 'error');
      }
    });
  }


  // ---- Buscar usuarios ----
  searchUsers() {
    if (!this.searchFriend.trim()) {
      this.filteredUsers = [];
      return;
    }

    this.userService.searchUsers(this.searchFriend).subscribe({
      next: res => {
        // Excluir amigos ya agregados
        this.filteredUsers = res.users.filter((u: any) => 
          !this.friends.some(f => f._id === u._id)
        );
      },
      error: err => {
        console.error(err);
        this.showOverlay('Error al buscar usuarios', 'error');
      }
    });
  }

  // ---- Agregar amigo ----
  addFriend(user?: any) {
    // Obtenemos el ID. Si viene del objeto user (búsqueda) usamos user._id
    const friendId =  user?._id; 
    
    if (!friendId) {
      this.showOverlay("No se pudo identificar al usuario para añadirlo.", "error");
      return;
    }

    this.userService.addFriend(friendId).subscribe({
      next: (res) => {
        const msg = res?.message || 'Solicitud de amistad enviada';
        this.showOverlay(msg, 'success');
        this.searchFriend = '';
        this.filteredUsers = [];

        // Por si se ha aceptado automáticamente (solicitud mutua)
        this.loadFriends();
        this.loadFriendRequests();
        this.loadFriendsActivity();
      },
      error: err => {
        console.error(err);
        const errorMsg = err.error?.message || 'Error desconocido al enviar solicitud';
        this.showOverlay('Error: ' + errorMsg, 'error');
      }
    });
  }

  acceptRequest(requesterId: string) {
    this.userService.acceptFriendRequest(requesterId).subscribe({
      next: () => {
        this.showOverlay('Solicitud aceptada', 'success');
        this.friendRequests = this.friendRequests.filter(r => r._id !== requesterId);
        this.loadFriends();
        this.loadFriendsActivity();
      },
      error: err => {
        console.error(err);
        const msg = err.error?.message || 'Error al aceptar solicitud';
        this.showOverlay(msg, 'error');
      }
    });
  }

  rejectRequest(requesterId: string) {
    this.userService.rejectFriendRequest(requesterId).subscribe({
      next: () => {
        this.showOverlay('Solicitud rechazada', 'success');
        this.friendRequests = this.friendRequests.filter(r => r._id !== requesterId);
      },
      error: err => {
        console.error(err);
        const msg = err.error?.message || 'Error al rechazar solicitud';
        this.showOverlay(msg, 'error');
      }
    });
  }

  getfriend() {
    this.userService.getFriendsList().subscribe({
      next: (res: any) => {
        this.friends = res.users || [];
      },
      error: err => {
        console.error(err);
        this.showOverlay('Error al cargar amigos', 'error');
      }
    });
  }


  // ---- Eliminar amigo ----
  removeFriend(friendId: string) {
    if(!confirm("¿Seguro que quieres eliminar a este amigo?")) return;

    this.userService.removeFriend(friendId).subscribe({
      next: () => {
        this.showOverlay('Amigo eliminado correctamente', 'success');
        this.loadFriends(); // recarga completa
        this.loadFriendsActivity(); // recargar la actividad de amigos
      },
      error: err => {
        console.error(err);
        this.showOverlay('Error al eliminar amigo', 'error');
      }
    });
  }

  loadFriendRequests() {
    this.userService.getFriendRequests().subscribe({
      next: (res: any) => {
        this.friendRequests = res || [];
      },
      error: err => {
        console.error('Error al cargar solicitudes', err);
        this.showOverlay('Error al cargar solicitudes', 'error');
      }
    });
  }


  // -------------------
  // Actividad de amigos
  // -------------------
  loadFriendsActivity() {
    this.userService.getFriendsActivity().subscribe({
      next: (res: any) => {
        if (!res) return;
        this.friendsActivity = res.map((f: any) => ({
          friendUsername: f.username || f.friendUsername,
          friendProfilePictureUrl: f.avatar || f.friendProfilePictureUrl || f.friendProfilePictureUrl_,
          songTitle: f.lastSong?.title || 'Nada reproducido',
          artistName: f.lastSong?.artist || '',
          timestamp: f.lastSong?.listenedAt || f.lastSong?.time || ''
        }));
      },
      error: err => console.error('Error cargando actividad:', err)
    });
  }


  // ---------------------------
  // OVERLAY
  // ---------------------------
  showOverlay(message: string, type: 'success' | 'error' = 'success') {
    this.overlayMessage = message;
    this.overlayType = type;
    this.overlayVisible = true;

    const overlay = document.getElementById('overlay-message');
    if (!overlay) return;

    overlay.classList.remove('success', 'error');
    overlay.classList.add(type);

    overlay.classList.add('active');
    setTimeout(() => {
      overlay.classList.remove('active');
      this.overlayVisible = false;
    }, 2000);
  }

    // -------------------
  // Avatar por defecto
  // -------------------

  getUserAvatar(url?: string): string {
    return url && url.trim() !== '' ? url : 'assets/perfil.png';
  }
}
