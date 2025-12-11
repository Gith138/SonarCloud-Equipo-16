import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MusicService } from '../../../services/music.service';
import { UserService } from '../../../services/user.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-playlist-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './playlist-detail.component.html',
  styleUrl: './playlist-detail.component.css'
})

export class PlaylistDetailComponent {
  playlist: any;
  currentSongUrl: SafeResourceUrl | null = null;
  currentSongTitle: string | null = null;
  showForm = false;
  shareTarget: string = '';
  isSharing = false;
  audio = new Audio(); 
  songSortOrder: 'asc' | 'desc' = 'asc';
  searchQuery: string = '';
  searchResults: any[] = [];
  isSearching = false;

  filteredUsersForShare: any[] = []; // Lista de resultados de búsqueda
  constructor(private route: ActivatedRoute, private musicService: MusicService, private sanitizer: DomSanitizer, private userService: UserService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.musicService.getPlaylistById(id).subscribe({
      next: (data) => {
        console.log('Playlist cargada:', data);
        this.playlist = data;
      },
      error: (err) => console.error('Error al cargar playlist:', err)
    });
  }

  
  playSong(youtubeUrl: string, title: string = 'Desconocido', songObj?: any) {
    const videoId = this.extractVideoId(youtubeUrl);
    
    if (!videoId) {
      console.error("No se pudo extraer ID:", youtubeUrl);
      return;
    }
    
    // ✅ CORRECCIÓN: Cadena bien cerrada
    const youtubeLink = `https://www.youtube.com/watch?v=${videoId}`; 

    window.open(youtubeLink, '_blank'); 
    console.log(`🎵 Abriendo:`, youtubeLink);

    // ✅ CORRECCIÓN: Asegurar thumbnailURL_ para evitar el error del backend
    const songData = songObj || {
      title_: title,
      youtubeURL_: youtubeLink,
      // Si venía de búsqueda, intentamos sacar la miniatura, si no, placeholder
      thumbnailURL_: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      artist_: "Desconocido" // Valor por defecto
    };

    this.musicService.addSongToHistory(songData).subscribe({
      next: () => console.log(`Historial actualizado`),
      error: (err) => console.error('Error historial', err),
    });
  }

  onAudioError() {
    console.error('Error al cargar el audio');
    this.currentSongUrl = null;
  }

  extractVideoId(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('v') || ''; 
    } catch {
      return url;
    }
  }

  searchSongsForPlaylist() {
    const query = this.searchQuery.trim();
    if (!query) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;

    this.musicService.searchYouTube(query).subscribe({
      next: (res: any) => {
        this.searchResults = res || [];
        this.isSearching = false;
      },
      error: (err) => {
        console.error('Error al buscar en YouTube:', err);
        this.searchResults = [];
        this.isSearching = false;
      },
    });
  }

  addSearchResultToPlaylist(video: any) {
    if (!this.playlist?._id) return;

    const payload = {
      song_title: video.title_,
      youtube_url: video.youtubeURL_,
      genre: video.genre_ || 'Desconocido',
    };

    this.musicService.addSongToPlaylist(this.playlist._id, payload).subscribe({
      next: (res: any) => {
        // Añadimos la canción devuelta a la lista de la playlist
        if (res?.song) {
          this.playlist.songs_.push(res.song);
        }
        alert(`"${video.title_}" añadida a la playlist`);
      },
      error: (err) => {
        console.error('Error al añadir canción desde búsqueda:', err);
        alert('No se pudo añadir la canción.');
      },
    });
  }

  deleteSong(songId: string, title: string) {
    if (!confirm(`¿Eliminar la canción "${title}" de la playlist?`)) return;

    this.musicService.deleteSongFromPlaylist(this.playlist._id, songId).subscribe({
      next: (res) => {
        this.playlist.songs_ = this.playlist.songs_.filter((s: any) => s._id !== songId);
      },
      error: (err) => {
        console.error("Error al eliminar canción:", err);
      },
    });
  }

  // FUNCIÓN PARA BUSCAR USUARIOS (Conectada al input)
  searchUsersToShare() {
    // Si el campo está vacío, limpiamos la lista
    if (!this.shareTarget.trim()) {
      this.filteredUsersForShare = [];
      return;
    }

    this.userService.searchUsers(this.shareTarget).subscribe({
      next: (res: any) => {
        // Guardamos los usuarios encontrados
        this.filteredUsersForShare = res.users || []; 
      },
      error: (err) => console.error(err)
    });
  }

  //  FUNCIÓN CUANDO SELECCIONAS UN USUARIO DE LA LISTA
  selectUserForShare(user: any) {
    // Rellenamos el input con el email (o username)
    this.shareTarget = user.email_; 
    
    // Limpiamos la lista de sugerencias para que desaparezca
    this.filteredUsersForShare = [];
  }

  // Helper para la imagen (si no lo tienes ya en este componente)
  getUserAvatar(url: string) {
    return url || 'assets/default-avatar.png'; // Pon tu ruta por defecto
  }


  sharePlaylist() {
    const target = this.shareTarget.trim();

    if (!target) {
      alert('Introduce un correo o nombre de usuario');
      return;
    }

    this.musicService.sharePlaylist(this.playlist._id, target).subscribe({
      next: (res) => {
        alert(`Playlist compartida con ${target}`);
        this.shareTarget = '';
        this.isSharing = false;
      },
      error: (err) => {
        console.error('Error al compartir:', err);
      },
    });
  }

  get sortedSongs(): any[] {
    const songs = this.playlist?.songs_ || [];
    const dir = this.songSortOrder === 'asc' ? 1 : -1;

    return [...songs].sort((a: any, b: any) => {
      const titleA = (a.title_ || '').toLowerCase();
      const titleB = (b.title_ || '').toLowerCase();

      if (titleA < titleB) return -1 * dir;
      if (titleA > titleB) return 1 * dir;
      return 0;
    });
  }
}
