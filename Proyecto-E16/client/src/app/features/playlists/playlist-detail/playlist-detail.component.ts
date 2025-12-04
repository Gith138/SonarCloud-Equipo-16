import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MusicService } from '../../../services/music.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-playlist-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './playlist-detail.component.html',
})

export class PlaylistDetailComponent {
  playlist: any;
  currentSongUrl: SafeResourceUrl | null = null;
  currentSongTitle: string | null = null;
  newSong = { song_title: '', youtube_url: '', genre: '' };
  showForm = false;
  shareTarget: string = '';
  isSharing = false;
  audio = new Audio(); 

  constructor(private route: ActivatedRoute, private musicService: MusicService, private sanitizer: DomSanitizer) {}

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

  playSong(youtubeUrl: string, title: string = 'Desconocido') {
    const videoId = this.extractVideoId(youtubeUrl);
    if (!videoId) {
      console.error("No se pudo extraer el ID del video:", youtubeUrl);
      return;
    }

    const youtubeLink = `https://www.youtube.com/watch?v=${videoId}`;
    window.open(youtubeLink, '_blank'); // Abre el video en una nueva pestaña

    console.log(`🎵 Abriendo "${title}" en YouTube:`, youtubeLink);
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

  addSong() {
    if (!this.playlist?._id) return;

    const { song_title, youtube_url, genre } = this.newSong;

    this.musicService.addSongToPlaylist(this.playlist._id, {
      song_title,
      youtube_url,
      genre,
    }).subscribe({
      next: (res) => {
        console.log('Canción añadida:', res);
        this.playlist.songs_.push(res.song);
        this.newSong = { song_title: '', youtube_url: '', genre: '' };
        this.showForm = false;
      },
      error: (err) => {
        console.error('Error al añadir canción:', err);
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
}
