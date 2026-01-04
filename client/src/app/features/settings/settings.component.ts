/**
 * @file settings.component.ts
 * @brief Componente de configuración y gestión de perfil de usuario.
 * @description Maneja la actualización de datos personales, cambio de contraseña, 
 * gestión de privacidad, historial de reproducción, favoritos y limpieza de caché del sistema.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; 
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'; 
import { UserService } from '../../services/user.service';
import { MusicService } from '../../services/music.service';
import { ToastService } from '../../services/toast.service'; 
import { formatDate } from '../../utils/formDate';

/**
 * @class SettingsComponent
 * @description Centraliza todas las opciones de personalización y mantenimiento de la cuenta del usuario.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  imports: [CommonModule, FormsModule]
})
export class SettingsComponent implements OnInit {
 /** @property {SafeUrl | string} displayAvatar - Imagen de perfil sanitizada para mostrar en la UI. */
  displayAvatar: SafeUrl | string = 'assets/perfil.png';

  /** @property {Object} user - Almacena los datos internos del usuario sincronizados con el backend. */
  user = {
    username_: '',
    email_: '',
    profilePictureUrl_: '' 
  };

  // --- Variables de Control de Interfaz ---
  activeTab: string = 'profile'; /**< Pestaña activa: 'profile', 'preferences', 'history', 'likes' */
  userName = '';
  userEmail = '';
  newPassword = '';
  confirmNewPassword = '';

  // --- Preferencias de Privacidad ---
  privateSession = false;
  showFriendActivity = true;

  // --- Gestión de Archivos Multimedia ---
  selectedImage: string | null = null;      /**< Preview en base64 de la imagen seleccionada */
  selectedImageFile: File | null = null;    /**< Objeto File para subir al servidor */

  // --- Listas de Datos ---
  history: any[] = [];
  likedSongs: any[] = [];
  likesLoaded = false;
  cacheSize = ''; /**< Texto descriptivo del uso de disco y RAM */

  // --- Sistema de Notificación Interna (Overlay) ---
  overlayMessage: string = '';
  overlayType: 'success' | 'error' = 'success';
  overlayVisible: boolean = false;
  private timeoutId: any;

  /** @property {RegExp} emailRegex - Patrón de validación para correos electrónicos. */
  emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * @constructor
   * @param {UserService} userService - Servicio para gestión de cuenta y avatares.
   * @param {MusicService} musicService - Servicio para gestión de historial y favoritos.
   * @param {Router} router - Manejo de navegación.
   */
  constructor(
    private userService: UserService, 
    private musicService: MusicService, 
    private router: Router,
    private toast: ToastService,
    private sanitizer: DomSanitizer
  ) {}

  /**
   * @method ngOnInit
   * @description Carga inicial del perfil, cálculo de caché y recuperación del historial.
   */
  ngOnInit() {
    this.conectarDatosUsuario();
    this.calculateCacheSize();
    this.loadHistory();
  }
  
  // Cargar datos del usuario
  conectarDatosUsuario() {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.userName = user.username_;
        this.userEmail = user.email_;
        this.user.username_ = user.username_;
        this.user.email_ = user.email_;

        //  Cargar imagen usando el servicio inteligente (Caché)
        this.loadProfilePicture(user._id);

        this.newPassword = '';
        this.confirmNewPassword = '';
        this.loadPreferences();
      },
      error: (err) => {
        this.toast.error('Error al cargar datos de usuario');
      }
    });
  }

  /**
   * @method loadProfilePicture
   * @description Recupera el avatar del usuario a través del servicio inteligente (con soporte de caché en RAM).
   * @param {string} userId - ID del usuario propietario del avatar.
   */
  loadProfilePicture(userId: string) {
    this.userService.getAvatar(userId).subscribe({
      next: (safeUrl) => {
        this.displayAvatar = safeUrl;
      },
      error: () => {
        this.displayAvatar = 'assets/perfil.png';
      }
    });
  }
  
  // Validar formulario
  formValid(): boolean {
    return this.user.username_.trim() !== '' && this.emailRegex.test(this.user.email_);
  }

  /**
   * @method handleSaveProfile
   * @description Procesa la actualización del perfil utilizando FormData para permitir el envío de archivos (imágenes).
   * @details 
   * 1. Valida integridad de campos y contraseñas.
   * 2. Empaqueta preferencias en un JSON dentro del FormData.
   * 3. Si hay éxito, refresca la caché local y los datos del usuario.
   */
  handleSaveProfile() {
    if (!this.formValid()) {
      this.toast.error('Por favor completa los campos correctamente.');
      return;
    }
    
    if (this.activeTab !== 'preferences' && !this.hasChanges()) {
      this.toast.info('No se hicieron cambios.');
      return;
    }

    if (this.newPassword.trim().length > 0) {
      if (this.newPassword.length < 6) {
        this.toast.error('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (this.newPassword !== this.confirmNewPassword) {
        this.toast.error('Las contraseñas no coinciden.');
        return;
      }
    }
    const formData = new FormData();
    formData.append("username_", this.user.username_);
    formData.append("email_", this.user.email_);

    if (this.newPassword.trim().length >= 6) formData.append("password_", this.newPassword);
    if (this.selectedImageFile) formData.append("profilePicture", this.selectedImageFile);
  
    // EMPAQUETAR PREFERENCIAS
    const allSettings = this.getAllSettingsObject();
    formData.append("settings_", JSON.stringify(allSettings));

    this.userService.updateSettings(formData).subscribe({
      next: (updatedUser: any) => { 
        this.userName = updatedUser.username_;
        this.userEmail = updatedUser.email_;
        this.user.username_ = updatedUser.username_;
        this.user.email_ = updatedUser.email_;
        this.user.profilePictureUrl_ = updatedUser.profilePictureUrl_;
        this.selectedImage = null;
        this.selectedImageFile = null;
        this.toast.success('Datos actualizados correctamente');
        this.conectarDatosUsuario(); // recargar datos para asegurar consistencia
      }, 
      error: (err) => {
        console.error(err);

        if (err.status === 401 && err.error?.message === 'Token expirado') {
          sessionStorage.clear();
          this.router.navigate(['/login']);
          return;
        }
        this.toast.error(err.error?.message || 'Error al actualizar usuario');
      }
    });
  }

  // Helper para recolectar los 3 checkboxes
  private getAllSettingsObject() {
    return {
      privateSession_: this.privateSession,
      showFriendActivity_: this.showFriendActivity
    };
  }

  // Restablecer valores por defecto
  handleResetSettings() {
    this.privateSession = false;
    this.showFriendActivity = true;
    this.toast.success('Valores restablecidos. Pulsa Guardar para confirmar.');
  }

  /**
   * @method onFileSelected
   * @description Gestiona la selección de una imagen desde el disco local y genera una previsualización.
   * @param {any} event - Evento de selección de archivo del input type="file".
   */
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.selectedImageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result as string;
      this.displayAvatar = this.selectedImage; 
    };
    reader.readAsDataURL(file);
  }

  /**
   * @method handleDeleteAccount
   * @description Inicia el proceso de eliminación de la cuenta del usuario tras confirmación.
   * @details
   * 1. Solicita confirmación al usuario.
   * 2. Llama al servicio para eliminar la cuenta.
   * 3. Maneja la respuesta mostrando notificaciones y redirigiendo al login.
   */
  handleDeleteAccount() {
    const confirmacion = confirm("¿Seguro que deseas eliminar tu cuenta?");
    if (!confirmacion) return;
    this.userService.deleteUser().subscribe({
      next: () => {
        this.toast.success('Cuenta eliminada. Redirigiendo al login...');
        localStorage.clear();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Error al eliminar la cuenta');
      }
    });
  }
  
  // Verificar si hay cambios en el formulario
  hasChanges(): boolean {
    if (this.user.username_ !== this.userName || this.user.email_ !== this.userEmail) return true;
    if (this.newPassword.trim().length > 0) return true;
    if (this.selectedImageFile) return true;
    return false; // nada ha cambiado
  }
  // Manejar cambio de pestaña
  onTabChange(tab: string) {
    this.activeTab = tab;
    if (tab === 'history') this.loadHistory();
    if (tab === 'likes' && !this.likesLoaded) this.loadLikedSongs();
  }

  /**
   * @method calculateCacheSize
   * @description Estima el uso de almacenamiento sumando sessionStorage, RAM y la API de persistencia del navegador.
   */
  calculateCacheSize() { 
    
    const avatarsCount = this.userService.getAvatarCacheSize();
  
    let totalStringSize = 0;
    // Sumamos sessionStorage 
    for (let key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        totalStringSize += (sessionStorage[key].length + key.length) * 2;
      }
    }
    console.log(`Tamaño sessionStorage: ${totalStringSize} bytes`);
    
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate: any) => {
        const nativeUsed = estimate.usage || 0;
        const totalUsed = nativeUsed + totalStringSize; 
        const usedMB = (totalUsed / (1024 * 1024)).toFixed(3); 
        if (totalUsed > 0) {
          this.cacheSize = `${avatarsCount} RAM`;
        } else {
          this.cacheSize = `${avatarsCount} RAM`;
        }
        console.log(`Uso real total: ${totalUsed} bytes`);
      });
    } else {
      const usedMB = (totalStringSize / (1024 * 1024)).toFixed(3);
      this.cacheSize = `${usedMB} MB Local ( + ${avatarsCount} imgs en RAM)`;
    }  
  }
  
  /**
   * @method handleClearCache
   * @description Limpia la caché del navegador y la caché de avatares en memoria.
   * @details
   * 1. Elimina todas las entradas de la Cache API.
   * 2. Limpia el caché de avatares gestionado por UserService.
   * 3. Proporciona feedback visual y recarga datos relevantes.
   */
  async handleClearCache() {
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
    this.userService.clearAvatarCache();
    this.cacheSize = "0 MB";
    this.toast.success("Caché limpiado correctamente");
    setTimeout(() => {
      this.loadLikedSongs(); 
      this.conectarDatosUsuario();
    }, 3000);
  }

  /**
   * @method loadHistory
   * @description Recupera el historial de reproducción del usuario desde el backend.
   * @details Actualiza la propiedad `history` con los datos recibidos.
   */
  loadHistory() {
    this.userService.gethistory().subscribe({
      next: (res) => {
        this.history = res.history; // usar la propiedad 'history' del backend
        
      },
      error: (err) => {
        console.error('Error al cargar historial:', err);
        this.toast.error('Error al cargar historial');
      }
    });
  }
  
  /**
   * @method clearHistory
   * @description Limpia el historial de reproducción del usuario desde el backend.
   * @details Actualiza la propiedad `history` y proporciona feedback visual.
   */
  clearHistory() {
    this.userService.getcleanhistory().subscribe({
      next: () => {
        this.history = [];
        this.toast.success('Historial limpiado');
        setTimeout(() => {
          this.loadHistory();
        }, 2000);

      },
      error: (err) => {
        console.error('Error al limpiar historial:', err);
        this.toast.error('No se pudo limpiar el historial');
      }
    });
  }

  /**   * @method loadLikedSongs
   * @description Recupera la lista de canciones marcadas como "Me Gusta" por el usuario.
   * @details Actualiza la propiedad `likedSongs` con los datos recibidos.
   */
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

  /**
   * @method unlikeFromSettings
   * @description Quita una canción de la lista de "Me Gusta" del usuario.
   * @param song La canción a eliminar de la lista de "Me Gusta".
   */
  unlikeFromSettings(song: any) {
    if(!song._id) return;
    this.musicService.removeLikedSong(song._id).subscribe({
      next: () =>{ 
        this.likedSongs = this.likedSongs.filter(s => s._id !== song._id);
        setTimeout(() => {
         this.loadLikedSongs(); 
        }, 3000);
      }, error: (err) => {
        console.error('Error al quitar canción de Me Gusta:', err);
        this.toast.error('No se pudo quitar la canción de Me Gusta');
        setTimeout(() => {
         this.loadLikedSongs(); 
        }, 3000);
      }
    });
  }


  
  /**  
   * @method loadPreferences
   * @description Carga las preferencias de privacidad del usuario desde el backend.
   * @details Actualiza las propiedades `privateSession` y `showFriendActivity`.
   */
  loadPreferences() {
    this.userService.getPreferences().subscribe({
      next: (prefs: any) => {
        if (prefs) {
          this.privateSession = prefs.privateSession;
          this.showFriendActivity = prefs.showFriendActivity;
        }
        console.log('Preferencias visuales actualizadas:', {
          private: this.privateSession,
          friends: this.showFriendActivity
        });
      },
      error: (err) => console.error('Error cargando preferencias:', err)
    });
  }

  // Guardar preferencias
  savePreferences() {
    const prefs = {
      privateSession: this.privateSession,
      showFriendActivity: this.showFriendActivity
    };

    this.userService.updatePreferences(prefs).subscribe({
      next: (res) => {
        console.log('Guardado:', res);
        this.toast.success('Preferencias guardadas');
        setTimeout(() => {
         this.loadPreferences(); 
        }, 3000);
      },
      error: (err) => console.error(err)
    });
  }

  resetPreferences() {
    this.privateSession = false;
    this.showFriendActivity = true;
    const prefs = {
      privateSession: this.privateSession,
      showFriendActivity: this.showFriendActivity
    };
    this.userService.updatePreferences(prefs).subscribe({
      next: (res) => {
        console.log('Restablecer:', res);
        this.toast.success('Preferencias restablecidas');
        setTimeout(() => {
         this.loadPreferences(); 
        }, 3000);
      },
      error: (err) => console.error(err)
    });
  }

  /**
   * @method playSong
   * @description Abre la canción en YouTube y actualiza el historial.
   * @param {any} song - El objeto canción (puede venir de entry.song o directamente).
   */
  playSong(song: any) {
    // 1. Extraemos el ID de la canción
    const songId = song?._id || song?.id;
    if (!songId) return;

    // 2. Verificamos si ya tenemos la URL (para no llamar al backend innecesariamente)
    if (song.youtubeURL_) {
      this.executePlay(song);
    } else {
      // Si por alguna razón no tiene la URL, la buscamos por ID como en Friends
      this.musicService.getSongById(songId).subscribe({
        next: (res: any) => {
          const fullSong = res.song || res;
          this.executePlay(fullSong);
        },
        error: () => this.toast.error('Error al obtener la canción')
      });
    }
  }

  /**
   * @private @method executePlay
   * @description Lógica compartida para abrir ventana y guardar historial.
   */
  private executePlay(song: any) {
    if (song?.youtubeURL_) {
      window.open(song.youtubeURL_, '_blank');
      // Registramos de nuevo en el historial para que suba al principio
      this.musicService.addSongToHistory(song).subscribe({
        next: () => this.loadHistory() // Recargamos la lista para ver el cambio
      });
    } else {
      this.toast.error('Enlace no disponible');
    }
  }
}