/**
 * @file music.service.ts
 * @brief Servicio encargado de la lógica de negocio musical y comunicación con la API.
 * @description Centraliza todas las peticiones relacionadas con playlists, canciones (MongoDB), 
 * integración con YouTube, favoritos, historial y sistema de recomendaciones entre amigos.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * @class MusicService
 * @description Proporciona una interfaz para interactuar con los endpoints de música y usuario,
 * gestionando automáticamente las cabeceras de autenticación.
 */
@Injectable({ providedIn: 'root' })
export class MusicService {
  /** @private @property {string} apiUrl - URL base del backend. */
  private apiUrl = 'http://localhost:3000/api';


  /**
   * @constructor
   * @param {HttpClient} http - Cliente para realizar peticiones asíncronas al servidor.
   */
  constructor(private http: HttpClient) {}

  /**
   * @private @method getAuthOptions
   * @description Helper centralizado para la gestión del Token JWT.
   * @returns {Object} Un objeto con las HttpHeaders necesarias (Bearer Token) o un objeto vacío.
   * @details Recupera el token de `sessionStorage` para asegurar que las peticiones estén autorizadas.
   */
  private getAuthOptions() {
    const token = sessionStorage.getItem('token');
    if (!token) return {}; 
    return { 
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) 
    };
  }

  /**
   * @method getPlaylists
   * @description Obtiene todas las listas de reproducción accesibles por el usuario actual.
   * @returns {Observable<any[]>}
   */
  getPlaylists(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/playlists`, this.getAuthOptions());
  }

  /**
    * @method getPlaylistById
    * @description Obtiene los detalles de una lista de reproducción específica por su ID.
    * @param {string} id - ID de la playlist a recuperar.
    * @returns {Observable<any>}
   */
  getPlaylistById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/playlists/${id}`, this.getAuthOptions());
  }
  /**
   * @method createPlaylist
   * @description Crea una nueva lista de reproducción en el servidor.
   * @param {Object} body - Datos de la playlist (nombre, descripción, visibilidad).
   * @returns {Observable<any>}
   */
  createPlaylist(body: { name_: string; description_?: string; isPublic_?: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/playlists`, body, this.getAuthOptions());
  }

  /**
   * @method deletePlaylist
   * @description Elimina una lista de reproducción por su ID.
   * @param {string} id - ID de la playlist a eliminar.
   * @returns {Observable<any>}
   */
  deletePlaylist(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/playlists/${id}`, this.getAuthOptions());
  }

  /**
   * @method addSongToPlaylist
   * @description Vincula una canción específica a una playlist.
   * @param {string} playlistId - ID de la lista destino.
   * @param {any} songData - Datos de la canción a añadir.
   */
  addSongToPlaylist(playlistId: string, songData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/playlists/${playlistId}/songs`, songData, this.getAuthOptions());
  }

  /**
   * @method deleteSongFromPlaylist
   * @description Elimina una canción específica de una playlist.
   * @param {string} playlistId - ID de la lista de reproducción.
   * @param {string} songId - ID de la canción a eliminar.
   * @returns {Observable<any>}
   */
  deleteSongFromPlaylist(playlistId: string, songId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/playlists/${playlistId}/songs/${songId}`, this.getAuthOptions());
  }
  /**
   * @method sharePlaylist
   * @description Comparte una playlist propia con otro usuario mediante email o username.
   * @param {string} playlistId - ID de la playlist a compartir.
   * @param {string} target - Identificador del usuario destino.
   */
  sharePlaylist(playlistId: string, target: string) {
    return this.http.post(`${this.apiUrl}/playlists/${playlistId}/share`, { target }, this.getAuthOptions());
  }

