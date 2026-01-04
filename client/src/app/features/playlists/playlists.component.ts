/**
 * @file playlists.component.ts
 * @brief Componente para la gestión global de las listas de reproducción del usuario.
 * @description Permite listar, crear, editar y eliminar playlists. Incluye lógica para 
 * normalizar datos provenientes del servidor y asignar portadas visuales.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { MusicService } from '../../services/music.service';
import { ToastService } from '../../services/toast.service'; 
import { UserService } from '../../services/user.service';
import { SafeUrl } from '@angular/platform-browser';
/**
 * @interface ListPlaylist
 * @description Representación simplificada de un amigo para el listado del Home.
 */
interface ListPlaylist {
  _id: string;
  username_: string;
  email_: string;
  displayAvatar?: SafeUrl | string; // Propiedad para la imagen visual
}


/**
 * @class PlaylistsComponent
 * @description Maneja la interfaz de usuario para el CRUD de playlists y la navegación hacia sus detalles.
 */
@Component({
  selector: 'app-playlists',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './playlists.component.html',
  styleUrl: './playlists.component.css',
})
export class PlaylistsComponent implements OnInit {
/** @property {any[]} playlists - Almacena la colección de listas de reproducción del usuario. */
  playlists: any[] = [];
  /** @property {string} errorMessage - Mensaje de error a mostrar si falla la carga de datos. */
  errorMessage = '';

  // --- Propiedades para Creación ---
  showCreateModal = false;
  newPlaylistName = '';
  newPlaylistDescription = '';
  newPlaylistIsPublic = false;

  // --- Propiedades para Edición ---
  showEditModal = false;
  playlistBeingEdited: any;
  editName = '';
  editDescription = '';
  editIsPublic = false;
  selectedCoverFile: File | null = null;
  coverPreview: string | null = null;
  listplaylists: ListPlaylist[] = [];

  /**
   * @constructor
   * @param {MusicService} musicService - Servicio para peticiones de datos musicales.
   * @param {Router} router - Servicio de Angular para navegación entre rutas.
   * @param {ToastService} toast - Servicio para mostrar notificaciones flotantes de éxito/error.
   * @param {UserService} userService - Servicio para obtener información del usuario.
   */
  constructor(private musicService: MusicService, private router: Router, private toast: ToastService, private userService: UserService) {}

  /**
   * @method ngOnInit
   * @description Inicializa el componente cargando las playlists del usuario y normalizando su estructura.
   */
  ngOnInit() {
    
    this.musicService.getPlaylists().subscribe({
      next: (data: any[]) => {
        console.log('Playlists obtenidas:', data);
        this.playlists = data.map(p => this.normalizePlaylist(p));
      },
      error: (err: any) => {
        console.error('Error al obtener playlists:', err);
        this.errorMessage = 'No se pudieron cargar las playlists.';
      },
    });
  }

  /**
   * @private @method normalizePlaylist
   * @description Asegura que el objeto playlist tenga las propiedades esperadas por el HTML (con sufijo `_`).
   * @param {any} p - Objeto playlist crudo del backend.
   * @returns {any} Objeto normalizado con valores por defecto.
   */
  private normalizePlaylist(p: any) {
    return {
      ...p,
      name_: p.name_ ?? p.name ?? 'Sin nombre',
      description_: p.description_ ?? p.description ?? '',
      songs_: p.songs_ ?? p.songs ?? [],
    };
  }
  
  /**
   * @method loadPlaylists
   * @description Carga las listas de reproducción del usuario desde el servidor.
   */
  loadPlaylists() {
    this.musicService.getPlaylists().subscribe({
      next: (data: any[]) => {
        console.log('Playlists obtenidas:', data);
        this.playlists = data;
      },
      error: (err: any) => {
        console.error('Error al obtener playlists:', err);
        this.errorMessage = 'No se pudieron cargar las playlists.';
      },
    });
  }

  /**
   * @method goToPlaylist
   * @description Navega a la vista de detalle de una lista de reproducción específica.
   * @param {string} id - Identificador único de la playlist.
   */
  goToPlaylist(id: string) {
    this.router.navigate([`/playlists/${id}`]);
  }
  // --- Métodos de gestión de modales (Open/Close) ---
  openCreateModal() {
    this.newPlaylistName = '';
    this.newPlaylistDescription = '';
    this.newPlaylistIsPublic = false;
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }
  
  /**
   * @method createPlaylist
   * @description Envía la información al servidor para crear una nueva lista y la añade localmente si tiene éxito.
   */
  createPlaylist() {
    const name = this.newPlaylistName.trim();
    if (!name) {
      this.toast.error('Error. La playlist debe tener un nombre válido.');
      return;
    }
    const body = {
      name_: name,
      description_: this.newPlaylistDescription.trim(),
      isPublic_: this.newPlaylistIsPublic,
    };

    this.musicService.createPlaylist(body).subscribe({
      next: (res: any) => {
        const created = res.playlist ?? res;

        const normalized = this.normalizePlaylist(created);
        this.playlists = [...this.playlists, normalized];
        this.showCreateModal = false;
        this.newPlaylistName = '';
        this.newPlaylistDescription = '';
        this.newPlaylistIsPublic = false;
      },
      error: (err) => {
        console.error('Error al crear playlist:', err);
        this.toast.error('No se pudo crear la playlist.');
      },
    });
  }
  private loadPlaylistAvatar(listplaylists: ListPlaylist) {
    // 1. Ponemos placeholder inicial
    listplaylists.displayAvatar = 'assets/perfil.png'; 

    // 2. Pedimos la foto al servicio (si ya está en RAM, es instantáneo)
    this.userService.getAvatar(listplaylists._id).subscribe({
      next: (safeUrl) => {
        listplaylists.displayAvatar = safeUrl;
      },
      error: () => { /* Se queda con el placeholder */ }
    });
  }
  /**
   * @method deletePlaylist
   * @description Elimina una playlist tras la confirmación del usuario.
   * @param {any} p - Objeto de la playlist a eliminar.
   * @param {MouseEvent} event - Evento del ratón para evitar la navegación accidental (stopPropagation).
   */
  deletePlaylist(p: any, event: MouseEvent) {
    event.stopPropagation();

    const nombre = p.name_ || p.name || 'esta playlist';
    const ok = confirm(`¿Seguro que quieres eliminar "${nombre}"?\nEsta acción no se puede deshacer.`);
    if (!ok) return;

    this.musicService.deletePlaylist(p._id).subscribe({
      next: () => {
        this.playlists = this.playlists.filter((pl) => pl._id !== p._id);
      },
      error: (err) => {
        console.error('Error al eliminar playlist:', err);
        this.toast.error('No se pudo eliminar la playlist.');
      },
    });
  }

