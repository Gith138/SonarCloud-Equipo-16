import { Component, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';


import { NotificationService } from '../../services/notification.service';
import { UserService } from '../../services/user.service';

import { SafeUrl } from '@angular/platform-browser';

interface Notification {
  _id: string;
  // senderId_ es un objeto porque en el backend usaste .populate()
  senderId_?: { 
    _id: string;
    username_: string;
    profilePictureUrl_?: string;
  };
  type_: string; // 'friend_request', 'system_alert', etc.
  message_: string;
  data_?: any;   // Para datos extra como canciones
  isRead_: boolean;
  createdAt_: string;
  
  // Propiedades extra que añadimos en el Frontend (opcionales)
  displayAvatar?: SafeUrl | string;
  formattedDate?: string;
};


@Component({
  selector: 'app-notifications', // Este selector lo pondrás en tu Navbar
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})

export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = []; // Usamos la interfaz
  unreadCount = 0;
  isOpen = false;
  private updateSubscription: Subscription | undefined;

  constructor(
    private notificationService: NotificationService,
    private userService: UserService,
    private router: Router,
    private elementRef: ElementRef // Para detectar clics fuera
  ) {}

  ngOnInit() {
    this.loadNotifications();
    this.updateSubscription = interval(5000).subscribe(() => this.loadNotifications(true));
  }

  ngOnDestroy() {
    if (this.updateSubscription) this.updateSubscription.unsubscribe();
  }

  // Detectar clic fuera para cerrar el menú
  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }

  loadNotifications(isPolling: boolean = false) {
    this.notificationService.getMyNotifications().subscribe({
      next: (data: any[]) => {
        // Solo procesamos si hay cambios
        if (!isPolling || JSON.stringify(data) !== JSON.stringify(this.notifications)) {
          
          this.notifications = data.map(notif => {
            // 1. Formatear Fecha
            const formattedDate = this.smartDateFormat(notif.createdAt_);
            
            // 2. Inicializar avatar
            const displayAvatar = 'assets/perfil.png'; 

            return { ...notif, formattedDate, displayAvatar };
          });

          // 3. Cargar imágenes reales (Sanitizadas)
          this.notifications.forEach(n => this.loadImageForNotification(n));

          this.unreadCount = this.notifications.filter(n => !n.isRead_).length;
        }
      },
      error: (err) => console.error(err)
    });
  }

  // -----------------------------
  // Funcion para cargar imagenes
  // -----------------------------
  loadImageForNotification(notif: Notification) {
    const senderId = notif.senderId_?._id;
    if (!senderId) return; // Si es sistema, se queda con la default

    this.userService.getAvatar(senderId).subscribe(safeUrl => {
      notif.displayAvatar = safeUrl;
    });
  }


  // FECHA INTELIGENTE
  smartDateFormat(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    
    // Resetear horas para comparar solo días
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (notifDate.getTime() === today.getTime()) {
      return `Hoy ${timeStr}`;
    } else if (notifDate.getTime() === yesterday.getTime()) {
      return `Ayer ${timeStr}`;
    } else {
      // Formato dd/mm/yyyy
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${timeStr}`;
    }
  }

  // ----------------------------------------------------------------
  // 🔥 LÓGICA DE REDIRECCIÓN 
  // ----------------------------------------------------------------
  handleNotificationClick(notif: any) {
    // 1. Marcar como leída visualmente y en backend
    if (!notif.isRead_) {
      this.notificationService.markAsRead(notif._id).subscribe();
      notif.isRead_ = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }

    // 2. Cerrar el menú
    this.isOpen = false;

    // 3. REDIRIGIR SEGÚN EL TIPO
    if (notif.type_ === 'friend_request' || notif.type_ === 'friend_accept') {
      // Te lleva a la página de amigos para que aceptes/rechaces allí
      this.router.navigate(['/friends']); 
    } 
    else if (notif.type_ === 'song_recommendation') {
      // Si es canción, la abrimos (o redirigimos al player)
      if (notif.data_?.youtubeUrl) {
        window.open(notif.data_.youtubeUrl, '_blank');
      }
      this.router.navigate(['/friends']);
    }
    
    // Si es alerta de sistema, no hace falta redirigir, solo se marca leída.
  }

  clearAll(event: Event) {
    event.stopPropagation(); // Para que no se cierre el menú al borrar
    if(!confirm("¿Borrar todo?")) return;
    this.notificationService.deleteAll().subscribe({
      next: () => {
        this.notifications = [];
        this.unreadCount = 0;
      }
    });
  }
}