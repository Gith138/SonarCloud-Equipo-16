/**
 * @file login.component.ts
 * @brief Componente encargado de la autenticación de usuarios.
 * @description Maneja el formulario de inicio de sesión, se comunica con el servicio de autenticación
 * y gestiona el almacenamiento seguro del token de sesión.
 */

import { Component } from '@angular/core';
import { Router, RouterModule, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service'; 

/**
 * @class LoginComponent
 * @description Componente standalone que implementa la lógica de acceso a la aplicación.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})

/** 
 * @property {string} email_ - Almacena el correo electrónico del usuario (vinculado al backend). 
 * @property {string} password_ - Almacena la contraseña del usuario. 
 * @property {string} errorMessage - Almacena el mensaje de error descriptivo para mostrar en la interfaz. 
 * @constructor
 * @param {AuthService} authService - Servicio encargado de las peticiones de autenticación.
 * @param {Router} router - Servicio de Angular para la navegación entre rutas.
 * @method login
 * @description Procesa el intento de inicio de sesión.
 * @details
 * 1. Reinicia el estado de errores.
 * 2. Envía las credenciales al `AuthService`.
 * 3. Si la respuesta es exitosa:
 *   - Almacena el token en `sessionStorage`.
 *   - Limpia rastros previos en `localStorage`.
 *   - Redirige al usuario a la ruta `/home`.
 * 4. Si ocurre un error, mapea el código de estado HTTP (400, 401, etc.) a un mensaje amigable.
 */
export class LoginComponent {
  email_ = '';
  password_ = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    this.errorMessage = '';
    this.authService.login({ email_: this.email_, password_: this.password_ })
      .subscribe({
        next: (response: any) => {
          console.log('Login exitoso');
          sessionStorage.setItem('token', response.token);
          localStorage.removeItem('token'); 
          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error('Error al iniciar sesión:', err);
          if (err.status === 400) {
            this.errorMessage = 'Usuario no encontrado';
          } else if (err.status === 401) {
            this.errorMessage = 'Contraseña incorrecta';
          } else {
            this.errorMessage = 'Error al conectar con el servidor';
          }
        },
      });
  }
}