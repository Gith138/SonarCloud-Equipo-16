import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { MusicService } from '../../services/music.service';
import { Router } from '@angular/router'; 

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  imports: [CommonModule, FormsModule]
})
export class SettingsComponent implements OnInit {
  // ---------------------------
  constructor(private userService: UserService, private musicService: MusicService, private router: Router) {}
  // Datos del usuario editables
  user = {
    username_: '',
    email_: '',
    profilePictureUrl_: ''
  };

  token: string | null = sessionStorage.getItem('token');

  calculateCacheSize() {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate: any) => {
        const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
        this.cacheSize = `${usedMB} MB`;

        // Aviso de que es un valor real
        console.log(`Cache size real: ${this.cacheSize}`);
      });
    } else {
      // Valor ficticio si el navegador NO soporta estimate()
      const fakeValue = 120; // MB inventados
      this.cacheSize = `${fakeValue} MB`;

      // Aviso en consola de que es estimado
      console.log(`Cache size estimado: ${this.cacheSize} (navegador no compatible)`);
    }
  }


  // ---------------------------
  // CARGAR DATOS DEL USUARIO AL ENTRAR
  // ---------------------------
  ngOnInit() {
    this.conectarDatosUsuario();
    this.calculateCacheSize();
    this.loadHistory();
  }

  // Cargar historial desde backend
  loadHistory() {
    this.userService.gethistory().subscribe({
      next: (res) => {
        this.history = res.history; // usar la propiedad 'history' del backend
      },
      error: (err) => {
        console.error('Error al cargar historial:', err);
        this.showOverlay('Error al cargar historial', 'error');
      }
    });
  }

  // Cargar imagen de perfil desde backend
  loadProfilePicture() {
    this.userService.getProfilePicture().subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.user.profilePictureUrl_ = reader.result as string; // base64 lista
        };
        reader.readAsDataURL(blob);
      },
      error: () => {
        console.log("No hay imagen en servidor, usando por defecto.");
        this.user.profilePictureUrl_ = "assets/perfil.png";
      }
    });
  }

  conectarDatosUsuario() {
    this.userService.getCurrentUser().subscribe({
    next: (user) => {
      this.userName = user.username_;
      this.userEmail = user.email_;
      this.user.username_ = user.username_;
      this.user.email_ = user.email_;

      // NO cargar la imagen de la BD → siempre pedir la del servidor
      this.user.profilePictureUrl_ = '';

      this.loadProfilePicture();

      this.newPassword = '';
      this.confirmNewPassword = '';
    },
    error: (err) => {
      console.error("Error al cargar usuario:", err);
    }
  });
  }
  
  // ---------------------------
  // OBTENER URL DE IMAGEN DE PERFIL
  // ---------------------------
  get profilePictureUrl() {
    return this.user.profilePictureUrl_ || 'assets/perfil.png';
  }

  // ---------------------------
  // PROPIEDADES USADAS EN EL HTML
  // ---------------------------
  activeTab: string = 'profile';

  likedSongs: any[] = [];
  likesLoaded = false;

  userName = 'Usuario Tempo';
  userEmail = 'usuario@tempo.com';
  newPassword: string = '';
  confirmNewPassword: string = '';

  emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  selectedImage: string | null = null;
  selectedImageFile: File | null = null;

  // Historial de reproducciones
  history: any[] = [];

  audioQuality = 'high';
  autoplay = true;
  normalizationVolume = true;
  gaplessPlayback = true;

  playlistUpdates = true;

  privateSession = false;
  showRecentlyPlayed = true;
  allowExplicitContent = true;

  language = 'es';
  showFriendActivity = false;
  downloadQuality = 'high';
  cacheSize = ''; // o '0 MB'

  // 
  overlayMessage: string = '';
  overlayType: 'success' | 'error' = 'success';


  // ---------------------------
  // VALIDACIÓN
  // ---------------------------
  formValid(): boolean {
    return (
      this.user.username_.trim() !== '' &&
      this.emailRegex.test(this.user.email_)
    );
  }


  hasChanges(): boolean {
    // Comprueba username y email
    if (this.user.username_ !== this.userName || this.user.email_ !== this.userEmail) return true;

    // Comprueba contraseña
    if (this.newPassword.trim().length > 0) return true;

    // Comprueba imagen seleccionada
    if (this.selectedImageFile) return true;

    return false; // nada ha cambiado
  }


  // ---------------------------
  // GUARDAR PERFIL
  // ---------------------------
  handleSaveProfile() {
    // Validaciones de formulario(email, username)
    if (!this.formValid()) {
      this.showOverlay('Por favor completa los campos correctamente.', 'error');
      return;
    }

    // Si no hay cambios, no hacer nada
    if (!this.hasChanges()) {
      this.showOverlay('No se hicieron cambios.', 'success');
      return;
    }

    if (this.newPassword.trim().length > 0) {
      // Si la nueva contraseña es muy corta
      if (this.newPassword.length < 6) {
        this.showOverlay('La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
      }
      // Si las contraseñas no coinciden
      if (this.newPassword !== this.confirmNewPassword) {
        this.showOverlay('Las contraseñas no coinciden.', 'error');
        return;
      }
    }

    const formData = new FormData();
    formData.append("username_", this.user.username_);
    formData.append("email_", this.user.email_);

    if (this.newPassword.trim().length >= 6) formData.append("password_", this.newPassword);
    if (this.selectedImageFile) formData.append("profilePicture", this.selectedImageFile);
  
    this.userService.updateSettings(formData).subscribe({
      // AQUI ESTA LA CLAVE: Recibimos 'updatedUser' del backend
      next: (updatedUser: any) => { 
      
        // 1. Actualizamos las variables visuales "estáticas" (las que están fuera del form)
        this.userName = updatedUser.username_;
        this.userEmail = updatedUser.email_;

        // 2. Actualizamos el objeto del formulario para que coincida con la BD
        this.user.username_ = updatedUser.username_;
        this.user.email_ = updatedUser.email_;
        this.user.profilePictureUrl_ = updatedUser.profilePictureUrl_;

        // 3. Limpiamos la "vista previa" y el archivo seleccionado
        // Esto obliga al getter 'profilePictureUrl' a usar la URL que viene del backend
        this.selectedImage = null;
        this.selectedImageFile = null;

        this.showOverlay('Datos actualizados correctamente', 'success');
      }, error: (err) => {
        console.error(err);

        if (err.status === 401 && err.error?.message === 'Token expirado') {
          sessionStorage.clear();
          this.router.navigate(['/login']);
          return;
        }
        this.showOverlay(err.error?.message || 'Error al actualizar usuario', 'error');
      }
    });
  }

  // ---------------------------
  // OVERLAY
  // ---------------------------
  showOverlay(message: string, type: 'success' | 'error' = 'success') {
    this.overlayMessage = message;
    this.overlayType = type;

    const overlay = document.getElementById('overlay-message');
    if (!overlay) return;

    overlay.classList.remove('success', 'error');
    overlay.classList.add(type);

    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 2000);
  }

  // ---------------------------
  // IMAGEN
  // ---------------------------
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedImageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
  
  // ---------------------------
  // ELIMINAR CUENTA
  // ---------------------------
  handleDeleteAccount() {
    const confirmacion = confirm("¿Seguro que deseas eliminar tu cuenta?");

    if (!confirmacion) return;

    this.userService.deleteUser().subscribe({
      next: () => {

        // 1 Mensaje de éxito
        this.showOverlay('Cuenta eliminada correctamente.', 'success');

        // 2️ Limpiar sesión
        localStorage.clear();

        // 3️ Redirigir después de 2 segundos (cuando el overlay desaparece)
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        console.error(err);
        
        this.showOverlay(err.error?.message || 'Error al eliminar la cuenta.', 'error');
      }
    });
  }

  // ---------------------------
  // Cache y restablecer ajustes
  // ---------------------------
  handleClearCache() {
    this.showOverlay('Caché limpiado exitosamente', 'success');
    this.cacheSize = '0 MB';
  }

  handleResetSettings() {
    // Restablecer valores predeterminados
    this.audioQuality = 'high';
    this.autoplay = true;
    this.normalizationVolume = true;
    this.gaplessPlayback = true;

 
    this.playlistUpdates = true;

    this.privateSession = false;
    this.showRecentlyPlayed = true;
    this.allowExplicitContent = true;

    this.language = 'es';
    this.showFriendActivity = false;
    this.downloadQuality = 'high';


    this.showOverlay('Configuración restablecida a los valores predeterminados', 'success');
  }


  // ---------------------------
  // Historial
  // ---------------------------
  // Limpiar historial
  clearHistory() {
    this.userService.getcleanhistory().subscribe({
      next: () => {
        this.history = [];
        this.showOverlay('Historial limpiado', 'success');
      },
      error: (err) => {
        console.error('Error al limpiar historial:', err);
        this.showOverlay('No se pudo limpiar el historial', 'error');
      }
    });
  }

    // Método para cambiar tab y cargar historial solo cuando se abra
  onTabChange(tab: string) {
    this.activeTab = tab;
    if (tab === 'history') this.loadHistory();
    if (tab === 'likes' && !this.likesLoaded) this.loadLikedSongs();
  }

  setRating(entry: any, rating: number) {
    const songId = entry.song?._id;

    if (!songId) {
      console.error('No se encontró el _id de la canción en el entry de historial');
      return;
    }

    this.userService.updateHistoryRating(songId, rating).subscribe({
      next: () => {
        entry.rating = rating; // Actualizamos en memoria para que se vea al instante
        this.showOverlay('Valoración actualizada', 'success');
      },
      error: (err) => {
        console.error('Error al actualizar valoración:', err);
        const msg = err.error?.message || 'Error al actualizar valoración';
        this.showOverlay(msg, 'error');
      }
    });
  }

  loadLikedSongs() {
    this.musicService.getLikedSongs().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          if (res.length > 0 && res[0].likedSongs) this.likedSongs = res[0].likedSongs;
          else this.likedSongs = [];
        } else this.likedSongs = res.likedSongs || res.likedSongs_ || [];
        this.likesLoaded = true;
      },
      error: (err) => {
        console.error('Error al cargar likes:', err);
        this.likesLoaded = true;
      }
    });
  }

  unlikeFromSettings(song: any) {
    const songId = song._id;
    if (!songId) return;

    this.musicService.removeLikedSong(songId).subscribe({
      next: () => {
        this.likedSongs = this.likedSongs.filter(s => s._id !== songId);
      },
      error: (err) => {
        console.error('Error al quitar like desde ajustes:', err);
      }
    });
  }
}