/**
   * @method unsharePlaylist
   * @description Deja de compartir una playlist propia con otro usuario.
   * @param {string} playlistId - ID de la playlist.
   * @param {string} target - Email o Username del usuario a eliminar.
   */
  unsharePlaylist(playlistId: string, target: string) {
    // Usamos 'request' para asegurar que el body se envía correctamente en un DELETE
    return this.http.request('delete', `${this.apiUrl}/playlists/${playlistId}/share`, {
      body: { target }, // El backend espera { target: ... }
      ...this.getAuthOptions() // Esparce los headers aquí
    });
  }
  // CANCIONES 
  getSongs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/songs`, this.getAuthOptions());
  }

  getSongById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/songs/${id}`, this.getAuthOptions());
  }

  addSong(song: any) {
    return this.http.post(`${this.apiUrl}/songs`, song, this.getAuthOptions());
  }

  /**
   * @method searchYouTube
   * @description Realiza una búsqueda de videos en YouTube a través del proxy del backend.
   * @param {string} query - Término de búsqueda.
   * @note Este endpoint es público y no requiere cabeceras de autenticación.
   */
  searchYouTube(query: string) {
    return this.http.get<any[]>(`${this.apiUrl}/youtube/search?q=${encodeURIComponent(query)}`);
  }

  getSongsFromArtist(artist: string) {
    return this.http.get<any[]>(`${this.apiUrl}/youtube/artist?q=${encodeURIComponent(artist)}`);
  }

  getLikedSongs() {
    return this.http.get(`${this.apiUrl}/users/me/likes`, this.getAuthOptions());
  }
  /**
   * @method addLikedSong
   * @description Añade una canción a la lista de favoritos (Me Gusta) del usuario.
   * @param {any} song - Objeto de la canción.
   */
  addLikedSong(song: any) {
    return this.http.post(`${this.apiUrl}/users/me/likes`, song, this.getAuthOptions());
  }

  removeLikedSong(songId: string) {
    return this.http.delete(`${this.apiUrl}/users/me/likes/${songId}`, this.getAuthOptions());
  }

  addToHistoryWithToken(tokenIgnored: any, songId: string) {
    return this.http.post(`${this.apiUrl}/users/me/history`, { songId }, this.getAuthOptions());
  }

  /**
   * @method addSongToHistory
   * @description Registra una reproducción en el historial del usuario.
   * @param {any} song - Puede ser un objeto de canción de Mongo (con _id) o un objeto de YouTube.
   * @details Si la canción es nueva (de YouTube), envía el objeto completo para que el backend la procese.
   */
  addSongToHistory(song: any) {
    const body = song?._id
      ? { songId: song._id }
      : {
          youtubeURL_: song.youtubeURL_,
          title_: song.title_ || song.title,
          artist_: song.artist_ || song.artist,
          thumbnailURL_: song.thumbnailURL_,
          durationInSeconds_: song.durationInSeconds_ ?? 0,
        };

    return this.http.post(`${this.apiUrl}/users/me/history`, body, this.getAuthOptions());
  }

  getRecommendationsWithToken(tokenIgnored: any) {
    return this.http.get<any>(`${this.apiUrl}/recommendations`, this.getAuthOptions());
  }

  /**
   * @method recommendSongToFriend
   * @description Envía una recomendación musical directa a un amigo.
   * @param {string} friendId - ID del destinatario.
   * @param {any} song - Objeto con los datos de la canción.
   * @param {string} [message] - Mensaje personal opcional.
   */
  recommendSongToFriend(friendId: string, song: any, message?: string): Observable<any> {
    const payload = {
      friendId: friendId,
      message: message,
      songData: {
        title: song.title_ || song.title,
        artist: song.artist_ || song.artist,
        youtubeUrl: song.youtubeURL_ || `https://www.youtube.com/watch?v=${song.id?.videoId || song.id}`, 
        thumbnail: song.thumbnailURL_ || song.thumbnail
      }
    };
    return this.http.post(`${this.apiUrl}/users/friends/recommend`, payload, this.getAuthOptions());
  }

  /**
   * @method getMyRecommendations
   * @description Obtiene las recomendaciones musicales recibidas por el usuario.
   * @returns {Observable<any[]>}
   */
  getMyRecommendations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/me/recommendations`, this.getAuthOptions());
  }

  /**
   * @method deleteRecommendation
   * @description Elimina una recomendación musical recibida por el usuario.
   * @param {string} recId - ID de la recomendación a eliminar.
   * @returns {Observable<any>}
   */
  deleteRecommendation(recId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/me/recommendations/${recId}`, this.getAuthOptions());
  }

  // Método para actualizar datos normales (JSON)
  updatePlaylist(id: string, updates: any) {
    return this.http.put(`${this.apiUrl}/playlists/${id}`, updates, this.getAuthOptions());
  }

  // Métodos específicos para portadas (archivos)
  updatePlaylistCover(playlistId: string, file: File) {
    const formData = new FormData();
    formData.append('cover', file); 
    return this.http.put(`${this.apiUrl}/playlists/${playlistId}/cover`, formData, this.getAuthOptions());
  }

  deletePlaylistCover(id: string) {
    return this.http.delete(`${this.apiUrl}/playlists/${id}/cover`, this.getAuthOptions());
  }
}