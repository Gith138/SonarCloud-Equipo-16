/**
 * @file playlist-detail.component.ts
 * @brief Componente para la gestión detallada de una playlist específica.
 * @description Permite visualizar, añadir, eliminar y ordenar canciones dentro de una playlist,
 * además de gestionar la funcionalidad de compartir con otros usuarios.
 */
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SafeUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MusicService } from '../../../services/music.service';
import { UserService } from '../../../services/user.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastService } from '../../../services/toast.service';

/**
 * @class PlaylistDetailComponent
 * @description Maneja la lógica interna de una lista de reproducción, incluyendo la integración con la API de YouTube.
 */
@Component({
  selector: 'app-playlist-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './playlist-detail.component.html',
  styleUrl: './playlist-detail.component.css'
})
export class PlaylistDetailComponent {
  /** @property {any} playlist - Objeto que contiene los datos de la playlist y su array de canciones. */
  playlist: any;
  
  showShareManager: boolean = false;

  /** @property {any} currentUser - Datos del usuario actualmente logueado. */
  currentUser: any = null;
  /** @property {SafeResourceUrl | null} currentSongUrl - URL sanitizada para el reproductor (si se usa embebido). */
  currentSongUrl: SafeResourceUrl | null = null;
  /** @property {string | null} currentSongTitle - Título de la canción que se está reproduciendo actualmente. */
  currentSongTitle: string | null = null;
  /** @property {boolean} showForm - Controla la visibilidad del formulario de búsqueda/añadido de canciones. */
  showForm = false;
  /** @property {string} shareTarget - Almacena el input (email/username) del usuario con quien compartir. */
  shareTarget: string = '';
  /** @property {boolean} isSharing - Controla la visibilidad del modal o sección de compartir. */
  isSharing = false;
  /** @property {Audio} audio - Objeto nativo de audio para previsualizaciones (si aplica). */
  audio = new Audio(); 
  /** @property {'asc' | 'desc'} songSortOrder - Define el orden alfabético de la lista de canciones. */
  songSortOrder: 'asc' | 'desc' = 'asc';
  /** @property {string} searchQuery - Término de búsqueda para localizar nuevas canciones en YouTube. */
  searchQuery: string = '';
  /** @property {any[]} searchResults - Lista de resultados obtenidos desde la API de YouTube. */
  searchResults: any[] = [];
  /** @property {boolean} isSearching - Flag de estado para mostrar indicadores de carga durante la búsqueda. */
  isSearching = false;

  /** @property {any[]} filteredUsersForShare - Lista de usuarios sugeridos al intentar compartir la playlist. */
  filteredUsersForShare: any[] = []; 

  /**
   * @constructor
   * @param {ActivatedRoute} route - Para extraer el ID de la playlist desde la URL.
   * @param {MusicService} musicService - Servicio para gestión de música y YouTube.
   * @param {DomSanitizer} sanitizer - Para validar URLs externas de forma segura.
   * @param {UserService} userService - Servicio para búsqueda de usuarios.
   * @param {ToastService} toast - Para feedback visual.
   */
  constructor(
    private route: ActivatedRoute, 
    private musicService: MusicService, 
    private sanitizer: DomSanitizer, 
    private userService: UserService, 
    private toast: ToastService
  ) {}

  /**
   * @method ngOnInit
   * @description Recupera el ID de los parámetros de la ruta y carga los datos de la playlist.
   */
  ngOnInit() {

    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (err) => console.error('Error al obtener usuario actual', err)
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.musicService.getPlaylistById(id).subscribe({
      next: (data) => {
        console.log('Playlist cargada:', data);
        this.playlist = data;
        // Llamamos a la función para cargar el avatar del dueño
        if (this.playlist.owner_) {
          this.loadOwnerAvatar();
        }

        if (this.playlist.owner_group_?.length) {
          this.loadCollaboratorAvatars();
        }
      },
      error: (err) => {
        this.toast.error(`Error al cargar playlist: ${err.error?.message || err.message}`);
        console.error('Error al cargar playlist:', err);
      }
    });
  }

  /**
   * @method loadOwnerAvatar
   * @description Solicita el avatar procesado del dueño de la playlist al UserService.
   */
  loadOwnerAvatar() {
    const ownerId = this.playlist.owner_?._id || this.playlist.owner_;
    
    // Establecemos un placeholder inicial
    this.playlist.owner_.displayAvatar = 'assets/perfil.png'; 

    this.userService.getAvatar(ownerId).subscribe({
      next: (safeUrl) => {
        // Asignamos la URL segura a una nueva propiedad del objeto owner_
        this.playlist.owner_.displayAvatar = safeUrl;
      },
      error: () => {
        this.playlist.owner_.displayAvatar = 'assets/perfil.png';
      }
    });
  }