  /**
   * @method getImage
   * @description Obtiene la URL de la imagen. Prioriza la portada subida (cover_) sobre las imágenes por defecto.
   * @param {any} p - El objeto playlist.
   * @returns {string} URL de la imagen a mostrar.
   */
  getImage(p: any): string {
    if (p.cover_ && typeof p.cover_ === 'string' && p.cover_.trim() !== '') {
    if (p.cover_.startsWith('data:')) return p.cover_;
     return p.cover_;
    }
    if (p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.trim() !== '') return p.imageUrl;

    // 3. Imágenes por defecto 
    const defaultImages = [
    'https://images.unsplash.com/photo-1669299866851-c3b48c7965ac?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=600&auto=format&fit=crop&q=60',
    ];
    // Usamos el ID para que la imagen sea siempre la misma para la misma playlist
    const index = p._id ? p._id.charCodeAt(0) % defaultImages.length : 0;
    return defaultImages[index];
  }

  // --- Métodos para editar modales (Open/Close) ---
  openEditModal(p: any) {
    this.playlistBeingEdited = p;
    this.editName = p.name_ || '';
    this.editDescription = p.description_ || '';
    this.editIsPublic = !!p.isPublic_;
    this.coverPreview = p.cover_ || null;
    this.selectedCoverFile = null;
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.playlistBeingEdited = null;
    this.editName = '';
    this.editDescription = '';
    this.editIsPublic = false;
    this.selectedCoverFile = null;
    this.coverPreview = null;
  }

  onCoverFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedCoverFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.coverPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  clearCover() {
    this.selectedCoverFile = null;
    this.coverPreview = null;
  }

  /**
   * @method saveEditPlaylist
   * @description Envía los cambios de edición al servidor y actualiza la lista local.
   */
  saveEditPlaylist() {
    if (!this.playlistBeingEdited) return; 
    const updates: any = {
      name_: this.editName,
      description_: this.editDescription,
      isPublic_: this.editIsPublic,
    };

    this.musicService.updatePlaylist(this.playlistBeingEdited._id, updates).subscribe({
      next: (res: any) => {
        const index = this.playlists.findIndex((p: any) => p._id === this.playlistBeingEdited._id);
        if (index !== -1 && res.playlist) {
          this.playlists[index] = {
            ...this.playlists[index],
            ...res.playlist,
          };
        }
        if (this.selectedCoverFile) {
          this.musicService.updatePlaylistCover(this.playlistBeingEdited._id, this.selectedCoverFile).subscribe({
            next: (coverRespense: any) => {
              const updateCover = coverRespense.playlist ?? coverRespense;
              if (index !== -1) {
                this.playlists[index] = {
                  ...this.playlists[index],
                  ...updateCover,
                };
              }
              this.toast.success('Playlist actualizada');
              this.closeEditModal();
            },
            error: (err) => {
              console.error('Error al actualizar portada:', err);
              this.toast.error('La playlist se actualizó, pero falló la portada.');
              this.closeEditModal();
            }
          });
        } else {
          this.toast.success('Playlist actualizada');
          this.closeEditModal();
        }
      },
      error: (err) => {
        console.error('Error al actualizar playlist:', err);
        this.toast.error('No se pudo actualizar la playlist.');
      },
    });
  }

  /**
   * @method removeCover
   * @description Elimina la portada personalizada de la playlist y restaura la imagen por defecto.
   */
  removeCover() {
    // Seguridad: Si no hay playlist editándose, no hacemos nada
    if (!this.playlistBeingEdited) return;

    // Confirmación para evitar clicks accidentales
    const confirmacion = confirm('¿Estás seguro de que quieres quitar la imagen de portada?');
    if (!confirmacion) return;

    // Llamada al servicio
    this.musicService.deletePlaylistCover(this.playlistBeingEdited._id).subscribe({
      next: (updatedPlaylist: any) => {
        console.log('Portada eliminada correctamente');

        // Limpiamos la vista previa del modal (para que se vea vacío o default al instante)
        this.coverPreview = null;
        this.selectedCoverFile = null;
        this.playlistBeingEdited.cover_ = '';  // También actualizamos el objeto en edición
        const index = this.playlists.findIndex(p => p._id === this.playlistBeingEdited._id);
        if (index !== -1) {
          this.playlists[index].cover_ = '';  // Actualizamos la lista local para reflejar el cambio
        }

        this.toast.success('Portada eliminada');
        this.toast.success('Portada restaurada a por defecto');
      },
      error: (err) => {
        console.error('Error al eliminar portada:', err);
        const msg = err.error?.message || 'No se pudo quitar la portada';
        this.toast.error(msg);
      }
    });
  }
}