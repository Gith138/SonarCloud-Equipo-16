/**
 * @file app.routes.ts
 * @brief Definición del mapa de navegación de la aplicación.
 * @description Configura las rutas disponibles en el sistema, diferenciando entre 
 * accesos públicos (autenticación) y accesos protegidos mediante guardias de seguridad.
 */
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard'; // 1. IMPORTANTE: Importar el guard
import { HomeComponent } from './features/home/home.component';
import { NotificationsComponent } from './features/notifications/notifications.component';
import { FriendsComponent } from './features/friends/friends.component';
import { SettingsComponent } from './features/settings/settings.component';
import { PlaylistsComponent } from './features/playlists/playlists.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { PlaylistDetailComponent } from './features/playlists/playlist-detail/playlist-detail.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password';

/**
 * @const routes
 * @type {Routes}
 * @description Arreglo de configuración de rutas de Angular.
 * @details
 * Se divide en tres secciones principales:
 * 1. **Rutas Públicas**: Login, Registro y recuperación de contraseña.
 * 2. **Rutas Privadas**: Protegidas por `authGuard`. Si el usuario no tiene token, 
 * el guard lo redirigirá automáticamente al login.
 * 3. **Redirecciones**: Manejo de rutas vacías y páginas no encontradas (comodín `**`).
 */
export const routes: Routes = [
  // RUTAS PÚBLICAS
  /** @path login - Pantalla de inicio de sesión. */
  { path: 'login', component: LoginComponent },

    /** @path register - Pantalla de creación de nueva cuenta. */
  { path: 'register', component: RegisterComponent },

  /** @path forgot-password - Formulario para solicitar recuperación de contraseña. */
  { path: 'forgot-password', component: ForgotPasswordComponent },

  /** 
   * @path reset-password/:token - Pantalla de cambio de contraseña.
   * @param token - Parámetro variable extraído de la URL enviada por correo. 
   */
  { path: 'reset-password/:token', component: ResetPasswordComponent },

  // RUTAS PRIVADAS
  /** @path notifications - Centro de notificaciones y solicitudes de amistad. */
  {
    path: 'notifications', 
    component: NotificationsComponent,
    canActivate: [authGuard] 
  },
  
  /** @path settings - Configuración de perfil y preferencias del usuario. */
  { 
    path: 'settings', 
    component: SettingsComponent,
    canActivate: [authGuard] 
  },
  
  /** @path home - Panel principal de búsqueda y recomendaciones. */
  { 
    path: 'home', 
    component: HomeComponent,
    canActivate: [authGuard] 
  },
  
  /** @path friends - Gestión de amigos y visualización de actividad social. */
  { 
    path: 'friends', 
    component: FriendsComponent,
    canActivate: [authGuard] 
  },

  /** @path playlists - Listado global de colecciones musicales del usuario. */
  { 
    path: 'playlists', 
    component: PlaylistsComponent,
    canActivate: [authGuard] 
  },
  
  /** @path playlists/:id - Detalle de una playlist específica.
   * @param id - Identificador único de la playlist en la base de datos.
   */
  { 
    path: 'playlists/:id', 
    component: PlaylistDetailComponent,
    canActivate: [authGuard] 
  },

  // REDIRECCIONES Y FALLBACKS
  /** Redirección de la raíz al login. */
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  
  /** Redirección de rutas inexistentes (404) al login. */
  { path: '**', redirectTo: 'login' },
];