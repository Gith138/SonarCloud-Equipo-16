/**
 * @file toast.component.ts
 * @brief Componente global para la visualización de notificaciones (Toasts).
 * @description Se encarga de renderizar mensajes emergentes de éxito o error 
 * suscribiéndose a un flujo de datos proporcionado por el ToastService.
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastData } from '../../services/toast.service';
import { Observable } from 'rxjs';

/**
 * @class ToastComponent
 * @description Componente de UI que reacciona a los cambios en el estado de las notificaciones.
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  /** * @property {Observable<ToastData | null>} toast$
   * @description Stream de datos que emite la información del toast actual.
   * Se utiliza generalmente con el pipe `async` en el HTML para suscripción automática.
   */
  toast$: Observable<ToastData | null>;

  /**
   * @constructor
   * @param {ToastService} toastService - Servicio que centraliza la lógica de mostrar/ocultar notificaciones.
   */
  constructor(private toastService: ToastService) {
    // Inicializa el observable conectándolo con la fuente de datos del servicio
    this.toast$ = this.toastService.toast$;
  }

  /**
   * @method close
   * @description Solicita al servicio que limpie la notificación actual.
   * @details Útil para cerrar el toast manualmente antes de que expire su tiempo de vida.
   */
  close() {
    this.toastService.clear();
  }
}