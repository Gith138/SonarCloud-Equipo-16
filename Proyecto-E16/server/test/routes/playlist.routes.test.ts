import request from 'supertest';
import express from 'express';
import playlistRoutes from '../../src/routes/playlist_routes';
import * as playlistController from '../../src/controllers/playlist_controller';

// Mock simple que devuelve 200 para todas las funciones
jest.mock('../../src/config/multer', () => ({
  upload: {
    single: jest.fn(() => (req: any, res: any, next: any) => next()),
  },
}));

jest.mock('../../src/controllers/playlist_controller', () => {
  const handler = (req: any, res: any) => res.status(200).send('OK');
  return {
    createPlaylist: jest.fn(handler),
    getPlaylists: jest.fn(handler),
    getPlaylistById: jest.fn(handler),
    updatePlaylist: jest.fn(handler),
    deletePlaylist: jest.fn(handler),
    addSongToPlaylist: jest.fn(handler),
    removeSongFromPlaylist: jest.fn(handler),
    sharePlaylistWithUser: jest.fn(handler),
    unsharePlaylistWithUser: jest.fn(handler),
    updatePlaylistCover: jest.fn(handler),
    deletePlaylistCover: jest.fn(handler),
  };
});

jest.mock('../../src/middlewares/resize', () => ({
  resizePlaylistCover: jest.fn((req, res, next) => next()),
}));

const app = express();
app.use(express.json());
app.use('/playlists', playlistRoutes);

describe('Playlist Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /playlists -> createPlaylist', async () => {
    await request(app).post('/playlists');
    expect(playlistController.createPlaylist).toHaveBeenCalled();
  });

  it('GET /playlists -> getPlaylists', async () => {
    await request(app).get('/playlists');
    expect(playlistController.getPlaylists).toHaveBeenCalled();
  });

  it('GET /playlists/:id -> getPlaylistById', async () => {
    await request(app).get('/playlists/123');
    expect(playlistController.getPlaylistById).toHaveBeenCalled();
  });

  it('PUT /playlists/:id -> updatePlaylist', async () => {
    await request(app).put('/playlists/123');
    expect(playlistController.updatePlaylist).toHaveBeenCalled();
  });

  it('DELETE /playlists/:id -> deletePlaylist', async () => {
    await request(app).delete('/playlists/123');
    expect(playlistController.deletePlaylist).toHaveBeenCalled();
  });

  it('POST /playlists/:id/songs -> addSongToPlaylist', async () => {
    await request(app).post('/playlists/123/songs');
    expect(playlistController.addSongToPlaylist).toHaveBeenCalled();
  });

  it('DELETE /playlists/:id/songs/:songId -> removeSongFromPlaylist', async () => {
    await request(app).delete('/playlists/123/songs/456');
    expect(playlistController.removeSongFromPlaylist).toHaveBeenCalled();
  });

  it('POST /playlists/:id/share -> sharePlaylistWithUser', async () => {
    await request(app).post('/playlists/123/share');
    expect(playlistController.sharePlaylistWithUser).toHaveBeenCalled();
  });

  it('DELETE /playlists/:id/share -> unsharePlaylistWithUser', async () => {
    await request(app).delete('/playlists/123/share');
    expect(playlistController.unsharePlaylistWithUser).toHaveBeenCalled();
  });

  it('PUT /playlists/:id/cover -> updatePlaylistCover', async () => {
    await request(app).put('/playlists/123/cover');
    expect(playlistController.updatePlaylistCover).toHaveBeenCalled();
  });

  it('DELETE /playlists/:id/cover -> deletePlaylistCover', async () => {
    await request(app).delete('/playlists/123/cover');
    expect(playlistController.deletePlaylistCover).toHaveBeenCalled();
  });
});