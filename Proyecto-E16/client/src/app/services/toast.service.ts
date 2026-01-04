/**
 * @file toast.service.ts
 * @brief Servicio global para la gestión de notificaciones efímeras (Toasts).
 * @description Utiliza un patrón de mensajería reactiva mediante RxJS para emitir 
 * mensajes de éxito, error o información que cualquier componente puede escuchar.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/** * @typedef ToastType
 * @description Define los tipos de notificaciones permitidos en el sistema.
 */
export type ToastType = 'success' | 'error' | 'info';

/** * @interface ToastData
 * @description Estructura de datos que contiene el mensaje y la categoría de la notificación.
 */
export interface ToastData {
  message: string;
  type: ToastType;
}

/**
 * @class ToastService
 * @description Servicio singleton que centraliza la lógica de mostrar y ocultar alertas temporales.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /** * @private @property {BehaviorSubject<ToastData | null>} _toast$ 
   * @description Fuente de datos interna que mantiene el estado actual del toast.
   */
  private _toast$ = new BehaviorSubject<ToastData | null>(null);

  /** * @property {Observable<ToastData | null>} toast$ 
   * @description Exposición pública del flujo de notificaciones para ser consumido por el ToastComponent.
   */
  toast$ = this._toast$.asObservable();

  /**
   * @method show
   * @description Emite una nueva notificación y programa su cierre automático.
   * @param {string} message - Texto descriptivo de la notificación.
   * @param {ToastType} type - Categoría visual (default: 'info').
   * @param {number} duration - Tiempo en milisegundos antes de desaparecer (0 para manual).
   * @details 
   * Incluye una validación lógica en el `setTimeout` para asegurar que el temporizador 
   * solo limpie la notificación si el mensaje no ha sido cambiado por una nueva emisión.
   */
  show(message: string, type: ToastType = 'info', duration = 3000) {
    this._toast$.next({ message, type });

    if (duration > 0) {
      setTimeout(() => {
        // Validación de consistencia: solo cerramos si el toast actual es el que programó el cierre
        if (this._toast$.value?.message === message) {
          this._toast$.next(null);
        }
      }, duration);
    }
  }

  /**
   * @method success
   * @description Atajo para mostrar una notificación de éxito con estilo verde.
   * @param {string} message - Mensaje a mostrar.
   * @param {number} duration - Duración (default: 3000ms).
   */
  success(message: string, duration = 3000) {
    this.show(message, 'success', duration);
  }

  /**
   * @method error
   * @description Atajo para mostrar una notificación de error con estilo rojo y mayor duración.
   * @param {string} message - Mensaje a mostrar.
   * @param {number} duration - Duración (default: 4000ms).
   */
  error(message: string, duration = 4000) {
    this.show(message, 'error', duration);
  }

  /**
   * @method info
   * @description Atajo para mostrar una notificación informativa con estilo azul.
   * @param {string} message - Mensaje a mostrar.
   * @param {number} duration - Duración (default: 3000ms).
   */
  info(message: string, duration = 3000) {
    this.show(message, 'info', duration);
  }

  /**
   * @method clear
   * @description Elimina inmediatamente cualquier notificación activa de la pantalla.
   */
  clear() {
    this._toast$.next(null);
  }
}