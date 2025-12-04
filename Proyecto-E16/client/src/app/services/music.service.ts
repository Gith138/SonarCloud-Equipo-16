import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MusicService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ==========================================
  // HELPER PRIVADO: El único sitio donde gestionamos el token
  // ==========================================
  private getAuthOptions() {
    // 1. Usamos sessionStorage (como acordamos para que se cierre al salir)
    const token = sessionStorage.getItem('token');
    
    // 2. Si no hay token, devolvemos objeto vacío (para evitar errores, aunque el backend rechazará)
    if (!token) return {}; 

    // 3. Devolvemos la estructura exacta que pide Angular: { headers: ... }
    return { 
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) 
    };
  }

  // ==========================================
  // PLAYLISTS
  // ==========================================

  getPlaylists(): Observable<any[]> {
    // CORREGIDO: Usamos el helper directamente
    return this.http.get<any[]>(`${this.apiUrl}/playlists`, this.getAuthOptions());
  }

  getPlaylistById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/playlists/${id}`, this.getAuthOptions());
  }

  createPlaylist(body: { name_: string; description_?: string; isPublic_?: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/playlists`, body, this.getAuthOptions());
  }

  deletePlaylist(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/playlists/${id}`, this.getAuthOptions());
  }

  addSongToPlaylist(playlistId: string, songData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/playlists/${playlistId}/songs`, songData, this.getAuthOptions());
  }

  deleteSongFromPlaylist(playlistId: string, songId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/playlists/${playlistId}/songs/${songId}`, this.getAuthOptions());
  }

  sharePlaylist(playlistId: string, target: string) {
    return this.http.post(`${this.apiUrl}/playlists/${playlistId}/share`, { target }, this.getAuthOptions());
  }

  // ==========================================
  // CANCIONES (Mongo)
  // ==========================================

  getSongs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/songs`, this.getAuthOptions());
  }

  addSong(song: any) {
    return this.http.post(`${this.apiUrl}/songs`, song, this.getAuthOptions());
  }

  // ==========================================
  // YOUTUBE (Público)
  // ==========================================

  searchYouTube(query: string) {
    return this.http.get<any[]>(`${this.apiUrl}/youtube/search?q=${encodeURIComponent(query)}`);
  }

  getSongsFromArtist(artist: string) {
    return this.http.get<any[]>(`${this.apiUrl}/youtube/artist?q=${encodeURIComponent(artist)}`);
  }

  // ==========================================
  // LIKES / HISTORIAL / RECOMENDACIONES
  // ==========================================
  
  // NOTA: He eliminado el argumento 'token' de estas funciones porque ya no es necesario
  // pasarlo manualmente desde el componente. El helper lo coge de sessionStorage.

  getLikedSongs() {
    return this.http.get(`${this.apiUrl}/users/me/likes`, this.getAuthOptions());
  }
  
  addLikedSong(song: any) {
    return this.http.post(`${this.apiUrl}/users/me/likes`, song, this.getAuthOptions());
  }

  removeLikedSong(songId: string) {
    return this.http.delete(`${this.apiUrl}/users/me/likes/${songId}`, this.getAuthOptions());
  }

  addToHistoryWithToken(tokenIgnored: any, songId: string) {
    return this.http.post(`${this.apiUrl}/users/me/history`, { songId }, this.getAuthOptions());
  }

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
}