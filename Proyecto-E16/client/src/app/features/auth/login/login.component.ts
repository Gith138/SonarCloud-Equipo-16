import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router'; // Quitamos HttpClient de aquí
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Asegúrate de que la ruta a tu servicio sea correcta. 
// Si el archivo se llama 'auth.service.ts', cambia 'login.service' por 'auth.service'.
import { AuthService } from '../../../services/auth.service'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email_ = '';
  password_ = '';
  errorMessage = '';

  // Inyectamos SOLO el AuthService y el Router
  constructor(private authService: AuthService, private router: Router) {}

  login() {
    // 1. Limpiamos errores previos
    this.errorMessage = '';

    // 2. Llamamos al servicio
    this.authService.login({ email_: this.email_, password_: this.password_ })
      .subscribe({
        next: (response: any) => {
          console.log('Login exitoso');

          // NOTA: Si pusiste el "tap" en el servicio como te enseñé, el token ya se guardó solo.
          // Si NO pusiste el "tap" en el servicio, descomenta estas dos líneas de abajo:
          
          sessionStorage.setItem('token', response.token);
          localStorage.removeItem('token'); // Limpieza por seguridad

          // 3. Redirigimos a la Home (cambiarlo en la presentación es necesario)
          this.router.navigate(['/playlists']);
        },
        error: (err) => {
          console.error('Error al iniciar sesión:', err);
          // Manejo de errores visuales para el usuario
          if (err.status === 400) this.errorMessage = 'Usuario no encontrado';
          else if (err.status === 401) this.errorMessage = 'Contraseña incorrecta';
          else this.errorMessage = 'Error al conectar con el servidor';
        },
      });
  }
}