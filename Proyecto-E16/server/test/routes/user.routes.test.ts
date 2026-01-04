import request from 'supertest';
import express from 'express';
import userRoutes from '../../src/routes/user_routes'; // Ajusta la ruta
import * as userController from '../../src/controllers/user_controller';

jest.mock('../../src/controllers/user_controller', () => {
  const handler = (req: any, res: any) => res.status(200).send('Controller OK');
  return {
    registerUser: jest.fn(handler),
    getUsers: jest.fn(handler),
    getMe: jest.fn(handler),
    deleteUser: jest.fn(handler),
    getFotoPerfil: jest.fn(handler),
    actualizar_settings: jest.fn(handler),
    searchUser: jest.fn(handler),
    searchUserFriends: jest.fn(handler),
    getLikedSongs: jest.fn(handler),
    addLikedSong: jest.fn(handler),
    removeLikedSong: jest.fn(handler),
    getHistory: jest.fn(handler),
    addToHistory: jest.fn(handler),
    clearHistory: jest.fn(handler),
    getFriendsList: jest.fn(handler),
    getFriendsLastSong: jest.fn(handler),
    addFriend: jest.fn(handler),
    removeFriend: jest.fn(handler),
    getFriendRequests: jest.fn(handler),
    acceptFriendRequest: jest.fn(handler),
    rejectFriendRequest: jest.fn(handler),
    getUserById: jest.fn(handler),
    getProfilePictureById: jest.fn(handler),
    getPreferences: jest.fn(handler), 
    actualizarPreferences: jest.fn(handler),
    sendSongRecommendation: jest.fn(handler),
    getMyRecommendations: jest.fn(handler),
    deleteRecommendation: jest.fn(handler),
  };
});

// Middlewares también
jest.mock('../../src/middlewares/resize', () => ({
  resizeProfileImage: jest.fn((req, res, next) => next()),
}));

jest.mock('../../src/config/multer', () => ({
  upload: {
    single: jest.fn(() => (req: any, res: any, next: any) => next()),
  },
}));

