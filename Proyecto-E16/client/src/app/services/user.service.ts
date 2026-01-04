/**
 * @file user.service.ts
 * @brief Servicio para la gestión integral de datos de usuario y redes sociales.
 * @description Maneja el perfil del usuario, configuración de privacidad, historial, 
 * sistema de amigos y una caché optimizada para imágenes de perfil (avatares).
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs'; // Importamos 'of'
import { tap, map } from 'rxjs/operators'; 
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'; // 🔥 NECESARIO PARA IMÁGENES

/**
 * @class UserService
 * @description Proporciona la lógica de comunicación para el CRUD de usuarios y la gestión
 * de la red social de amigos, optimizando la carga de recursos mediante caché en RAM.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  /** @private @property {string} apiUrl - URL base para los endpoints de usuarios. */
  private apiUrl = 'http://localhost:3000/api/users';
  /** @private @property {Map<string, SafeUrl>} avatarCache - Diccionario en memoria para almacenar avatares ya descargados. */
  private avatarCache = new Map<string, SafeUrl>();

  /**
   * @constructor
   * @param {HttpClient} http - Cliente para peticiones HTTP.
   * @param {DomSanitizer} sanitizer - Para transformar Blobs de imagen en URLs seguras para Angular.
   */
  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  /**
   * @private @method getAuthHeaders
   * @description Recupera el token de sesión y prepara el encabezado de autorización.
   * @returns {Object} Diccionario con la cabecera Authorization.
   */
  private getAuthHeaders() {
    const token = sessionStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }
  // ----- Gestión de usuarios -----
  /**
   * @method getUserById
   * @description Recupera los datos de un usuario por su ID.
   * @param id - ID de un usuario 
   */
  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  /**
   * @method getAvatar
   * @description Obtiene la foto de perfil de un usuario de forma optimizada.
   * @param {string} userId - ID del usuario del que se requiere el avatar.
   * @returns {Observable<SafeUrl | string>} URL segura de la imagen.
   * @details 
   * Lógica de caché:
   * 1. Si el `userId` existe en `avatarCache`, devuelve el valor inmediatamente usando `of()`.
   * 2. Si no, solicita la imagen como `blob` al backend.
   * 3. Tras recibirla, crea una URL de objeto, la sanitiza y la guarda en la caché antes de emitirla.
   */
  getAvatar(userId: string): Observable<SafeUrl | string> {
    if (this.avatarCache.has(userId)) {
      return of(this.avatarCache.get(userId)!);
    }
    return this.http.get(`${this.apiUrl}/${userId}/image`, {
      headers: new HttpHeaders(this.getAuthHeaders()),
      responseType: 'blob' 
    }).pipe(
      map(blob => {
        const objectURL = URL.createObjectURL(blob);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
        this.avatarCache.set(userId, safeUrl);
        return safeUrl;
      })
    );
  }
  /**
   * @method getAvatarCacheSize
   * @description Devuelve la cantidad de imágenes actualmente almacenadas en la RAM.
   */
  getAvatarCacheSize(): number {
    return this.avatarCache.size;
  }
  /**
   * @method clearAvatarCache
   * @description Vacía la caché de imágenes en memoria.
   */
  clearAvatarCache(): void {
    this.avatarCache.clear();
    console.log('Caché de avatares en memoria eliminada.');
  }

  // ----- Gestión de usuario -----
  /**
   * @method getCurrentUser
   * @description Recoge todo los atributos de usuario
   */
  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`, { headers: this.getAuthHeaders() });
  }
 
  /**
   * @method getProfilePicture
   * @description Recupera la imagen de perfil del usuario actual como Blob.
   */
  getProfilePicture(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/me/image`, { 
     headers: new HttpHeaders(this.getAuthHeaders()), 
     responseType: 'blob' 
    });
  }

  /**
   * @method updateSettings
   * @description Actualiza el perfil del usuario (nombre, email, imagen) mediante FormData.
   * @param {FormData} data - Objeto con los campos de texto y archivos binarios.
   */
  updateSettings(data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/me/settings`, data, { headers: this.getAuthHeaders() });
  }

  /**
   * @method getPreferences
   * @description Recupera las preferencias de privacidad del usuario.
   */
  getPreferences(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me/settings/preferences`, { headers: this.getAuthHeaders() });
  }
  /** 
   * @method updatePreferences
   * @description Actualiza las preferencias de privacidad del usuario.
   * @param {Object} prefs - Objeto con las preferencias a actualizar.
  */
  updatePreferences(prefs: { privateSession?: boolean; showFriendActivity?: boolean }): Observable<any> {
    return this.http.put(`${this.apiUrl}/me/settings/preferences`, prefs, { headers: this.getAuthHeaders() });
  }
  /**
   * @method deleteUser
   * @description Elimina al usuario si estas dentro.
   */
  deleteUser(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/me`, { headers: this.getAuthHeaders() });
  }

  // HISTORIAL DE REPRODUCCIÓN
  /**
   * @method gethistory
   * @description Recupera la lista cronológica de canciones escuchadas por el usuario.
   */
  gethistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me/history`, { headers: this.getAuthHeaders() });
  }
  /**
   * @method addToHistory
   * @description Añade una canción al historial de reproducción del usuario.
   * @param {string} songId - Identificador de la canción a añadir.
   */
  addToHistory(songId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/me/history`, { songId }, { headers: this.getAuthHeaders() });
  }

  /**
   * @method getcleanhistory
   * @description Elimina todas las entradas del historial de reproducción del usuario.
   */
  getcleanhistory(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/me/history/clear`, { headers: this.getAuthHeaders() });
  }

  // GESTIÓN DE AMIGOS Y SOCIAL
  /**
   * @method searchUsers
   * @description Busca usuarios en la plataforma mediante un término de búsqueda.
   * @param {string} searchTerm - Nombre o correo a buscar.
   */
  searchUsers(searchTerm: string): Observable<any> {
    const params = new HttpParams().set('query', searchTerm);
    return this.http.get<any>(`${this.apiUrl}/search/user`, { params, headers: this.getAuthHeaders()  });
  }

  /**
   * @method searchUsersFriends
   * @description Busca usuarios entre los amigos del usuario mediante un término de búsqueda.
   * @param {string} searchTerm - Nombre o correo a buscar.
   */
  searchUsersFriends(searchTerm: string): Observable<any> {
    const params = new HttpParams().set('query', searchTerm);
    return this.http.get<any>(`${this.apiUrl}/search/user/friends`, { params, headers: this.getAuthHeaders()  });
  }
  /**
   * @method getFriendsList
   * @description Recupera la lista de amigos del usuario.
   */
  getFriendsList(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/friends/list`, { headers: this.getAuthHeaders() }); // backend getFriendsList
  }
  /**
   * @method addFriend
   * @description Envía una solicitud de amistad a otro usuario.
   * @param {string} friendID - Identificador del usuario a agregar.
   */
  addFriend(friendID: string): Observable<any> {
    console.log('Añadir amigo con ID:', friendID);
    return this.http.put<any>(`${this.apiUrl}/friends/add`, { friendId: friendID }, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * @method getFriendRequests
   * @description Obtiene las solicitudes de amistad pendientes del usuario.
   */
  getFriendRequests(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/friends/requests`, { headers: this.getAuthHeaders() });
  }
  
  /**
   * @method acceptFriendRequest
   * @description Acepta una solicitud de amistad recibida.
   * @param requesterId - ID del usaurio que envió la solicitud de amistad.
   */
  acceptFriendRequest(requesterId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/friends/requests/accept`, { requesterId }, { headers: this.getAuthHeaders() });
  }

  /**
   * @method rejectFriendRequest
   * @description Rechaza una solicitud de amistad recibida.
   * @param requesterId - ID del usaurio que rechazoó la solicitud de amistad.
   */
  rejectFriendRequest(requesterId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/friends/requests/reject`, { requesterId }, { headers: this.getAuthHeaders() });
  }
  
  /**
   * @method removeFriend
   * @description Elimina a un amigo de la lista del usuario.
   * @param friendId  - ID del amigo a eliminar.
   */
  removeFriend(friendId: string) {
    return this.http.request('delete', `${this.apiUrl}/friends/remove`, { body: { friendId }, headers: this.getAuthHeaders() });
  }
  /**
   * @method getFriendsActivity
   * @description Obtiene el feed de actividad (últimas canciones escuchadas) de los amigos del usuario.
   */
  getFriendsActivity(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/friends/activity`, { headers: this.getAuthHeaders() });
  }
}
