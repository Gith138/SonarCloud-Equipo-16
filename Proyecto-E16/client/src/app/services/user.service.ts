import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs'; // Importamos 'of'
import { tap, map } from 'rxjs/operators'; 
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'; // 🔥 NECESARIO PARA IMÁGENES


@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users';
  private avatarCache = new Map<string, SafeUrl>();

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}


  // Usamos esto para no repetir el código del token en cada función
  private getAuthHeaders() {
    const token = sessionStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }
  

  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }
  
  // Método para obtener el tamaño del caché de avatares en memoria
  getAvatarCacheSize(): number {
    return this.avatarCache.size;
  }

  // Método para limpiar el caché de avatares en memoria
  clearAvatarCache(): void {
    this.avatarCache.clear();
    console.log('🧹 Caché de avatares en memoria eliminada.');
  }
  
  // Método para obtener la foto de perfil de un usuario por su ID
  getAvatar(userId: string): Observable<SafeUrl | string> {
    // 1. Si ya tenemos la foto en memoria, la devolvemos al instante
    if (this.avatarCache.has(userId)) {
      return of(this.avatarCache.get(userId)!);
    }

    // 2. Si no, la pedimos al backend
    return this.http.get(`${this.apiUrl}/${userId}/image`, {
      headers: new HttpHeaders(this.getAuthHeaders()),
      responseType: 'blob' 
    }).pipe(
      map(blob => {
        // Creamos la URL segura
        const objectURL = URL.createObjectURL(blob);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
        
        // 3. LA GUARDAMOS para la próxima vez
        this.avatarCache.set(userId, safeUrl);
        return safeUrl;
      })
    );
  }

  // ----- Gestión de usuario -----
  // Obtener datos del usuario actual
  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`, { headers: this.getAuthHeaders() });
  }

  // Obtener foto de perfil
  getProfilePicture(): Observable<Blob> {
     return this.http.get(`${this.apiUrl}/me/image`, { 
       headers: new HttpHeaders(this.getAuthHeaders()), 
       responseType: 'blob' 
     });
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
  
  // Obtener preferencias
  getPreferences(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me/settings/preferences`, { headers: this.getAuthHeaders() });
  }

  // Actualizar preferencias
  updatePreferences(prefs: { privateSession?: boolean; showFriendActivity?: boolean }): Observable<any> {
    return this.http.put(`${this.apiUrl}/me/settings/preferences`, prefs, { headers: this.getAuthHeaders() });
  }
  // ----- Gestión de amigos -----

  // Buscar usuarios
  searchUsers(searchTerm: string): Observable<any> {
    const params = new HttpParams().set('query', searchTerm);
    return this.http.get<any>(`${this.apiUrl}/search/user`, { params, headers: this.getAuthHeaders()  });
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