const app = express();
app.use(express.json());
app.use('/users', userRoutes);
 describe('User Routes - Cobertura Completa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. Gestión General & Auth ---
  it('POST /users -> registerUser', async () => {
    await request(app).post('/users');
    expect(userController.registerUser).toHaveBeenCalled();
  });

  it('GET /users -> getUsers', async () => {
    await request(app).get('/users');
    expect(userController.getUsers).toHaveBeenCalled();
  });

  it('GET /users/me -> getMe', async () => {
    await request(app).get('/users/me');
    expect(userController.getMe).toHaveBeenCalled();
  });

  it('DELETE /users/me -> deleteUser', async () => {
    await request(app).delete('/users/me');
    expect(userController.deleteUser).toHaveBeenCalled();
  });

  it('GET /users/me/image -> getFotoPerfil', async () => {
    await request(app).get('/users/me/image');
    expect(userController.getFotoPerfil).toHaveBeenCalled();
  });

  it('PUT /users/me/settings -> actualizar_settings (Multer + Sharp)', async () => {
    await request(app).put('/users/me/settings');
    expect(userController.actualizar_settings).toHaveBeenCalled();
  });

  // --- 2. Búsquedas ---
  it('GET /users/search/user -> searchUser', async () => {
    await request(app).get('/users/search/user');
    expect(userController.searchUser).toHaveBeenCalled();
  });

  it('GET /users/search/user/friends -> searchUserFriends', async () => {
    await request(app).get('/users/search/user/friends');
    expect(userController.searchUserFriends).toHaveBeenCalled();
  });

  // --- 3. Preferencias ---
  it('GET /users/me/settings/preferences -> getPreferences', async () => {
    await request(app).get('/users/me/settings/preferences');
    expect(userController.getPreferences).toHaveBeenCalled();
  });

  it('PUT /users/me/settings/preferences -> actualizarPreferences', async () => {
    await request(app).put('/users/me/settings/preferences');
    expect(userController.actualizarPreferences).toHaveBeenCalled();
  });

  // --- 4. Favoritos (Likes) ---
  it('GET /users/me/likes -> getLikedSongs', async () => {
    await request(app).get('/users/me/likes');
    expect(userController.getLikedSongs).toHaveBeenCalled();
  });
  
  it('POST /users/me/likes -> addLikedSong', async () => {
    await request(app).post('/users/me/likes');
    expect(userController.addLikedSong).toHaveBeenCalled();
  });

  it('DELETE /users/me/likes/:songId -> removeLikedSong', async () => {
    await request(app).delete('/users/me/likes/123');
    expect(userController.removeLikedSong).toHaveBeenCalled();
  });

  // --- 5. Historial ---
  it('GET /users/me/history -> getHistory', async () => {
    await request(app).get('/users/me/history');
    expect(userController.getHistory).toHaveBeenCalled();
  });

  it('POST /users/me/history -> addToHistory', async () => {
    await request(app).post('/users/me/history');
    expect(userController.addToHistory).toHaveBeenCalled();
  });

  it('DELETE /users/me/history/clear -> clearHistory', async () => {
    await request(app).delete('/users/me/history/clear');
    expect(userController.clearHistory).toHaveBeenCalled();
  });

  // --- 6. Amigos & Actividad ---
  it('GET /users/friends/list -> getFriendsList', async () => {
    await request(app).get('/users/friends/list');
    expect(userController.getFriendsList).toHaveBeenCalled();
  });

  it('GET /users/friends/activity -> getFriendsLastSong', async () => {
    await request(app).get('/users/friends/activity');
    expect(userController.getFriendsLastSong).toHaveBeenCalled();
  });

  it('PUT /users/friends/add -> addFriend', async () => {
    await request(app).put('/users/friends/add');
    expect(userController.addFriend).toHaveBeenCalled();
  });

  it('DELETE /users/friends/remove -> removeFriend', async () => {
    await request(app).delete('/users/friends/remove');
    expect(userController.removeFriend).toHaveBeenCalled();
  });

  // --- 7. Solicitudes de Amistad ---
  it('GET /users/friends/requests -> getFriendRequests', async () => {
    await request(app).get('/users/friends/requests');
    expect(userController.getFriendRequests).toHaveBeenCalled();
  });

  it('PUT /users/friends/requests/accept -> acceptFriendRequest', async () => {
    await request(app).put('/users/friends/requests/accept');
    expect(userController.acceptFriendRequest).toHaveBeenCalled();
  });

  it('PUT /users/friends/requests/reject -> rejectFriendRequest', async () => {
    await request(app).put('/users/friends/requests/reject');
    expect(userController.rejectFriendRequest).toHaveBeenCalled();
  });

  // --- 8. Recomendaciones ---
  it('POST /users/friends/recommend -> sendSongRecommendation', async () => {
    await request(app).post('/users/friends/recommend');
    expect(userController.sendSongRecommendation).toHaveBeenCalled();
  });

  it('GET /users/me/recommendations -> getMyRecommendations', async () => {
    await request(app).get('/users/me/recommendations');
    expect(userController.getMyRecommendations).toHaveBeenCalled();
  });

  it('DELETE /users/me/recommendations/:recId -> deleteRecommendation', async () => {
    await request(app).delete('/users/me/recommendations/123');
    expect(userController.deleteRecommendation).toHaveBeenCalled();
  });

  // --- 9. Consultas por ID (Otros usuarios) ---
  it('GET /users/:id -> getUserById', async () => {
    await request(app).get('/users/12345');
    expect(userController.getUserById).toHaveBeenCalled();
  });

  it('GET /users/:id/image -> getProfilePictureById', async () => {
    await request(app).get('/users/abcde/image');
    expect(userController.getProfilePictureById).toHaveBeenCalled();
  });
});