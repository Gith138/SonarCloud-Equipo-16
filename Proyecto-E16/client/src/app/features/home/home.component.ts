import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MusicService } from '../../services/music.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  searchQuery = '';
  results: any[] = [];
  recommendedSongs: any[] = [];
  recommendedPlaylists: any[] = [];
  externalPlaylist: any = null;
  token: string | null = sessionStorage.getItem('token');
  openedPlaylist: any | null = null;
  showSearchModal = false; 
  userPlaylists: any[] = [];
  selectedPlaylist: any = null;
  showAddToPlaylistModal = false;
  songToAdd: any = null;

  private likedSongsList: any[] = [];
  private likedKeys = new Set<string>();

  constructor(private musicService: MusicService) {}

  ngOnInit(): void {
    this.loadLikedSongs();
    this.loadRecommendations();
    this.loadUserPlaylists();
  }

  loadUserPlaylists(): void {
    if (!this.token) return;

    this.musicService.getPlaylists().subscribe({
      next: (playlists) => {
        this.userPlaylists = playlists || [];
        if (this.userPlaylists.length > 0 && !this.selectedPlaylist) {
          this.selectedPlaylist = this.userPlaylists[0];
        }
      },
      error: (err) => console.error('Error al obtener playlists del usuario:', err),
    });
  }

  private buildSongKey(song: any): string {
    return (song.youtubeURL_ || song.youtubeURL || song._id || song.id || song.title_ || song.title ||  '').toString();
  }

  isLiked(song: any): boolean {
    const key = this.buildSongKey(song);
    return this.likedKeys.has(key);
  }

  toggleLike(song: any): void {
    if (this.isLiked(song)) this.unlikeSong(song);
    else this.likeSong(song);
  }

  loadRecommendations(): void {
    if (!this.token) {
      console.warn('No hay token, no se pueden cargar recomendaciones');
      return;
    }

    this.musicService.getRecommendationsWithToken(this.token).subscribe({
      next: (res) => {
        console.log('Recomendaciones cargadas:', res);
        this.recommendedSongs = res.recommendations || [];
        this.recommendedPlaylists = res.playlists || [];
        this.externalPlaylist = res.externalPlaylist || null;
      },
      error: (err) => {
        console.error('Error al cargar recomendaciones:', err);
      },
    });
  }

  searchYouTube() {
    const query = this.searchQuery.trim();
    if (!query) {
      this.results = [];
      this.showSearchModal = false;
      return;
    }

    console.log("Buscando en YouTube:", this.searchQuery);

    this.musicService.searchYouTube(this.searchQuery).subscribe({
      next: (data) => {
        console.log("Resultados obtenidos:", data);
        this.results = data || [];
        this.showSearchModal = this.results.length > 0;
      },
      error: (err) => {
        console.error('Error al buscar en YouTube:', err);
        this.results = [];
        this.showSearchModal = false;
      },
    });
  }

  closeSearchModal() {
    this.showSearchModal = false;
  }

  addSongToDatabase(song: any) {
    this.musicService.addSong(song).subscribe({
      next: () => alert(`"${song.title_}" añadida a la base de datos`),
      error: (err) => console.error('Error al guardar canción', err),
    });
  }

  addSongToPlaylist(song: any): void {
    this.songToAdd = song;
    
    const abrirModal = () => {
      if (!this.userPlaylists.length) {
        alert('No tienes playlists aún. Crea una primero en la sección "Playlists".');
        return;
      }
      if (!this.selectedPlaylist) this.selectedPlaylist = this.userPlaylists[0];
      this.showAddToPlaylistModal = true;
    };

    if (this.userPlaylists.length === 0) {
      this.musicService.getPlaylists().subscribe({
        next: (playlists) => {
          this.userPlaylists = playlists || [];
          abrirModal();
        },
        error: (err) => {
          console.error('Error al obtener playlists del usuario:', err);
        }
      });
    } else abrirModal();
  }

  confirmAddToPlaylist(): void {
    if (!this.selectedPlaylist || !this.songToAdd) return;

    const song = this.songToAdd;
    const playlistId = this.selectedPlaylist._id;
    const playlistName = this.selectedPlaylist.name_ || this.selectedPlaylist.name || 'tu playlist';

    const songData = {
      song_title: song.title_,
      youtube_url: song.youtubeURL_,
      genre: song.genre_ || "Desconocido",
    };

    this.musicService.addSongToPlaylist(playlistId, songData).subscribe({
      next: () => {
        alert(`"${song.title_}" añadida a "${playlistName}"`);
        this.showAddToPlaylistModal = false;
        this.songToAdd = null;
        this.selectedPlaylist = null;
      },
      error: (err) => console.error("Error al añadir canción:", err),
    });
  }

  openAddToPlaylist(song: any): void {
    this.addSongToPlaylist(song);
  }

  openVideo(song: any): void {
    if (!song?.youtubeURL_) return;

    window.open(song.youtubeURL_, '_blank');

    // Guarda en historial (funciona con canciones locales o de YouTube)
    if (this.token) {
      this.musicService.addSongToHistory(song).subscribe({
        next: () => console.log(`Historial actualizado con: ${song.title_ || song.title}`),
        error: (err) => console.error('Error al guardar historial:', err),
      });
    }
  }

  loadLikedSongs(): void {
    this.musicService.getLikedSongs().subscribe({
      next: (res: any) => {
        const likedArray = Array.isArray(res) ? res : res.likedSongs || res.likedSongs_ || [];
        this.likedSongsList = likedArray ?? [];

        this.likedKeys = new Set(
          this.likedSongsList.map((s: any) => this.buildSongKey(s))
        );
      },
      error: (err) => console.error('Error al cargar likes:', err)
    });
  }

  private findLikedSongIdByKey(key: string): string | null {
    const found = this.likedSongsList.find((s: any) => this.buildSongKey(s) === key);
    return found ? found._id : null;
  }

  likeSong(song: any): void {
    if (!this.token) {
      alert('Debes iniciar sesión para usar favoritos');
      return;
    }

    const key = this.buildSongKey(song);

    this.musicService.addLikedSong(song).subscribe({
      next: () => {
        alert(`❤️ "${song.title_}" añadida a tus favoritos`);
        this.likedKeys.add(key);
        this.loadLikedSongs();
      },
      error: (err) => {
        console.error('Error al dar me gusta:', err);
        if (err.status === 400) this.likedKeys.add(key);
      }
    });
  }

  unlikeSong(song: any): void {
    if (!this.token) {
      alert('Debes iniciar sesión para usar favoritos');
      return;
    }

    const key = this.buildSongKey(song);
    const songId = song._id || this.findLikedSongIdByKey(key);

    if (!songId) {
      alert('No se puede quitar de favoritos porque esta canción no está en tu lista de favoritos.');
      return;
    }

    this.musicService.removeLikedSong(songId).subscribe({
      next: () => {
        alert(`💔 "${song.title_}" eliminada de tus favoritos`);
        this.likedKeys.delete(key);
        this.likedSongsList = this.likedSongsList.filter(s => s._id !== songId);
      },
      error: (err) => {
        console.error('Error al quitar me gusta:', err);
      }
    });
  }

  openPlaylist(pl: any) {
    this.showSearchModal = false;
    this.openedPlaylist = pl;
  }

  openExternalPlaylist() {
    this.showSearchModal = false;
    const artist = this.externalPlaylist.name.replace("Playlist de ", "").replace(" en YouTube", "");

    this.musicService.getSongsFromArtist(artist).subscribe((ytSongs) => {
      this.openedPlaylist = {
        name_: `Playlist de ${artist} en YouTube`,
        description_: `${ytSongs.length} canciones recomendadas`,
        cover_: this.externalPlaylist.cover,
        songs: ytSongs
      };
    });
  }

  closePlaylist() {
    this.openedPlaylist = null;
  }

  closeAddToPlaylistModal(): void {
    this.showAddToPlaylistModal = false;
    this.songToAdd = null;
    this.selectedPlaylist = null;
  }
}