/**
 * @file auth.interceptor.ts
 * @brief Interceptor de autenticación para peticiones HTTP en Angular.
 * @description Este interceptor se encarga de adjuntar el token JWT almacenado en 
 * sessionStorage a cada solicitud saliente y de manejar errores de autorización (401).
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * @function authInterceptor
 * @description Intercepta las peticiones HTTP para añadir el encabezado de Authorization.
 * @param {HttpRequest} req - La petición HTTP saliente.
 * @param {HttpHandlerFn} next - El siguiente manejador en la cadena de interceptores.
 * @returns {Observable<HttpEvent<any>>} Un flujo de eventos HTTP con el token inyectado o manejo de errores.
 * @details
 * 1. Recupera el token desde `sessionStorage`.
 * 2. Si existe, clona la petición y añade el header `Authorization: Bearer <token>`.
 * 3. Captura errores de respuesta: si detecta un error 401 (No autorizado), limpia el almacenamiento
 * y redirige al usuario a la página de inicio de sesión.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = sessionStorage.getItem('token');
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Limpieza de sesión y redirección por token inválido o expirado.
        sessionStorage.removeItem('token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};