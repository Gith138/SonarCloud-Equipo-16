import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-add-song',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-song.component.html',
  styleUrl: './add-song.component.css'
})
export class AddSongComponent implements OnInit {
  playlistId: string = '';
  songTitle: string = '';
  youtubeUrl: string = '';
  genre: string = '';
  message: string = '';

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit() {
  
    this.playlistId = this.route.snapshot.paramMap.get('id') || '';
  }

  addSong() {
    if (!this.playlistId) {
      this.message = 'No se ha especificado una playlist.';
      return;
    }

    if (!this.songTitle && !this.youtubeUrl) {
      this.message = 'Escribe un título o una URL de YouTube.';
      return;
    }

    const token = sessionStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const body = {
      song_title: this.songTitle,
      youtube_url: this.youtubeUrl,
      genre: this.genre,
    };

    this.http.post(`http://localhost:3000/api/playlists/${this.playlistId}/songs`, body, { headers })
      .subscribe({
        next: (res: any) => {
          this.message = res.message || 'Canción añadida con éxito';
          this.songTitle = '';
          this.youtubeUrl = '';
          this.genre = '';
          alert(this.message);
        },
        error: (err) => {
          console.error(err);
          this.message = err.error?.message || 'Error al añadir la canción';
        }
      });
  }
}