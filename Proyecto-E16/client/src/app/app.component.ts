import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'; // Importante para imagen segura

// Servicios y Componentes
import { UserService } from './services/user.service';
import { NotificationsComponent } from './features/notifications/notifications.component'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, NotificationsComponent], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class App implements OnInit {
  currentUrl: string = '';
  avatarUrl: SafeUrl | string | null = null; // Usamos SafeUrl para compatibilidad
  isProfileMenuOpen = false;

  constructor(
    private router: Router, 
    private userService: UserService,
    private sanitizer: DomSanitizer
  ) {
    // Escuchar navegación para actualizar URL y estado
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = event.urlAfterRedirects || event.url;

      // Si hay token, cargamos avatar. Si no, limpiamos.
      if (this.hasToken()) {
        this.loadAvatar();
      } else {
        this.avatarUrl = null;
        this.isProfileMenuOpen = false;
      }
    });
  }

  ngOnInit() {
    // Limpieza de tokens si estamos en login
    if (this.currentUrl.includes('/login') || this.currentUrl === '/') {
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
    }
    // Carga inicial
    if (this.hasToken()) this.loadAvatar();
  }

  hasToken(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    const token = sessionStorage.getItem('token');
    const isAuthPage = this.router.url.includes('/login') || this.router.url.includes('/register');
    return !!token && !isAuthPage;
  }

  // Carga de avatar usando el servicio optimizado
  private loadAvatar() {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        if(user && user._id) {
          this.userService.getAvatar(user._id).subscribe({
            next: (url) => this.avatarUrl = url,
            error: () => this.avatarUrl = null
          });
        }
      },
      error: () => this.avatarUrl = null
    });
  }

  // Gestión del menú desplegable de perfil
  toggleProfileMenu(event: MouseEvent) {
    event.stopPropagation(); 
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  @HostListener('document:click', ['$event']) 
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Si el clic no fue dentro del menú ni del botón, cerramos
    if (!target.closest('.profile-wrapper')) {
      this.isProfileMenuOpen = false;
    }
  }

  logout() {
    sessionStorage.clear();
    localStorage.clear();
    this.avatarUrl = null;
    this.isProfileMenuOpen = false;
    this.router.navigate(['/login']);
  }
}