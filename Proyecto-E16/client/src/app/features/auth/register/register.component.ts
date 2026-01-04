/**
 * @file register.component.ts
 * @brief Componente para el registro de nuevos usuarios.
 * @description Maneja el formulario de alta de usuarios, realiza validaciones en el cliente
 * y utiliza el servicio de autenticación para persistir los datos en el servidor.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service'; 

/**
 * @class RegisterComponent
 * @description Proporciona la interfaz y lógica necesaria para crear una cuenta nueva.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  /** @property {string} username_ - Nombre de usuario elegido por el solicitante. */
  username_ = '';

  /** @property {string} email_ - Correo electrónico para la nueva cuenta. */
  email_ = '';

  /** @property {string} password_ - Contraseña (mínimo 6 caracteres según validación). */
  password_ = '';

  /** @property {string} confirmPassword_ - Campo de verificación para asegurar que la contraseña es correcta. */
  confirmPassword_ = '';

  /** @property {boolean} acceptTerms - Estado del checkbox de términos y condiciones. */
  acceptTerms = false;

  /** @property {string} errorMessage - Almacena mensajes de error de validación o respuesta del servidor. */
  errorMessage = '';

  /**
   * @constructor
   * @param {AuthService} authService - Servicio de abstracción para llamadas a la API de auth.
   * @param {Router} router - Servicio de navegación de Angular.
   */
  constructor(private authService: AuthService, private router: Router) {}

  /**
   * @method formValid
   * @description Realiza una validación lógica síncrona de los campos del formulario.
   * @returns {boolean} True si el formulario cumple con todos los requisitos mínimos.
   * @details Requisitos:
   * - Campos de texto no vacíos.
   * - Contraseña de al menos 6 caracteres.
   * - Coincidencia exacta entre password y confirmPassword.
   * - Aceptación de términos obligatoria.
   */
  formValid(): boolean {
    return (
      this.username_.trim() !== '' &&
      this.email_.trim() !== '' &&
      this.password_.length >= 6 &&
      this.password_ === this.confirmPassword_ &&
      this.acceptTerms
    );
  }

  /**
   * @method onRegister
   * @description Ejecuta el proceso de registro al enviar el formulario.
   * @details 
   * 1. Valida los datos localmente mediante `formValid()`.
   * 2. Si es válido, construye el objeto `userData` con el formato esperado por el backend.
   * 3. Llama a `authService.register`.
   * 4. En éxito: Redirige al usuario a la página de `/login`.
   * 5. En error: Captura y muestra el mensaje devuelto por la API.
   */
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
    this.authService.register(userData)
      .subscribe({
        next: (res) => {
          console.log('Usuario registrado:', res);
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Error al registrar:', err);
          this.errorMessage = err.error?.message || 'Error al conectar con el servidor';
        }
      });
  }
}