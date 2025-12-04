import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { MusicService } from '../../services/music.service';

@Component({
  selector: 'app-playlists',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './playlists.component.html',
})

export class PlaylistsComponent implements OnInit {
  playlists: any[] = [];
  errorMessage = '';
  showCreateModal = false;
  newPlaylistName = '';
  newPlaylistDescription = '';
  newPlaylistIsPublic = false;

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
      next: (created) => {
        const normalized = this.normalizePlaylist(created);
        this.playlists.push(normalized);
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
}
