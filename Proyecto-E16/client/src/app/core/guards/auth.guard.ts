// Archivo: client/src/app/core/guards/auth.guard.ts
// Guard para proteger rutas que requieren autenticación

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // 1. Verificamos si existe el token en sessionStorage
  // (Debe coincidir con lo que usas en tu Login y en tu Interceptor)
  const token = sessionStorage.getItem('token');

  if (token) {
    // 2. Si hay token, el portero abre la puerta.
    return true;
  } else {
    // 3. Si NO hay token, redirigimos al usuario al Login.
    router.navigate(['/login']);
    return false;
  }
};