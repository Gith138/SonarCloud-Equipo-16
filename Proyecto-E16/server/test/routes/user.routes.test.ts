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
    getLikedSongs: jest.fn(handler),
    addLikedSong: jest.fn(handler),
    removeLikedSong: jest.fn(handler),
    getHistory: jest.fn(handler),
    addToHistory: jest.fn(handler),
    clearHistory: jest.fn(handler),
    updateHistoryRating: jest.fn(handler),
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

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Auth & Perfil ---
  it('POST /users -> registerUser', async () => {
    await request(app).post('/users');
    expect(userController.registerUser).toHaveBeenCalled();
  });

  it('GET /users/me -> getMe', async () => {
    await request(app).get('/users/me');
    expect(userController.getMe).toHaveBeenCalled();
  });

  it('PUT /users/me/settings -> actualizar_settings (con middlewares)', async () => {
    // Este verifica que pase por los mocks de multer/resize y llegue al controlador
    await request(app).put('/users/me/settings');
    expect(userController.actualizar_settings).toHaveBeenCalled();
  });

  // --- Búsqueda ---
  it('GET /users/search/user -> searchUser', async () => {
    await request(app).get('/users/search/user');
    expect(userController.searchUser).toHaveBeenCalled();
  });

  // --- Likes ---
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

  // --- Historial ---
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

  it('PUT /users/me/history/rating -> updateHistoryRating', async () => {
    await request(app).put('/users/me/history/rating');
    expect(userController.updateHistoryRating).toHaveBeenCalled();
  });

  // --- Amigos ---
  it('GET /users/friends/list -> getFriendsList', async () => {
    await request(app).get('/users/friends/list');
    expect(userController.getFriendsList).toHaveBeenCalled();
  });

  it('PUT /users/friends/add -> addFriend', async () => {
    await request(app).put('/users/friends/add');
    expect(userController.addFriend).toHaveBeenCalled();
  });

  it('GET /users/friends/requests -> getFriendRequests', async () => {
    await request(app).get('/users/friends/requests');
    expect(userController.getFriendRequests).toHaveBeenCalled();
  });

  // --- Por ID (Otras) ---
  it('GET /users/:id -> getUserById', async () => {
    await request(app).get('/users/12345');
    expect(userController.getUserById).toHaveBeenCalled();
  });
});