  /**
   * @method isOwner
   * @description Compara el ID del usuario logueado con el ID del dueño de la playlist.
   */
  get isOwner(): boolean {
    if (!this.playlist || !this.currentUser) return false;

    // El ID del dueño puede venir como objeto poblado o como string
    const playlistOwnerId = this.playlist.owner_?._id || this.playlist.owner_;
    const currentUserId = this.currentUser._id || this.currentUser.id;

    return playlistOwnerId === currentUserId;
  }


  /**
   * @method loadCollaboratorAvatars
   * @description Itera sobre el grupo de colaboradores y carga sus avatares usando el servicio de usuarios.
   * Se basa en el sistema de caché del UserService para ser eficiente.
   */
  loadCollaboratorAvatars() {
    if (!this.playlist || !this.playlist.owner_group_?.length) return;

    this.playlist.owner_group_.forEach((collaborator: any) => {
      const collaboratorId = collaborator._id || collaborator.id;
      
      collaborator.displayAvatar = 'assets/perfil.png'; 

      if (collaboratorId) {
        this.userService.getAvatar(collaboratorId).subscribe({
          next: (safeUrl) => {
            collaborator.displayAvatar = safeUrl;
          },
          error: (err) => {
            console.log(`No se pudo cargar el avatar para ${collaborator.username_}`);
          }
        });
      }
    });
  }


  /**
   * @method playSong
   * @description Extrae el ID de YouTube, abre el video en una nueva pestaña y registra la reproducción en el historial.
   * @param {string} youtubeUrl - URL original del video.
   * @param {string} title - Título de la canción.
   * @param {any} [songObj] - Objeto completo de la canción para el historial.
   */
  playSong(youtubeUrl: string, title: string = 'Desconocido', songObj?: any) {
    const videoId = this.extractVideoId(youtubeUrl);
    if (!videoId) {
      this.toast.error('No se pudo extraer el ID de YouTube');
      console.error("No se pudo extraer ID:", youtubeUrl);
      return;
    }
    const youtubeLink = `https://www.youtube.com/watch?v=${videoId}`; 
    window.open(youtubeLink, '_blank'); 
    console.log(`🎵 Abriendo:`, youtubeLink);
    const songData = songObj || {
      title_: title,
      youtubeURL_: youtubeLink,
      // Si venía de búsqueda, intentamos sacar la miniatura, si no, placeholder
      thumbnailURL_: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      artist_: "Desconocido" // Valor por defecto
    };
    this.musicService.addSongToHistory(songData).subscribe({
      next: () => console.log(`Historial actualizado`),
      error: (err) => {
        this.toast.error(`Error al actualizar historial: ${err.error?.message || err.message}`);
        console.error('Error historial', err);
      }
    });
  }
  /**
   * @method onAudioError
   * @description Maneja errores en la carga del audio, reseteando la URL actual.
   */
  onAudioError() {
    this.toast.error('Error al cargar el audio');
    console.error('Error al cargar el audio');
    this.currentSongUrl = null;
  }

