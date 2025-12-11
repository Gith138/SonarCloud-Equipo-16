import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = 'http://localhost:3000/api/notifications';

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    const token = sessionStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  recommendSongToFriend(friendId: string, song: any, message?: string): Observable<any> {
    const payload = {
      receiverId_: friendId,
      type_: 'song_recommendation',
      message_: message || 'te recomienda una canción',
      data_: {
        title: song.title_ || song.title,
        // Aseguramos formato de YouTube
        youtubeUrl: song.youtubeURL_ || `https://www.youtube.com/watch?v=${song.id?.videoId || song.id}`, 
        thumbnail: song.thumbnailURL_ || song.thumbnail || song.snippet?.thumbnails?.default?.url
      }
    };

    // Usamos el endpoint de crear notificaciones internas
    // Asumo que tienes una ruta POST /api/notifications/me en tu backend
    return this.http.post(`${this.apiUrl}/me`, payload, this.getAuthHeaders());
  }

  // Obtener mis notificaciones
  getMyNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`, this.getAuthHeaders());
  }

  // Marcar una como leída
  markAsRead(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {}, this.getAuthHeaders());
  }

  // Marcar todas
  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all`, {}, this.getAuthHeaders());
  }

  // Borrar una
  deleteNotification(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.getAuthHeaders());
  }

  // Borrar todas
  deleteAll(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/clear`, this.getAuthHeaders());
  }


}