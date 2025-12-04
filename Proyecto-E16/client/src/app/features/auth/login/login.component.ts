import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email_ = '';
  password_ = '';
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    this.http
      .post<{ message: string; token: string }>(
        'http://localhost:3000/api/auth/login',  
        { email_: this.email_, password_: this.password_ }
      )
      .subscribe({
        next: (response) => {
          console.log('Login exitoso:', response);
          

          // CAMBIO A SESSIONSTORAGE: 
          // Esto asegura que la sesión se cierre al cerrar el navegador.
          sessionStorage.setItem('token', response.token);
          
          // Limpiamos localStorage por si acaso había un token antiguo ahí
          localStorage.removeItem('token');

          // Redirigimos al área protegida (playlists)
          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error('Error al iniciar sesión:', err);
          if (err.status === 400) this.errorMessage = 'Usuario no encontrado';
          else if (err.status === 401) this.errorMessage = 'Contraseña incorrecta';
          else this.errorMessage = 'Error al conectar con el servidor';
        },
      });
  }
}
