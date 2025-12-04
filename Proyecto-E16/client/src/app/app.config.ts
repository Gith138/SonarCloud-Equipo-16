import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // 1. Importar withInterceptors

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor'; // 2. Importar tu interceptor

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // 3. Configurar el HttpClient con el interceptor
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
};