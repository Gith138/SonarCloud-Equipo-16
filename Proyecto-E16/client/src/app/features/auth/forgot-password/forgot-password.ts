/* import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // Necesario para ngModel
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';   // <--- ¡ESTE ES EL QUE HACE QUE EL ENLACE FUNCIONE!

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  mensaje = '';
  esError: boolean = false;

  constructor(private http: HttpClient) {}
  
  enviarCorreo() {
    // Recuerda usar 'email_' con guion bajo si tu backend lo pide así
    const body = { email_: this.email };
    
    this.http.post('http://localhost:3000/api/auth/forgot-password', body)
      .subscribe({
        next: (res: any) => {
          this.mensaje = 'Correo enviado. Revisa tu bandeja.';
          this.esError = false;
        },
        error: (err) => {
          this.mensaje = err.error.message || 'Error al enviar.';
          this.esError = true;
        }
      });
  }
} */


/**
 * @file forgot-password.component.ts
 * @brief Componente para la gestión de recuperación de contraseñas.
 * @description Permite a los usuarios solicitar un correo electrónico de restablecimiento 
 * de contraseña proporcionando su dirección de email.
 */

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * @class ForgotPasswordComponent
 * @description Gestiona el formulario de "Olvidé mi contraseña" y la interacción con el API de autenticación.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})

/** 
  * @property {string} email - Almacena el correo electrónico introducido por el usuario mediante ngModel. 
  * @property {string} mensaje - Texto informativo o de error que se muestra al usuario en la interfaz. 
  * @property {boolean} esError - Flag para determinar el estilo visual (éxito/error) del mensaje mostrado. 
  * @constructor
  * @param {HttpClient} http - Servicio para realizar peticiones HTTP al servidor.
  * @method enviarCorreo
  * @description Envía una petición POST al servidor para iniciar el proceso de recuperación.
  * @details 
  * - El cuerpo de la petición usa la clave `email_` (específicamente requerida por el backend).
  * - En caso de éxito (200 OK), muestra un mensaje de confirmación.
  * - En caso de error, captura el mensaje del backend o muestra uno por defecto.
  */
export class ForgotPasswordComponent {
  email = '';
  mensaje = '';
  esError: boolean = false;

  constructor(private http: HttpClient) {}
  
  enviarCorreo() {
    const body = { email_: this.email };
    
    this.http.post('http://localhost:3000/api/auth/forgot-password', body)
      .subscribe({
        next: (res: any) => {
          this.mensaje = 'Correo enviado. Revisa tu bandeja.';
          this.esError = false;
        },
        error: (err) => {
          this.mensaje = err.error.message || 'Error al enviar.';
          this.esError = true;
        }
      });
  }
}