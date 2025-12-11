import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../../services/auth.service'; 

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], // HttpClientModule ya no hace falta aquí
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  username_ = '';
  email_ = '';
  password_ = '';
  confirmPassword_ = '';
  acceptTerms = false;
  errorMessage = '';

  // 2. Inyectamos AuthService en lugar de HttpClient
  constructor(private authService: AuthService, private router: Router) {}

  formValid(): boolean {
    return (
      this.username_.trim() !== '' &&
      this.email_.trim() !== '' &&
      this.password_.length >= 6 &&
      this.password_ === this.confirmPassword_ &&
      this.acceptTerms
    );
  }

  onRegister() {
    if (!this.formValid()) {
      this.errorMessage = 'Por favor completa todos los campos correctamente.';
      return;
    }

    this.errorMessage = '';

    const userData = {
      username_: this.username_,
      email_: this.email_,
      password_: this.password_,
    };

    // 3. Usamos el servicio. 
    // Si mañana cambia la URL del backend, solo la cambias en auth.service.ts
    this.authService.register(userData)
      .subscribe({
        next: (res) => {
          console.log('Usuario registrado:', res);
          // Redirigir al login para que inicie sesión
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Error al registrar:', err);
          // Manejo seguro del mensaje de error
          this.errorMessage = err.error?.message || 'Error al conectar con el servidor';
        }
      });
  }
}