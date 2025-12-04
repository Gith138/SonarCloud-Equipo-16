import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard'; // 1. IMPORTANTE: Importar el guard

import { HomeComponent } from './features/home/home.component';
import { FriendsComponent } from './features/friends/friends.component';
import { SettingsComponent } from './features/settings/settings.component';
import { PlaylistsComponent } from './features/playlists/playlists.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { AddSongComponent } from './features/playlists/add-song/add-song.component';
import { PlaylistDetailComponent } from './features/playlists/playlist-detail/playlist-detail.component';

export const routes: Routes = [
  // --- RUTAS PÚBLICAS (Cualquiera puede entrar) ---
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // --- RUTAS PRIVADAS (El Guard protege la entrada) ---
  { 
    path: 'settings', 
    component: SettingsComponent,
    canActivate: [authGuard] // <--- Añadido aquí
  },
  { 
    path: 'home', 
    component: HomeComponent,
    canActivate: [authGuard] // <--- Añadido aquí
  },
  { 
    path: 'friends', 
    component: FriendsComponent,
    canActivate: [authGuard] // <--- Añadido aquí
  },

  // Playlists y sus sub-rutas
  { 
    path: 'playlists', 
    component: PlaylistsComponent,
    canActivate: [authGuard] // <--- Añadido aquí
  },
  { 
    path: 'playlists/:id', 
    component: PlaylistDetailComponent,
    canActivate: [authGuard] // <--- Añadido aquí
  },
  { 
    path: 'playlists/:id/add-song', 
    component: AddSongComponent,
    canActivate: [authGuard] // <--- Añadido aquí
  },

  // --- REDIRECCIONES ---
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];