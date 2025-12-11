import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; 
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'; 

import { UserService } from '../../services/user.service';
import { MusicService } from '../../services/music.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  imports: [CommonModule, FormsModule]
})
export class SettingsComponent implements OnInit {
  
  // Imagen segura para la vista (evita parpadeos)
  displayAvatar: SafeUrl | string = 'assets/perfil.png';

  // Datos del usuario (lógica interna)
  user = {
    username_: '',
    email_: '',
    profilePictureUrl_: '' 
  };

  // Variables de UI
  activeTab: string = 'profile';
  userName = '';
  userEmail = '';
  newPassword = '';
  confirmNewPassword = '';

  // Configuración 
  privateSession = false;
  showFriendActivity = true;

  // Gestión de imágenes (Subida)
  selectedImage: string | null = null; 
  selectedImageFile: File | null = null;

  // Datos
  history: any[] = [];
  likedSongs: any[] = [];
  likesLoaded = false;
  cacheSize = ''; 

  // Overlay
  overlayMessage: string = '';
  overlayType: 'success' | 'error' = 'success';
  overlayVisible: boolean = false;
  private timeoutId: any;

  emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    private userService: UserService, 
    private musicService: MusicService, 
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.conectarDatosUsuario();
    this.calculateCacheSize();
    this.loadHistory();
  }

  // ---------------------------
  // Cargar datos del usuario
  // ---------------------------
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
      error: (err) => console.error("Error al cargar usuario:", err)
    });
  }

  // Usamos getAvatar del servicio para no recargar si ya existe
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

  // ---------------------------
  // GUARDAR PERFIL
  // ---------------------------
  handleSaveProfile() {
    // validación formulario(email y username)
    if (!this.formValid()) {
      this.showOverlay('Por favor completa los campos correctamente.', 'error');
      return;
    }
    
    // Si estamos en la pestaña de preferencias, permitimos guardar aunque no cambie el nombre
    if (this.activeTab !== 'preferences' && !this.hasChanges()) {
      this.showOverlay('No se hicieron cambios.', 'success');
      return;
    }

    if (this.newPassword.trim().length > 0) {
      // Validar contraseña
      if (this.newPassword.length < 6) {
        this.showOverlay('La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
      }
      // Comprobar confirmación
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
  
    // EMPAQUETAR PREFERENCIAS
    const allSettings = this.getAllSettingsObject();
    formData.append("settings_", JSON.stringify(allSettings));

    this.userService.updateSettings(formData).subscribe({
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

        this.conectarDatosUsuario(); // recargar datos para asegurar consistencia
      }, 
      error: (err) => {
        
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
    this.showOverlay('Valores restablecidos. Pulsa Guardar para confirmar.', 'success');
  }

  // ---------------------------
  // IMAGEN PREVIEW LOCAL
  // ---------------------------
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.selectedImageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result as string;
      // Actualizamos visualmente al instante
      this.displayAvatar = this.selectedImage; 
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

        this.showOverlay('Cuenta eliminada correctamente.', 'success');

        localStorage.clear();

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        console.error(err);
        
        this.showOverlay(err.error?.message || 'Error al eliminar la cuenta.', 'error');
      }
    });
  }

  // ---------------------------
  // UTILIDADES Y OVERLAY
  // ---------------------------
  
  showOverlay(message: string, type: 'success' | 'error' = 'success') {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.overlayMessage = message;
    this.overlayType = type;
    this.overlayVisible = true;

    this.timeoutId = setTimeout(() => {
      this.overlayVisible = false; // Ocultamos
      this.timeoutId = null;       // Limpiamos la variable
    }, 3000);
  }


  // ---------------------------
  // DETECCIÓN DE CAMBIOS
  // ---------------------------

  // Comprobar si hay cambios en el formulario
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

  // ---------------------------
  // GESTIÓN DE CACHÉ
  // ---------------------------
  
// ---------------------------
  // GESTIÓN DE CACHÉ (Navegador + RAM)
  // ---------------------------
  
calculateCacheSize() { 
    // 1. Consultar RAM (Tus avatares)
    const avatarsCount = this.userService.getAvatarCacheSize();

    // 2. Calcular localStorage y sessionStorage MANUALMENTE (Esto es lo que te falta)
    let totalStringSize = 0;

    // Sumamos sessionStorage (donde está tu Token)
    for (let key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        totalStringSize += (sessionStorage[key].length + key.length) * 2;
      }
    }
    console.log(`Tamaño sessionStorage: ${totalStringSize} bytes`);

    // 3. Consultar Storage "Pesado" (IndexedDB/Cache API)
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate: any) => {
        // Sumamos lo nativo + lo manual
        const nativeUsed = estimate.usage || 0;
        const totalUsed = nativeUsed + totalStringSize; // Suma total real

        // Convertir a MB con 4 decimales si es muy pequeño, o 2 si es grande
        const usedMB = (totalUsed / (1024 * 1024)).toFixed(3); 

        // Mostrar resultado
        if (totalUsed > 0) {
            this.cacheSize = `${usedMB} MB en Disco ( + ${avatarsCount} imgs en RAM)`;
        } else {
            this.cacheSize = `Vacío ( + ${avatarsCount} imgs en RAM)`;
        }
        
        console.log(`Uso real total: ${totalUsed} bytes`);
      });
    } else {
      // Fallback
      const usedMB = (totalStringSize / (1024 * 1024)).toFixed(3);
      this.cacheSize = `${usedMB} MB Local ( + ${avatarsCount} imgs en RAM)`;
    }  
  }
  
  async handleClearCache() {
    // 1. Limpiar Caché del Navegador (Service Workers / HTTP Cache)
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }

    // 2. Limpiar Caché de Avatares (RAM) 🔥 IMPORTANTE
    this.userService.clearAvatarCache();

    // 3. Feedback Visual
    this.cacheSize = "0 MB";
    this.showOverlay("Caché limpiado correctamente", "success");

    // 4. Recargar datos tras 3 segundos (como tenías en tu código)
    setTimeout(() => {
      // Recargamos likes por si acaso las imágenes venían de caché
      this.loadLikedSongs(); 
      // También es buena idea recargar el perfil para regenerar el avatar propio
      this.conectarDatosUsuario();
    }, 3000);
  }

  // ---------------------------
  // HISTORIAL DE REPRODUCCIÓN
  // ---------------------------

  // Cargar historial de reproducción
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
  
  // Limpiar historial
  clearHistory() {
    this.userService.getcleanhistory().subscribe({
      next: () => {
        this.history = [];
        this.showOverlay('Historial limpiado', 'success');
        setTimeout(() => {
          this.loadHistory();
        }, 2000); // espera lo mismo que el overlay

      },
      error: (err) => {
        console.error('Error al limpiar historial:', err);
        this.showOverlay('No se pudo limpiar el historial', 'error');
      }
    });
  }



  // ---------------------------
  // CANCIONES ME GUSTA
  // ---------------------------

  // Cargar canciones de Me Gusta
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


  // Quitar canción de Me Gusta
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
        this.showOverlay('No se pudo quitar la canción de Me Gusta', 'error');
        setTimeout(() => {
         this.loadLikedSongs(); 
        }, 3000);
      }
    });
  }


  // ---------------------------
  // PREFERENCIAS
  // ---------------------------
  // Cargar preferencias desde el backend
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
       
        this.showOverlay('Preferencias guardadas', 'success');
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
        
        this.showOverlay('Preferencias restablecidas', 'success');
        setTimeout(() => {
         this.loadPreferences(); 
        }, 3000);

      },
      error: (err) => console.error(err)
    });
  }
}