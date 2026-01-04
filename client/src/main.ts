/**
 * @file main.ts
 * @brief Punto de entrada principal de la aplicación.
 * @description Este archivo es el encargado de inicializar el entorno de Angular y
 * arrancar (bootstrap) el componente raíz utilizando la configuración definida.
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app.component';

/**
 * @function bootstrapApplication
 * @description Inicializa la aplicación Angular Standalone.
 * @param App - El componente raíz de la aplicación (definido en app.component.ts).
 * @param appConfig - El objeto de configuración global (rutas, interceptores, providers).
 * @details 
 * Si ocurre un error crítico durante la fase de arranque (por ejemplo, falta de recursos 
 * o error en un provider esencial), se captura mediante el bloque `.catch` y se muestra 
 * en la consola del navegador.
 */
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));