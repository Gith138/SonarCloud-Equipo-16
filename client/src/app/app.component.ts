/**
 * @file app.component.ts
 * @brief Componente raíz de la aplicación.
 * @description Actúa como el controlador principal de la interfaz, gestionando la visibilidad 
 * de la barra de navegación, la carga del perfil del usuario logueado y la seguridad global de las rutas.
 */
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'; // Importante para imagen segura
import { UserService } from './services/user.service';
import { NotificationsComponent } from './features/notifications/notifications.component'; 
import { ToastComponent } from './features/components/toast.component';

/**
 * @class App
 * @description Clase principal que inicializa el layout de la aplicación y reacciona a los eventos de navegación.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, NotificationsComponent, ToastComponent], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class App implements OnInit {
  /** @property {string} currentUrl - Almacena la ruta activa para lógica condicional en la vista. */
  currentUrl: string = '';
  /** @property {SafeUrl | string | null} avatarUrl - Imagen de perfil del usuario actual (sanitizada). */
  avatarUrl: SafeUrl | string | null = null;
  /** @property {boolean} isProfileMenuOpen - Estado de visibilidad del menú desplegable de perfil. */
  isProfileMenuOpen = false;
  /** @property {string} userInitial - Inicial del nombre de usuario para mostrar cuando no hay avatar. */
  userInitial: string = '';
  /**
   * @constructor
   * @param {Router} router - Servicio de navegación para detectar cambios de página.
   * @param {UserService} userService - Servicio para obtener datos del usuario y avatares.
   * @param {DomSanitizer} sanitizer - Para validar la seguridad de las imágenes cargadas.
   * @details 
   * Se suscribe a los eventos de `NavigationEnd` para:
   * 1. Actualizar la URL actual.
   * 2. Recargar el avatar si el usuario entra en una zona protegida.
   * 3. Limpiar el estado visual si el usuario cierra sesión.
   */
  constructor(private router: Router, private userService: UserService, private sanitizer: DomSanitizer) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = event.urlAfterRedirects || event.url;

      if (this.hasToken()) {
        this.loadUserProfile();
      } else {
        this.avatarUrl = null;
        this.isProfileMenuOpen = false;
      }
    });
  }

  /**
   * @method ngOnInit
   * @description Realiza tareas de limpieza de tokens en páginas de login y carga datos iniciales si hay sesión.
   */
  ngOnInit() {
    // Limpieza de tokens si estamos en login
    if (this.currentUrl.includes('/login') || this.currentUrl === '/') {
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      return;
    }

    if (this.hasToken()) this.loadUserProfile();
  }

 /**
   * @method hasToken
   * @description Valida si el usuario tiene una sesión activa y no se encuentra en una página de autenticación.
   * @returns {boolean} True si el usuario está logueado y en una zona privada.
   */
  hasToken(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    const token = sessionStorage.getItem('token'); // <--- sessionStorage 
    const isAuthPage = this.router.url.includes('/login') || 
                        this.router.url.includes('/register') ||
                        this.router.url.includes('/forgot-password') ||
                        this.router.url.includes('/reset-password');

    return !!token && !isAuthPage;
  }
  
  /**
   * @method loadUserProfile
   * @description Carga la foto de perfil del usuario, o en su defecto una imagen con la inicial del usuario si no dispone de foto de perfil. 
   */
  private loadUserProfile() {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        if (!user) {
          this.avatarUrl = null;
          this.userInitial = 'U';
          return;
        }

        const name: string = user.username_ || user.username || '';
        this.userInitial = name ? name.charAt(0).toUpperCase() : 'U';

        if (user._id) {
          this.userService.getAvatar(user._id).subscribe({
            next: (url) => (this.avatarUrl = url),
            error: () => (this.avatarUrl = null),
          });
        } else this.avatarUrl = null;
      },
      error: () => {
        this.avatarUrl = null;
        this.userInitial = 'U';
      },
    }); 
  }

  /**
   * @method toggleProfileMenu
   * @description Abre o cierra el menú de perfil, deteniendo la propagación para evitar conflictos con otros clics.
   * @param {MouseEvent} event - Evento de clic nativo.
   */
  toggleProfileMenu(event: MouseEvent) {
    event.stopPropagation(); 
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }
  /**
   * @method onDocumentClick
   * @description Detecta clics en cualquier parte del documento para cerrar el menú de perfil si se hace clic fuera.
   * @param {MouseEvent} event - Evento de clic global.
   */
  @HostListener('document:click', ['$event']) 
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Si el clic no fue dentro del menú ni del botón, cerramos
    if (!target.closest('.profile-wrapper')) {
      this.isProfileMenuOpen = false;
    }
  }
  /**
   * @method logout
   * @description Cierra la sesión del usuario, limpia todos los almacenamientos locales y redirige al login.
   */
  logout() {
    sessionStorage.clear();
    localStorage.clear();
    this.avatarUrl = null;
    this.isProfileMenuOpen = false;
    this.router.navigate(['/login']);
  }
}