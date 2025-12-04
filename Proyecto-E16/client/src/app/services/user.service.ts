import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users';
    // ==========================================
  // HELPER PRIVADO PARA OBTENER CABECERAS
  // ==========================================
  // Usamos esto para no repetir el código del token en cada función
  private getAuthHeaders() {
    const token = sessionStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }
  constructor(private http: HttpClient) {}

  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  // ----- Gestión de usuario -----
  // Obtener datos del usuario actual
  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`, { headers: this.getAuthHeaders() });
  }

  // Obtener foto de perfil
  getProfilePicture(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/me/image`, { headers: this.getAuthHeaders(), responseType: 'blob' });
  }

  // Actualizar settings con FormData
  updateSettings(data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/me/settings`, data, { headers: this.getAuthHeaders() });
  }

  // Método para eliminar cuenta
  deleteUser(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/me`, { headers: this.getAuthHeaders() });
  }


  // ----- Gestion de historial -----
  // añadir canción al historial
  addToHistory(songId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/me/history`, { songId }, { headers: this.getAuthHeaders() });
  }

  updateHistoryRating(songId: string, rating: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/me/history/rating`, { songId, rating }, { headers: this.getAuthHeaders() });
  }

  // Obtener historial
  gethistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me/history`, { headers: this.getAuthHeaders() });
  }

  // Limpiar historial
  getcleanhistory(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/me/history/clear`, { headers: this.getAuthHeaders() });
  }

  // ----- Gestión de amigos -----

  // Buscar usuarios
  searchUsers(searchTerm: string): Observable<any> {
    const params = new HttpParams().set('query', searchTerm);
    return this.http.get<any>(`${this.apiUrl}/search/user`, { params, headers: this.getAuthHeaders()  });
  }

  // traer fotos de amigos
  getFriendProfilePicture(friendId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${friendId}/image`, { headers: this.getAuthHeaders(), responseType: 'blob' });
  }

  // Añadir amigo
  getFriendsList(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/friends/list`, { headers: this.getAuthHeaders() }); // backend getFriendsList
  }

  addFriend(friendID: string): Observable<any> {
    console.log('Añadir amigo con ID:', friendID);
    return this.http.put<any>(`${this.apiUrl}/friends/add`, { friendId: friendID }, {
      headers: this.getAuthHeaders()
    });
  }
  
  removeFriend(friendId: string) {
    return this.http.request('delete', `${this.apiUrl}/friends/remove`, { body: { friendId }, headers: this.getAuthHeaders() });
  }

  getFriendsActivity(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/friends/activity`, { headers: this.getAuthHeaders() });
  }

  getFriendRequests(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/friends/requests`, { headers: this.getAuthHeaders() });
  }

  acceptFriendRequest(requesterId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/friends/requests/accept`, { requesterId }, { headers: this.getAuthHeaders() });
  }

  rejectFriendRequest(requesterId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/friends/requests/reject`, { requesterId }, { headers: this.getAuthHeaders() });
  }
}
