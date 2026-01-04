/**
 * @file app.config.ts
 * @brief Configuración global de la aplicación Angular.
 * @description Define los proveedores de servicios esenciales, la configuración del enrutador,
 * la inyección de interceptores HTTP y la estrategia del Service Worker para soporte PWA.
 */
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // 1. Importar withInterceptors
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideServiceWorker } from '@angular/service-worker'; // 2. Importar tu interceptor

/**
 * @const appConfig
 * @type {ApplicationConfig}
 * @description Objeto de configuración que agrupa todos los proveedores necesarios para el arranque de la aplicación.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    /** * @brief Manejo global de errores.
     * Proporciona escuchadores para errores no capturados en el navegador.
     */
    provideBrowserGlobalErrorListeners(),
    /** 
     * @brief Optimización de detección de cambios.
     * Habilita eventCoalescing para reducir la carga de trabajo de Zone.js al agrupar eventos.
     */
    provideZoneChangeDetection({ eventCoalescing: true }),
    /** 
     * @brief Configuración de rutas.
     * Inyecta la definición de rutas importada desde app.routes.ts.
     */
    provideRouter(routes),
    /** 
     * @brief Cliente HTTP con Interceptores.
     * Configura HttpClient para utilizar el `authInterceptor`, encargado de adjuntar 
     * el token JWT a todas las peticiones salientes.
     */
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    /** 
     * @brief Configuración de Service Worker.
     * Habilita el Service Worker solo en entornos de producción (!isDevMode) para 
     * proporcionar capacidades offline y almacenamiento en caché.
     * Estrategia de registro: 'registerWhenStable:30000' (espera a que la app sea estable o 30s).
     */
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};