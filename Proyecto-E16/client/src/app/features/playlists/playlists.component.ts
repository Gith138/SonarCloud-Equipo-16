import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { MusicService } from '../../services/music.service';
import { identifierName } from '@angular/compiler';


@Component({
  selector: 'app-playlists',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './playlists.component.html',
  styleUrl: './playlists.component.css',
})

export class PlaylistsComponent implements OnInit {
  playlists: any[] = [];
  errorMessage = '';
  showCreateModal = false;
  newPlaylistName = '';
  newPlaylistDescription = '';
  newPlaylistIsPublic = false;
  showEditModal = false;
  playlistBeingEdited: any;
  editName = '';
  editDescription = '';
  editIsPublic = false;

  constructor(private musicService: MusicService, private router: Router) {}

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

  private normalizePlaylist(p: any) {
    return {
      ...p,
      name_: p.name_ ?? p.name ?? 'Sin nombre',
      description_: p.description_ ?? p.description ?? '',
      songs_: p.songs_ ?? p.songs ?? [],
    };
  }

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

  goToPlaylist(id: string) {
    this.router.navigate([`/playlists/${id}`]);
  }

  openCreateModal() {
    this.newPlaylistName = '';
    this.newPlaylistDescription = '';
    this.newPlaylistIsPublic = false;
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }
  

  createPlaylist() {
    const name = this.newPlaylistName.trim();
    if (!name) {
      alert('Ponle un nombre a la playlist');
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
        alert('No se pudo crear la playlist.');
      },
    });
  }

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
        alert('No se pudo eliminar la playlist.');
      },
    });
  }

  getImage(p: any): string {
    // Si la playlist tiene una imagen definida, la usamos
    if (p.imageUrl) return p.imageUrl;

    // Si no, usamos una imagen por defecto basada en el ID para variedad
    const defaultImages = [
      'https://images.unsplash.com/photo-1669299866851-c3b48c7965ac?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=600&auto=format&fit=crop&q=60',
    ];
    const index = p._id ? p._id.charCodeAt(0) % defaultImages.length : 0;
    return defaultImages[index];
  }

  openEditModal(p: any) {
    this.playlistBeingEdited = p;
    this.editName = p.name_ || '';
    this.editDescription = p.description_ || '';
    this.editIsPublic = !!p.isPublic_;
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.playlistBeingEdited = null;
    this.editName = '';
    this.editDescription = '';
    this.editIsPublic = false;
  }

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
        this.closeEditModal();
      },
      error: (err) => {
        console.error('Error al actualizar playlist:', err);
        alert('No se pudo actualizar la playlist.');
      },
    });
  }
}