  /**
   * @method extractVideoId
   * @description Procesa una URL de YouTube para obtener el identificador único 'v'.
   * @param {string} url - URL completa o ID.
   * @returns {string} El ID del video extraído.
   */
  extractVideoId(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('v') || ''; 
    } catch {
      return url;
    }
  }

  /**
   * @method searchSongsForPlaylist
   * @description Realiza una búsqueda reactiva en YouTube para encontrar canciones que añadir a la playlist.
   */
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
        this.toast.error('Error al buscar en YouTube.');
        this.searchResults = [];
        this.isSearching = false;
      },
    });
  }

  /**
   * @method addSearchResultToPlaylist
   * @description Inserta una canción seleccionada de los resultados de búsqueda en la playlist actual.
   * @param {any} video - Datos de la canción provenientes de la búsqueda de YouTube.
   */
  addSearchResultToPlaylist(video: any) {
    if (!this.playlist?._id) return;

    const payload = {
      song_title: video.title_,
      youtube_url: video.youtubeURL_,
      genre: video.genre_ || 'Desconocido',
    };

    this.musicService.addSongToPlaylist(this.playlist._id, payload).subscribe({
      next: (res: any) => {
        if (res?.song) {
          this.playlist.songs_.push(res.song);
        }
        this.toast.success(`"${video.title_}" añadida a la playlist`);
      },
      error: (err) => {
        console.error('Error al añadir canción desde búsqueda:', err);
        this.toast.error('No se pudo añadir la canción.');
      },
    });
  }
  /**
   * @method deleteSong
   * @description Elimina una canción de la playlist tras confirmación del usuario.
   * @param {string} songId - ID único de la canción en la playlist.
   * @param {string} title - Título para mostrar en el mensaje de confirmación.
   */
  deleteSong(songId: string, title: string) {
    if (!confirm(`¿Eliminar la canción "${title}" de la playlist?`)) return;

    this.musicService.deleteSongFromPlaylist(this.playlist._id, songId).subscribe({
      next: (res) => {
        this.playlist.songs_ = this.playlist.songs_.filter((s: any) => s._id !== songId);
      },
      error: (err) => {
        console.error("Error al eliminar canción:", err);
        this.toast.error(`No se pudo eliminar la canción` +
          `${err.error?.message || err.message}`);
      },
    });
  }

  /**
   * @method searchUsersToShare
   * @description Busca usuarios en tiempo real para sugerirlos en la funcionalidad de compartir.
   */
  searchUsersToShare() {
    if (!this.shareTarget.trim()) {
      this.filteredUsersForShare = [];
      return;
    }

    this.userService.searchUsersFriends(this.shareTarget).subscribe({
      next: (res: any) => {
        const users = res.users || [];
        
        users.forEach((u: any) => {
          u.displayAvatar = 'assets/default-avatar.png'; // Default
          this.userService.getAvatar(u._id).subscribe(url => u.displayAvatar = url);
        });

        this.filteredUsersForShare = users;
      },
      error: (err) => {
        this.toast.error(`Error al buscar usuarios: ${err.error?.message || err.message}`);
        console.error(err);
      }
    });
  }
  


  /**
   * @method selectUserForShare
   * @description Rellena el campo de destino con el email del usuario seleccionado de la lista de sugerencias.
   * @param {any} user - Usuario seleccionado.
   */
  selectUserForShare(user: any) {
    this.shareTarget = user.email_; 
    this.filteredUsersForShare = [];
  }

  /**
   * @method unshare
   * @description Revoca el acceso a la playlist para un usuario específico.
   * @param {any} user - El objeto de usuario a eliminar del grupo de propietarios.
   */
  unshare(user: any) {
    // El backend busca por email o username (target)
    const target = user.email_ || user.username_;
    
    if (!confirm(`¿Estás seguro de que quieres revocar el acceso a "${user.username_}"?`)) {
      return;
    }

    this.musicService.unsharePlaylist(this.playlist._id, target).subscribe({
      next: (res: any) => {
        this.toast.success(res.message || `Acceso revocado para ${user.username_}`);
        
        // Actualizar la interfaz localmente sin recargar
        if (this.playlist && this.playlist.owner_group_) {
          this.playlist.owner_group_ = this.playlist.owner_group_.filter(
            (u: any) => u._id !== user._id
          );
        }
      },
      error: (err) => {
        console.error('Error al revocar acceso:', err);
        this.toast.error(err.error?.message || 'Error al intentar dejar de compartir');
      }
    });
  }

  /**
   * @method getUserAvatar
   * @description Devuelve la URL del avatar del usuario o una imagen por defecto si no existe.
   * @param {string} url - URL del avatar del usuario.
   * @returns {string} URL del avatar o imagen por defecto.
   */
  getUserAvatar(url: string) {
    return url || 'assets/default-avatar.png'; // Pon tu ruta por defecto
  }
  /**
   * @method sharePlaylist
   * @description Envía una petición al servidor para dar acceso a otro usuario a esta playlist.
   */
  sharePlaylist() {
    const target = this.shareTarget.trim();
    if (!target) {
      this.toast.error('Introduce un correo o nombre de usuario');
      return;
    }
    this.musicService.sharePlaylist(this.playlist._id, target).subscribe({
      next: (res) => {
        this.toast.success(`Playlist compartida con ${target}`);
        this.shareTarget = '';
        this.isSharing = false;
      },
      error: (err) => {
        this.toast.success(`${err.error?.message || err.message}`);
        console.error('Error al compartir:', err);
      },
    });
  }
  /**
   * @method sortedSongs
   * @description Devuelve las canciones ordenadas según el criterio seleccionado.
   * @returns {any[]} Lista de canciones ordenadas.
   */
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
  /** @method closeShareManager
   * @description Cierra el gestor de compartir playlist.
   * @param {MouseEvent} [event] - Evento de ratón opcional para evitar propagación.
   */
  closeShareManager(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.showShareManager = false;
  }

  /**
   * @method isCollaborator
   * @description Comprueba si el usuario actual está en la lista de colaboradores.
   */
  get isCollaborator(): boolean {
    if (!this.playlist || !this.currentUser || !this.playlist.owner_group_) return false;
    
    const currentUserId = this.currentUser._id || this.currentUser.id;
    // Buscamos si el ID del usuario actual existe en el array de colaboradores
    return this.playlist.owner_group_.some((u: any) => {
      const collaboratorId = u._id || u; // u puede ser el objeto poblado o solo el ID
      return collaboratorId === currentUserId;
    });
  }

  /**
   * @method canEdit
   * @description Define si el usuario tiene permiso para modificar el contenido (Añadir/Eliminar canciones)
   */
  get canEdit(): boolean {
    return this.isOwner || this.isCollaborator;
  }
}