/**
 * @file auth.service.ts
 * @brief Servicio central de autenticación.
 * @description Gestiona las peticiones de registro, inicio de sesión y el estado de la sesión 
 * del usuario mediante el almacenamiento y recuperación de tokens JWT.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

/**
 * @class AuthService
 * @description Proporciona métodos para la comunicación con el backend en procesos de autenticación
 * y gestiona el almacenamiento persistente del token en la sesión del navegador.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** @private @property {string} apiUrl - Base URL para los endpoints de autenticación. */
  private apiUrl = 'http://localhost:3000/api/auth';

  /**
   * @constructor
   * @param {HttpClient} http - Cliente para realizar peticiones HTTP.
   * @param {Router} router - Servicio para manejar la navegación tras el logout.
   */
  constructor(private http: HttpClient, private router: Router) {}

  /**
   * @method register
   * @description Envía los datos de un nuevo usuario al servidor para su creación.
   * @param {any} userData - Objeto con la información del perfil (username_, email_, password_).
   * @returns {Observable<any>} Respuesta del servidor tras el intento de registro.
   */
  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  /**
   * @method login
   * @description Autentica al usuario y gestiona automáticamente el token recibido.
   * @param {Object} credentials - Credenciales de acceso.
   * @param {string} credentials.email_ - Correo electrónico del usuario.
   * @param {string} credentials.password_ - Contraseña.
   * @returns {Observable<any>} El flujo de la respuesta HTTP.
   * @details 
   * Utiliza el operador `tap` para interceptar la respuesta exitosa y:
   * 1. Almacenar el token en `sessionStorage`.
   * 2. Asegurar que no existan tokens antiguos en `localStorage`.
   */
  login(credentials: { email_: string; password_: string }): Observable<any> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        sessionStorage.setItem('token', response.token);
        localStorage.removeItem('token');
      })
    );
  }

  /**
   * @method logout
   * @description Finaliza la sesión del usuario.
   * @details Elimina el token de `sessionStorage` y redirige al usuario a la pantalla de login.
   */
  logout() {
    sessionStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
  
  /**
   * @method isLoggedIn
   * @description Verifica si existe una sesión activa actualmente.
   * @returns {boolean} True si hay un token almacenado, False en caso contrario.
   */
  isLoggedIn(): boolean {
    return !!sessionStorage.getItem('token');
  }
  
  /**
   * @method getToken
   * @description Recupera el token de autenticación actual.
   * @returns {string | null} El token JWT o null si no existe sesión.
   */
  getToken(): string | null {
    return sessionStorage.getItem('token');
  }
}