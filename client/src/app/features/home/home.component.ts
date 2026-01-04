/**
 * @file home.component.ts
 * @brief Componente principal de la página de inicio.
 * @description Centraliza las funcionalidades de búsqueda en YouTube, gestión de favoritos,
 * visualización de recomendaciones y el envío de canciones a amigos.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MusicService } from '../../services/music.service';

import { SafeUrl } from '@angular/platform-browser';

import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';

/**
 * @interface FriendInHome
 * @description Representación simplificada de un amigo para el listado del Home.
 */
interface FriendInHome {
  _id: string;
  username_: string;
  email_: string;
  displayAvatar?: SafeUrl | string; // Propiedad para la imagen visual
}

/**
 * @class HomeComponent
 * @description Gestiona la experiencia de usuario principal, incluyendo reproductores, modales de recomendación y playlists.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})

export class HomeComponent {
// --- Propiedades de Búsqueda ---
  searchQuery = '';
  results: any[] = [];
  showSearchModal = false;

  // --- Propiedades de Contenido Musical ---
  recommendedSongs: any[] = [];
  recommendedPlaylists: any[] = [];
  externalPlaylist: any = null;
  openedPlaylist: any | null = null;

  // --- Gestión de Playlists Propias ---
  userPlaylists: any[] = [];
  selectedPlaylist: any = null;
  showAddToPlaylistModal = false;
  songToAdd: any = null;

  // --- Lógica de Recomendación a Amigos ---
  showRecommendModal = false;
  songToRecommend: any = null;
  myFriends: FriendInHome[] = [];
  selectedFriendId: string = '';
  recommendMessage: string = '';

  // --- Estado de Autenticación y Favoritos ---
  token: string | null = sessionStorage.getItem('token');
  private likedSongsList: any[] = [];
  private likedKeys = new Set<string>();

  /**
   * @constructor
   * @param {MusicService} musicService - Servicio para datos musicales y YouTube.
   * @param {UserService} userService - Servicio para datos de usuario y amigos.
   * @param {ToastService} toast - Servicio para mensajes emergentes de feedback.
   */
  constructor(
    private musicService: MusicService, 
    private userService: UserService, 
    private toast: ToastService
  ) {}

  /**
   * @method ngOnInit
   * @description Carga inicial de datos: favoritos, recomendaciones, playlists y lista de amigos.
   */
  ngOnInit(): void {
    this.loadLikedSongs();
    this.loadRecommendations();
    this.loadUserPlaylists();
    this.loadFriends();
  }

  // GESTIÓN DE AMIGOS Y AVATARES
  /**
   * @method loadFriends
   * @description Recupera la lista de amigos y dispara la carga individual de sus avatares.
   */
   loadFriends() {
    this.userService.getFriendsList().subscribe({
      next: (res: any[]) => {
        this.myFriends = res || [];
        
        // Iteramos sobre cada amigo para cargar su foto usando la caché
        this.myFriends.forEach(friend => {
          this.loadFriendAvatar(friend);
        });
      },
      error: (err) => console.error('Error cargando amigos', err)
    });
  }
  /**
   * @private @method loadFriendAvatar
   * @description Asigna un placeholder y luego intenta recuperar el avatar real desde el UserService.
   * @param {FriendInHome} friend - El objeto amigo al que se le actualizará la propiedad displayAvatar.
   */
  private loadFriendAvatar(friend: FriendInHome) {
    // 1. Ponemos placeholder inicial
    friend.displayAvatar = 'assets/perfil.png'; 

    // 2. Pedimos la foto al servicio (si ya está en RAM, es instantáneo)
    this.userService.getAvatar(friend._id).subscribe({
      next: (safeUrl) => {
        friend.displayAvatar = safeUrl;
      },
      error: () => { /* Se queda con el placeholder */ }
    });
  }

  // PLAYLISTS Y RECOMENDACIONES
  /**
   * @method loadUserPlaylists
   * @description Carga las playlists del usuario y selecciona la primera si no hay ninguna seleccionada.
   */
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

  // LÓGICA DE FAVORITOS (LIKES)
  /**
   * @private @method buildSongKey
   * @description Genera un identificador único para una canción (URL o ID) para normalizar comparaciones.
   * @param {any} song - El objeto canción.
   * @returns {string} Clave única de la canción.
   */
  private buildSongKey(song: any): string {
    return (song.youtubeURL_ || song.youtubeURL || song._id || song.id || song.title_ || song.title ||  '').toString();
  }

  /**
   * @method isLiked
   * @description Comprueba si una canción específica está en la lista de favoritos del usuario.
   * @param {any} song - Canción a verificar.
   * @returns {boolean}
   */
  isLiked(song: any): boolean {
    const key = this.buildSongKey(song);
    return this.likedKeys.has(key);
  }

  /**
   * @method toggleLike
   * @description Añade o elimina una canción de favoritos según su estado actual.
   * @param {any} song - Canción sobre la que se actúa.
   */
  toggleLike(song: any): void {
    if (this.isLiked(song)) this.unlikeSong(song);
    else this.likeSong(song);
  }
  // CARGA DE RECOMENDACIONES
  /**
   * @method loadRecommendations
   * @description Recupera las recomendaciones de canciones y playlists basadas en el historial del usuario.
   */
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

  // BÚSQUEDA Y REPRODUCCIÓN
  /**
   * @method searchYouTube
   * @description Realiza una búsqueda de canciones en YouTube a través del MusicService.
   */
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

  /**
   * @method addSongToPlaylist
   * @description Prepara la canción para ser añadida a una playlist y abre el modal correspondiente.
   * @param {any} song - Canción a añadir.
   */
  addSongToPlaylist(song: any): void {
    this.songToAdd = song;
    
    const abrirModal = () => {
      if (!this.userPlaylists.length) {
        this.toast.error('No tienes playlists aún. Crea una primero en la sección "Playlists".');
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

  /**
   * @method confirmAddToPlaylist
   * @description Confirma la adición de una canción a la playlist seleccionada.
   */
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
        this.toast.success(`"${song.title_}" añadida a "${playlistName}"`);
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

  /**
   * @method openVideo
   * @description Abre la canción en YouTube en una nueva pestaña y registra la acción en el historial.
   * @param {any} song - Canción que se desea reproducir.
   */
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
      this.toast.error('Debes iniciar sesión para usar favoritos');
      return;
    }

    const key = this.buildSongKey(song);

    this.musicService.addLikedSong(song).subscribe({
      next: () => {
        this.toast.success(`"${song.title_}" añadida a tus favoritos`);
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
      this.toast.error('Debes iniciar sesión para usar favoritos');
      return;
    }

    const key = this.buildSongKey(song);
    const songId = song._id || this.findLikedSongIdByKey(key);

    if (!songId) {
      this.toast.error('No se puede quitar de favoritos porque esta canción no está en tu lista de favoritos.');
      return;
    }

    this.musicService.removeLikedSong(songId).subscribe({
      next: () => {
        this.toast.success(`"${song.title_}" eliminada de tus favoritos`);
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


  // RECOMENDACIONES
  // LÓGICA DEL MODAL DE RECOMENDACIÓN

  /**
   * @method openRecommendModal
   * @description Abre el modal para recomendar una canción a un amigo.
   * @param {any} song - Canción que se desea recomendar.
   */
  openRecommendModal(song: any) {
    this.songToRecommend = song;
    this.selectedFriendId = ''; 
    this.recommendMessage = '';
    this.showRecommendModal = true;
  }

  closeRecommendModal() {
    this.showRecommendModal = false;
    this.songToRecommend = null;
  }

  selectFriend(friendId: string) {
    this.selectedFriendId = friendId;
  }
  /**
   * @method sendRecommendation
   * @description Envía la recomendación al amigo seleccionado a través del backend.
   */
  sendRecommendation() {
    if (!this.selectedFriendId) {
      this.toast.error('Por favor, selecciona un amigo.');
      return;
    }

    this.musicService.recommendSongToFriend(
      this.selectedFriendId,
      this.songToRecommend,
      this.recommendMessage
    ).subscribe({
      next: () => {
        this.toast.success('Recomendación enviada correctamente.');
        this.closeRecommendModal();
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Error al enviar la recomendación.');
      }
    });
  }
}