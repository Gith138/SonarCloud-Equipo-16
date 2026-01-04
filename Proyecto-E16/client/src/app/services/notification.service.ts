/**
 * @file notification.service.ts
 * @brief Servicio para la gestión de notificaciones y alertas del sistema.
 * @description Proporciona métodos para enviar recomendaciones musicales, recuperar el 
 * historial de notificaciones del usuario y gestionar su estado (leído/borrado).
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * @class NotificationService
 * @description Maneja la comunicación con el backend para todas las operaciones 
 * relacionadas con el sistema de notificaciones en tiempo real.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  /** @private @property {string} apiUrl - Endpoint base para las notificaciones. */
  private apiUrl = 'http://localhost:3000/api/notifications';

  /**
   * @constructor
   * @param {HttpClient} http - Cliente para realizar peticiones HTTP.
   */
  constructor(private http: HttpClient) {}

  /**
   * @private @method getAuthHeaders
   * @description Genera las cabeceras de autorización necesarias para las peticiones protegidas.
   * @returns {Object} Objeto con las cabeceras HTTP que incluyen el Bearer Token de sessionStorage.
   */
 private getAuthHeaders() {
    // Buscamos en ambos sitios por seguridad
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    // Si no hay token, devolvemos un objeto vacío para evitar enviar "Bearer null"
    if (!token) return {};
    return { 
      headers: new HttpHeaders({ 
        'Authorization': `Bearer ${token}` 
      }) 
    };
  }

  /**
   * @method recommendSongToFriend
   * @description Crea una notificación de tipo recomendación musical para otro usuario.
   * @param {string} friendId - ID del usuario destinatario.
   * @param {any} song - Objeto de la canción (puede ser de la BD local o de YouTube).
   * @param {string} [message] - Comentario opcional adjunto a la recomendación.
   * @returns {Observable<any>} Resultado de la creación de la notificación.
   * @details 
   * El método normaliza los datos de la canción (título, URL de YouTube y miniatura) 
   * para asegurar que el receptor pueda visualizarla correctamente independientemente del origen.
   */
  recommendSongToFriend(friendId: string, song: any, message?: string): Observable<any> {
    const payload = {
      receiverId_: friendId,
      type_: 'song_recommendation',
      message_: message || 'te recomienda una canción',
      data_: {
        title: song.title_ || song.title,
        youtubeUrl: song.youtubeURL_ || `https://www.youtube.com/watch?v=${song.id?.videoId || song.id}`, 
        thumbnail: song.thumbnailURL_ || song.thumbnail || song.snippet?.thumbnails?.default?.url
      }
    };

    return this.http.post(`${this.apiUrl}/me`, payload, this.getAuthHeaders());
  }

  /**
   * @method getMyNotifications
   * @description Recupera todas las notificaciones (leídas y no leídas) del usuario autenticado.
   * @returns {Observable<any[]>} Un flujo con el array de notificaciones.
   */
  getMyNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`, this.getAuthHeaders());
  }

  /**
   * @method markAsRead
   * @description Cambia el estado de una notificación específica a "leída".
   * @param {string} id - ID único de la notificación.
   */
  markAsRead(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {}, this.getAuthHeaders());
  }

  /**
   * @method markAllAsRead
   * @description Marca todas las notificaciones pendientes del usuario como leídas de forma masiva.
   */
  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all`, {}, this.getAuthHeaders());
  }

  /**
   * @method deleteNotification
   * @description Elimina permanentemente una notificación específica.
   * @param {string} id - ID de la notificación a borrar.
   */
  deleteNotification(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.getAuthHeaders());
  }

  /**
   * @method deleteAll
   * @description Vacía por completo el buzón de notificaciones del usuario.
   */
  deleteAll(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/clear`, this.getAuthHeaders());
  }
}