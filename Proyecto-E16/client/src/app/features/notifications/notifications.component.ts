/**
 * @file notifications.component.ts
 * @brief Componente para la gestión y visualización de notificaciones en tiempo real.
 * @description Maneja el menú desplegable de notificaciones, incluyendo solicitudes de amistad,
 * recomendaciones de canciones y alertas del sistema, con actualización automática cada 5 segundos.
 */

import { Component, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { UserService } from '../../services/user.service';
import { SafeUrl } from '@angular/platform-browser';

/**
 * @interface Notification
 * @description Estructura de datos para las notificaciones, compatible con el populate del backend.
 */
interface Notification {
  _id: string;
  senderId_?: { 
    _id: string;
    username_: string;
    profilePictureUrl_?: string;
  };
  type_: string; /**< Tipo de notificación: 'friend_request', 'system_alert', 'song_recommendation' */
  message_: string;
  data_?: any;   /**< Datos adicionales (ej: URL de YouTube para recomendaciones) */
  isRead_: boolean;
  createdAt_: string;
  displayAvatar?: SafeUrl | string; /**< Avatar procesado para mostrar en la UI */
  formattedDate?: string;          /**< Fecha formateada de forma amigable (Hoy, Ayer...) */
};

/**
 * @class NotificationsComponent
 * @description Componente encargado de listar, marcar como leídas y gestionar las acciones de las notificaciones.
 */
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  /** @property {Notification[]} notifications - Lista de notificaciones cargadas. */
  notifications: Notification[] = [];
  /** @property {number} unreadCount - Contador de notificaciones pendientes de leer. */
  unreadCount = 0;
  /** @property {boolean} isOpen - Estado de visibilidad del menú desplegable. */
  isOpen = false;
  /** @private @property {Subscription} updateSubscription - Suscripción para el polling de actualizaciones. */
  private updateSubscription: Subscription | undefined;

  /**
   * @constructor
   * @param {NotificationService} notificationService - Servicio para interactuar con la API de notificaciones.
   * @param {UserService} userService - Servicio para obtener avatares de los remitentes.
   * @param {Router} router - Servicio de navegación.
   * @param {ElementRef} elementRef - Referencia al elemento del DOM para detectar clics externos.
   */
  constructor(
    private notificationService: NotificationService,
    private userService: UserService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  /**
   * @method ngOnInit
   * @description Inicia la carga de notificaciones y configura el intervalo de actualización (cada 5s).
   */
  ngOnInit() {
    this.loadNotifications();
    this.updateSubscription = interval(5000).subscribe(() => this.loadNotifications(true));
  }

  /**
   * @method ngOnDestroy
   * @description Cancela el intervalo de actualización para liberar recursos.
   */
  ngOnDestroy() {
    if (this.updateSubscription) this.updateSubscription.unsubscribe();
  }

  /**
   * @method clickout
   * @description Cierra el menú de notificaciones si el usuario hace clic fuera del componente.
   * @param {any} event - Evento de clic del ratón.
   */
  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  /**
   * @method toggleMenu
   * @description Cambia el estado de visibilidad del dropdown de notificaciones.
   */
  toggleMenu() {
    this.isOpen = !this.isOpen;
  }

  /**
   * @method loadNotifications
   * @description Recupera las notificaciones del servidor.
   * @param {boolean} isPolling - Indica si la carga proviene de la actualización automática.
   * @details Si es polling, solo actualiza la interfaz si detecta cambios reales en los datos para evitar parpadeos.
   */
  loadNotifications(isPolling: boolean = false) {
    this.notificationService.getMyNotifications().subscribe({
      next: (data: any[]) => {
        if (!isPolling || JSON.stringify(data) !== JSON.stringify(this.notifications)) {
          this.notifications = data.map(notif => {
            const formattedDate = this.smartDateFormat(notif.createdAt_);
            const displayAvatar = 'assets/perfil.png'; 
            return { ...notif, formattedDate, displayAvatar };
          });

          this.notifications.forEach(n => this.loadImageForNotification(n));
          this.unreadCount = this.notifications.filter(n => !n.isRead_).length;
        }
      },
      error: (err) => console.error(err)
    });
  }

  /**
   * @method loadImageForNotification
   * @description Carga el avatar del usuario que originó la notificación.
   * @param {Notification} notif - Notificación a la que se le asignará el avatar.
   */
  loadImageForNotification(notif: Notification) {
    const senderId = notif.senderId_?._id;
    if (!senderId) return;

    this.userService.getAvatar(senderId).subscribe(safeUrl => {
      notif.displayAvatar = safeUrl;
    });
  }

  /**
   * @method smartDateFormat
   * @description Formatea la fecha en un estilo amigable (Hoy, Ayer o Fecha completa).
   * @param {string} isoDate - Fecha en formato ISO proveniente del backend.
   * @returns {string} Fecha formateada para el usuario.
   */
  smartDateFormat(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (notifDate.getTime() === today.getTime()) return `Hoy ${timeStr}`;
    if (notifDate.getTime() === yesterday.getTime()) return `Ayer ${timeStr}`;
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${timeStr}`;
  }

  /**
   * @private @method processNotificationAction
   * @description Lógica común para marcar como leído y cerrar el menú tras interactuar con una notificación.
   */
  private processNotificationAction(notif: any) {
    if (!notif.isRead_) {
      this.notificationService.markAsRead(notif._id).subscribe();
      notif.isRead_ = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }
    this.isOpen = false;
  }

  /**
   * @method playSong
   * @description Acción específica para recomendaciones musicales: abre YouTube sin navegar a otra página.
   * @param {Event} event - Evento nativo para controlar la propagación.
   * @param {any} notif - Notificación que contiene la URL de YouTube.
   */
  playSong(event: Event, notif: any) {
    event.stopPropagation(); // Evita que el clic active goToFriends
    this.processNotificationAction(notif);
    if (notif.data_?.youtubeUrl) {
      window.open(notif.data_.youtubeUrl, '_blank');
    }
  }

  /**
   * @method onNotificationClick
   * @description Manejador principal del clic en una notificación.
   * Decide a qué ruta navegar basándose en el tipo de notificación.
   */
  onNotificationClick(notif: any) {
    // 1. Marcar como leída y cerrar menú
    this.processNotificationAction(notif);

    // 2. Lógica de Redirección Dinámica
    switch (notif.type_) {
      // CASO A: Cosas de Amigos -> Ir a /friends
      case 'friend_request':
      case 'friend_accept':
      case 'song_recommendation':
        this.router.navigate(['/friends']);
        break;

      // CASO B: Playlist Compartida -> Ir al detalle de la playlist
      case 'playlist_share':
        const playlistId = notif.data_?.playlistId;
        if (playlistId) {
          this.router.navigate(['/playlists', playlistId]);
        } else {
          console.warn('ID de playlist no encontrado en la notificación');
        }
        break;
      case 'playlist_unshare':
        this.router.navigate(['/playlists']);
        break;
      // CASO C: Mensajes (si lo tienes implementado)
      case 'message':
        this.router.navigate(['/messages']); // O la ruta que tengas para chat
        break;

      // CASO D: Alerta de sistema (Generalmente no redirige o va a home)
      case 'system_alert':
        // Opcional: this.router.navigate(['/home']);
        break;
        
      default:
        console.log('Tipo de notificación sin redirección específica:', notif.type_);
    }
  }
  /**
   * @method clearAll
   * @description Elimina todas las notificaciones del usuario tras confirmación.
   * @param {Event} event - Evento nativo para evitar el cierre accidental del menú.
   */
  clearAll(event: Event) {
    event.stopPropagation();
    if(!confirm("¿Borrar todo?")) return;
    this.notificationService.deleteAll().subscribe({
      next: () => {
        this.notifications = [];
        this.unreadCount = 0;
      }
    });
  }
}