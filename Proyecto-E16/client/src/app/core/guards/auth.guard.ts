/**
 * @file auth.guard.ts
 * @brief Implementación del Guard de autenticación para rutas protegidas.
 * * Este archivo contiene la lógica de seguridad para interceptar la navegación 
 * y asegurar que solo los usuarios con un token válido en sessionStorage 
 * puedan acceder a las rutas protegidas.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * @brief Guardia funcional para verificar la autenticación del usuario.
 * * Esta función se ejecuta antes de que se active una ruta. Verifica si existe
 * un token de autenticación almacenado. Si el token existe, permite la navegación.
 * Si no existe, redirige al usuario a la página de login.
 * * @param route La instantánea de la ruta activa (ActivatedRouteSnapshot). Contiene información sobre la ruta que se intenta cargar.
 * @param state El estado del router (RouterStateSnapshot). Contiene la URL y el árbol de rutas.
 * @return {boolean} Retorna true si el usuario está autenticado y puede pasar; false si se deniega el acceso.
 * * @note Este guard depende de 'sessionStorage'. Asegúrate de que el login y el interceptor usen el mismo almacenamiento.
 */
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