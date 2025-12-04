import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink], 
  templateUrl: './app.component.html',
  // 🔹 CAMBIO: Usamos 'styles: []' vacío en lugar de buscar un archivo .css que no existe
  styles: [] 
})
export class App implements OnInit {
  currentUrl: string = '';

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = event.urlAfterRedirects || event.url;
    });
  }

  ngOnInit() {
    // Si arrancas en login, limpiamos tokens viejos para evitar errores visuales
    if (this.currentUrl.includes('/login') || this.currentUrl === '/') {
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
    }
  }

  hasToken(): boolean {
    if (typeof sessionStorage !== 'undefined') {
      const token = sessionStorage.getItem('token');
      // Ocultamos la barra si estamos en login/register
      const isAuthPage = this.router.url.includes('/login') || this.router.url.includes('/register');
      return !!token && !isAuthPage;
    }
    return false;
  }

  logout() {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}