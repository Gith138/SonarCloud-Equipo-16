/**
 * @file reset-password.component.ts
 * @brief Componente para el restablecimiento definitivo de la contraseña.
 * @description Permite al usuario establecer una nueva contraseña utilizando un token 
 * de seguridad obtenido previamente desde su correo electrónico.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; 
import { HttpClient } from '@angular/common/http';

/**
 * @class ResetPasswordComponent
 * @description Gestiona la validación del token de recuperación y la actualización de la credencial.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})

export class ResetPasswordComponent implements OnInit {
  /** @property {string} newPassword - Almacena la nueva contraseña introducida por el usuario. */
  newPassword = '';

  /** @property {string} token - El token único de seguridad extraído de la URL. */
  token = '';

  /** @property {string} mensaje - Feedback visual para el usuario sobre el resultado de la operación. */
  mensaje = '';

  /** @property {boolean} esError - Define si el mensaje actual debe mostrarse con formato de error. */
  esError = false;

  /**
   * @constructor
   * @param {ActivatedRoute} route - Para acceder a los parámetros de la ruta activa (token).
   * @param {HttpClient} http - Para realizar la petición POST al backend.
   * @param {Router} router - Para redirigir al usuario tras el éxito.
   */
  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * @method ngOnInit
   * @description Inicializador del componente que extrae el token de los parámetros de la ruta.
   * @details Utiliza `snapshot.paramMap` para capturar el valor del segmento `:token` definido en el router.
   */
  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
  }

  /**
   * @method cambiarPassword
   * @description Ejecuta la actualización de la contraseña en el servidor.
   * @details 
   * 1. Valida que el campo de contraseña no esté vacío.
   * 2. Construye la URL de endpoint incluyendo el token como parámetro de ruta.
   * 3. Realiza la petición POST.
   * 4. Si tiene éxito: Muestra confirmación y redirige al login tras un retardo de 2 segundos.
   * 5. Si falla: Muestra el error devuelto por el servidor (ej: token expirado).
   */
  cambiarPassword() {
    if (!this.newPassword) {
      this.mensaje = 'Por favor escribe una contraseña';
      this.esError = true;
      return;
    }

    const url = `http://localhost:3000/api/auth/reset-password/${this.token}`;
    const body = { newPassword: this.newPassword };

    this.http.post(url, body).subscribe({
      next: () => {
        this.esError = false;
        this.mensaje = '¡Contraseña cambiada! Redirigiendo al login...';
        
        // Temporizador para mejorar la experiencia de usuario antes de la redirección
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.esError = true;
        this.mensaje = err.error.message || 'El enlace ha caducado o es inválido';
      }
    });
  }
}