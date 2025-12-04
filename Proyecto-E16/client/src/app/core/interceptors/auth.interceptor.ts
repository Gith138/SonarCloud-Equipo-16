// Archivo: client/src/app/core/interceptors/auth.interceptor.ts

// Interceptor para añadir el token de autenticación a las peticiones HTTP

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  // 1. CAMBIO: Usamos sessionStorage en lugar de localStorage
  // Esto asegura que el token solo viva mientras el navegador está abierto.
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
        // Si el token caduca mientras usas la app, lo borramos y redirigimos
        sessionStorage.removeItem('token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};