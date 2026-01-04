import { 
  registerUser, getUserById, getUsers, searchUser, searchUserFriends,
  getMe, deleteUser,                 
  addFriend, acceptFriendRequest, rejectFriendRequest, removeFriend, getFriendsList, getFriendRequests, 
  getFriendsLastSong, actualizar_settings, 
  addToHistory, getHistory, clearHistory, 
  addLikedSong, removeLikedSong, getLikedSongs, 
  getPreferences, actualizarPreferences,          
  getFotoPerfil, getProfilePictureById,
  sendSongRecommendation, getMyRecommendations, deleteRecommendation 
} from '../../src/controllers/user_controller';
import User from "../../src/models/user_model";
import Song from "../../src/models/song_model";
import Notification from "../../src/models/notification_model";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import { Request, Response } from 'express';
import mongoose from 'mongoose';

// --- MOCKS ---
jest.mock("../../src/models/user_model");
jest.mock("../../src/models/song_model");
jest.mock("../../src/models/notification_model"); // Vital para addFriend
jest.mock("bcryptjs");
jest.mock("fs/promises");

describe('User Controller Unit Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  // IDs reales para evitar CastErrors
  const userId = new mongoose.Types.ObjectId();
  const friendId = new mongoose.Types.ObjectId();
  const songId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: userId.toString() } // Simulamos token decodificado
    } as any;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendFile: jest.fn(),
      setHeader: jest.fn()
    };
    
    jest.clearAllMocks();
  });

  /**
   * 1. TEST: Registro
   */
  describe('registerUser', () => {
    it('debería registrar usuario y hashear password', async () => {
      req.body = { username_: 'NewUser', email_: 'new@mail.com', password_: '123456' };
      
      (User.findOne as jest.Mock).mockResolvedValue(null); // No existe
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pass');

      const mockSave = jest.fn().mockResolvedValue({ 
        _id: userId, 
        username_: 'NewUser', 
        email_: 'new@mail.com' 
      });
      
      (User as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave
      }));

      await registerUser(req as Request, res as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  /**
   * 2. TEST: getUsers y getUserById
   */
  describe('getUsers (Devuelve todos)', () => {
    it('debería devolver usuarios formateados', async () => {
      const mockUsers = [{ 
        _id: userId, username_: 'User1', friends_: [], likedSongs_: [] 
      }];
      
      // Mock de populate encadenado
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve(mockUsers) // Para simular el await final
      };
      
      (User.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      await getUsers(req as Request, res as Response);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ username_: 'User1' })
      ]));
    });

    it('getUserById debería devolver un usuario si existe', async () => {
      req.params = { id: userId.toString() };
      const mockUser = { _id: userId, username_: 'User1' };

      // Mock de populate encadenado
      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockUser)
        })
      });

      await getUserById(req as Request, res as Response);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });
  });

  /**
   * 3. TEST: searchUsers y searchUserFriends
   */
  describe('searchUser y searchUserFriends', () => {
    it('searchUser debería filtrar y excluirse a sí mismo', async () => {
      req.query = { query: 'test' };
      const mockSelect = jest.fn().mockResolvedValue([{ username_: 'TestUser' }]);
      const mockCollation = jest.fn().mockReturnValue({ select: mockSelect });
      (User.find as jest.Mock).mockReturnValue({ collation: mockCollation });

      await searchUser(req as Request, res as Response);

      expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ _id: { $ne: userId.toString() } }));
      expect(res.json).toHaveBeenCalledWith({ users: expect.any(Array) });
    });

    it('searchUserFriends debería buscar solo dentro de la lista de amigos', async () => {
      req.query = { query: 'amigo' };
      const mockFriendsIds = [new mongoose.Types.ObjectId()];
      // Mock de encontrar al usuario actual para ver su lista de amigos
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ friends_: mockFriendsIds })
      });
      // Mock de búsqueda de amigos
      const mockSelect = jest.fn().mockResolvedValue([{ username_: 'MiAmigo' }]);
      const mockCollation = jest.fn().mockReturnValue({ select: mockSelect });
      (User.find as jest.Mock).mockReturnValue({ collation: mockCollation });

      await searchUserFriends(req as Request, res as Response);

      expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ _id: { $in: mockFriendsIds } }));
      expect(res.json).toHaveBeenCalledWith({ users: expect.any(Array) });
    });
  });

  /**
   * 4. TEST: Funciones de Usuario Autenticado (getMe, deleteUser, Settings)
   */
  describe('Funciones de autenticacion de usuario', () => {
    it('actualizar_settings debería borrar imagen antigua si se sube una nueva', async () => {
      req.user = { id: userId.toString() };
      req.file = { filename: 'nueva.jpg' } as any;

      const mockUser = { 
        _id: userId,
        profilePictureUrl_: '/assets/profiles/vieja.jpg' 
      };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...mockUser, profilePictureUrl_: '/assets/profiles/nueva.jpg' });

      await actualizar_settings(req as any, res as Response);

      expect(fs.unlink).toHaveBeenCalled(); // Se borró la vieja
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        userId.toString(),
        expect.objectContaining({ $set: expect.objectContaining({ profilePictureUrl_: '/assets/profiles/nueva.jpg' }) }),
        expect.any(Object)
      );
    });

    it('getMe debería devolver el perfil del usuario', async () => {
      const mockUser = { _id: userId, username_: 'Yo' };
      // Mock de select
      (User.findById as jest.Mock).mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser)
      });

      await getMe(req as Request, res as Response);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('deleteUser debería eliminar el usuario', async () => {
      (User.findByIdAndDelete as jest.Mock).mockResolvedValue({ _id: userId });
      await deleteUser(req as Request, res as Response);
      expect(User.findByIdAndDelete).toHaveBeenCalledWith(userId.toString());
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Usuario eliminado correctamente" }));
    });
  });

  /**
   * 5. TEST: Foto de perfil
   */
  describe('Test de Fotos de Perfil', () => {
    it('getFotoPerfil debería devolver el archivo si existe fisicamente', async () => {
      const mockUser = { profilePictureUrl_: '/assets/profiles/foto.jpg' };
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });
      
      // Simulamos que el archivo SÍ existe
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      await getFotoPerfil(req as Request, res as Response);

      expect(fs.access).toHaveBeenCalled();
      expect(res.sendFile).toHaveBeenCalledWith(expect.stringContaining('foto.jpg'));
    });

    it('getFotoPerfil debería devolver default si fs.access falla', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ profilePictureUrl_: '/fake.jpg' })
      });
      // Simulamos que no existe
      (fs.access as jest.Mock).mockRejectedValue(new Error('No existe'));

      await getFotoPerfil(req as Request, res as Response);

      expect(res.sendFile).toHaveBeenCalledWith(expect.stringContaining('perfil.png'));
    });

    it('getProfilePictureById debería devolver imagen de otro usuario', async () => {
      req.params = { id: friendId.toString() };
      const mockUser = { profilePictureUrl_: '/assets/other.jpg' };
      (User.findById as jest.Mock).mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser)
      });
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      await getProfilePictureById(req as Request, res as Response);
      expect(res.sendFile).toHaveBeenCalledWith(expect.stringContaining('other.jpg'));
    });
  });

  /**
   * 6. TEST: Preferencias
   */
  describe('getPreferences', () => {
    it('debería inicializar preferencias por defecto si no existen', async () => {
      const mockUser = { 
        preferences_: undefined, 
        save: jest.fn() 
      };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await getPreferences(req as Request, res as Response);

      expect(mockUser.preferences_).toBeDefined(); // Se creó
      expect(mockUser.save).toHaveBeenCalled(); // Se guardó
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ privateSession: false }));
    });

    it('actualizarPreferences debería guardar nuevos valores', async () => {
      req.body = { privateSession: true };
      const mockUser = { 
        preferences_: { privateSession: false, showFriendActivity: true }, 
        save: jest.fn() 
      };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await actualizarPreferences(req as Request, res as Response);
      
      expect(mockUser.preferences_.privateSession).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  /**
   * 7. TEST: Amigos (Solicitudes, Listas, Acciones)
   */
  describe('Variedad de test de lógica de amigos', () => {
    it('addFriend debería enviar solicitud y crear NOTIFICACIÓN', async () => {
      req.body = { friendId: friendId.toString() };
      // En el test addFriend:
      const mockMe = { 
        _id: userId, 
        username_: 'MiUsuario', 
        friends_: [], 
        save: jest.fn() 
      };
      const mockFriend = { 
        _id: friendId, 
        friends_: [], 
        friendRequests_: [], 
        save: jest.fn() 
      };

      // Mock dinámico de findById
      (User.findById as jest.Mock).mockImplementation((id) => {
        if (id.toString() === userId.toString()) return Promise.resolve(mockMe);
        if (id.toString() === friendId.toString()) return Promise.resolve(mockFriend);
        return Promise.resolve(null);
      });

      await addFriend(req as Request, res as Response);

      // Verificaciones
      expect(mockFriend.friendRequests_).toContain(mockMe._id);
      expect(mockFriend.save).toHaveBeenCalled();
      
      expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
        senderId_: expect.stringMatching(userId.toString()),
        receiverId_: expect.stringMatching(friendId.toString()),
        type_: 'friend_request'
      }));

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Solicitud de amistad enviada" }));
    });

    it('addFriend debería aceptar MUTUAMENTE si ya había solicitud inversa', async () => {
      req.body = { friendId: friendId.toString() };

      const mockMe = { 
        _id: userId, 
        username_: 'Yo',
        friends_: [], 
        friendRequests_: [friendId], // YA tengo solicitud de él
        save: jest.fn() 
      };
      const mockFriend = { 
        _id: friendId, 
        friends_: [], 
        friendRequests_: [], 
        save: jest.fn() 
      };

      (User.findById as jest.Mock).mockImplementation((id) => {
        if (id.toString() === userId.toString()) return Promise.resolve(mockMe);
        if (id.toString() === friendId.toString()) return Promise.resolve(mockFriend);
        return Promise.resolve(null);
      });

      await addFriend(req as Request, res as Response);

      // Deben ser amigos directos
      expect(mockMe.friends_).toContain(mockFriend._id);
      expect(mockFriend.friends_).toContain(mockMe._id);
      
      // Notificación de aceptación automática
      expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
          type_: 'friend_accept'
      }));

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Solicitud mutua aceptada. Ya sois amigos." }));
    });

    it('acceptFriendRequest debería aceptar y crear notificación', async () => {
      req.body = { requesterId: friendId.toString() };
      const mockMe = { _id: userId, username_: 'Yo', friends_: [], friendRequests_: [friendId], save: jest.fn() };
      const mockFriend = { _id: friendId, friends_: [], save: jest.fn() };

      (User.findById as jest.Mock).mockImplementation((id) => {
        if (id.toString() === userId.toString()) return Promise.resolve(mockMe);
        if (id.toString() === friendId.toString()) return Promise.resolve(mockFriend);
        return null;
      });

      await acceptFriendRequest(req as Request, res as Response);

      expect(mockMe.friends_).toContain(mockFriend._id);
      expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ type_: 'friend_accept' }));
    });

    it('rejectFriendRequest debería eliminar solicitud', async () => {
      req.body = { requesterId: friendId.toString() };
      const mockMe = { _id: userId, friendRequests_: [friendId], save: jest.fn() };
      (User.findById as jest.Mock).mockResolvedValue(mockMe);

      await rejectFriendRequest(req as Request, res as Response);

      expect(mockMe.friendRequests_).not.toContain(friendId);
      expect(Notification.findOneAndDelete).toHaveBeenCalled();
    });

    it('removeFriend debería eliminarse de ambas listas', async () => {
      req.body = { friendId: friendId.toString() };
      const mockMe = { _id: userId, friends_: [friendId.toString()], save: jest.fn() };
      const mockFriend = { _id: friendId, friends_: [userId.toString()], save: jest.fn() };

      (User.findById as jest.Mock).mockImplementation((id) => {
        if (id.toString() === userId.toString()) return Promise.resolve(mockMe);
        if (id.toString() === friendId.toString()) return Promise.resolve(mockFriend);
        return null;
      });

      await removeFriend(req as Request, res as Response);
      expect(mockMe.friends_.length).toBe(0); 
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Amigo eliminado correctamente" }));
    });

    it('getFriendsList debería devolver array de amigos', async () => {
      const mockUser = { friends_: ['Amigo1', 'Amigo2'] };
      (User.findById as jest.Mock).mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockUser)
      });
      await getFriendsList(req as Request, res as Response);
      expect(res.json).toHaveBeenCalledWith(['Amigo1', 'Amigo2']);
    });

    it('getFriendRequests debería devolver array de solicitudes', async () => {
      const mockUser = { friendRequests_: ['Req1'] };
      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });
      await getFriendRequests(req as Request, res as Response);
      expect(res.json).toHaveBeenCalledWith(['Req1']);
    });
  });

  /**
   * 8. TEST: Operaciones CRUD de historial
   */
  describe('Operaciones CRUD de historial', () => {
    it('addToHistory debería añadir entrada al historial si se proporciona songId', async () => {
      // Setup
      req.body = { songId: songId.toString() };
      const mockUser = { 
        _id: userId, 
        history_: [] as any[], 
        save: jest.fn().mockResolvedValue(true) 
      };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      // Ejecución
      await addToHistory(req as Request, res as Response);

      // Verificaciones
      expect(mockUser.history_).toHaveLength(1);
      // Verificamos que el ID guardado sea el correcto (usando toString para evitar líos de tipos)
      expect(mockUser.history_[0].songId.toString()).toBe(songId.toString());
      expect(mockUser.history_[0]).not.toHaveProperty('rating'); 
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        message: "Historial actualizado" 
      }));
    });

    it('addToHistory debería crear una canción nueva si no existe y viene de YouTube', async () => {
      // Setup
      req.body = { 
        youtubeURL_: 'https://youtube.com/v=abc', 
        title_: 'New Song',
        thumbnailURL_: 'http://thumb.jpg'
      };
      const mockUser = { 
        history_: [] as any[], 
        save: jest.fn().mockResolvedValue(true) // Importante mockear el save del usuario también
      };
      
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Song.findOne as jest.Mock).mockResolvedValue(null); // La canción no existe
      
      const mockSongSave = jest.fn().mockResolvedValue({ _id: songId });
      (Song as unknown as jest.Mock).mockImplementation(() => ({ 
        save: mockSongSave, 
        _id: songId 
      }));

      // Ejecución
      await addToHistory(req as Request, res as Response);

      // Verificaciones
      expect(Song.findOne).toHaveBeenCalledWith({ youtubeURL_: 'https://youtube.com/v=abc' });
      expect(mockSongSave).toHaveBeenCalled(); // Se guardó la canción nueva
      expect(mockUser.save).toHaveBeenCalled(); // Se actualizó el usuario
      expect(mockUser.history_[0].songId).toEqual(songId);
    });

    it('getHistory debería devolver historial ordenado', async () => {
      const dateOld = new Date('2023-01-01');
      const dateNew = new Date('2024-01-01');
      const mockUser = {
        history_: [
          { songId: 's1', listenedAt: dateOld },
          { songId: 's2', listenedAt: dateNew }
        ]
      };
      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      await getHistory(req as Request, res as Response);
      const result = (res.json as jest.Mock).mock.calls[0][0].history;
      expect(result[0].song).toBe('s2'); // Nueva primero
      expect(result[1].song).toBe('s1'); // Vieja después
      expect(result).toHaveLength(2);

    });


    it('clearHistory debería vaciar el array', async () => {
      const mockUser = { history_: ['algo'], save: jest.fn() };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await clearHistory(req as Request, res as Response);
      expect(mockUser.history_).toHaveLength(0);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  /**
   * 9. TEST: Liked Songs CRUD
   */
  describe('Liked Songs Management', () => {
    it('getLikedSongs debería devolver array populado', async () => {
      const mockUser = { likedSongs_: ['Song1'] };
      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });
      await getLikedSongs(req as Request, res as Response);
      expect(res.json).toHaveBeenCalledWith({ likedSongs: ['Song1'] });
    });

    it('addLikedSong debería añadir evitando duplicados', async () => {
      req.body = { _id: songId.toString() };
      const mockUser = { likedSongs_: [], save: jest.fn() };
      const mockSong = { _id: songId, title_: 'Song' };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Song.findById as jest.Mock).mockResolvedValue(mockSong);

      await addLikedSong(req as Request, res as Response);

      expect(mockUser.likedSongs_).toContain(songId);
    });

    it('removeLikedSong debería quitar la canción', async () => {
      req.params = { songId: songId.toString() };
      // El usuario tiene esa canción en favoritos
      const mockUser = { 
        likedSongs_: [songId], 
        save: jest.fn() 
      };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await removeLikedSong(req as Request, res as Response);
      
      expect(mockUser.likedSongs_).not.toContain(songId);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Canción eliminada de favoritos" }));
    });
  });

  /**
   * 10. TEST: Recomendar canción a un amigo
   */
  describe('Recomendaciones entre usuarios', () => {
    it('sendSongRecommendation debería guardar recomendación en el amigo y notificarle', async () => {
      req.body = { 
        friendId: friendId.toString(), 
        songData: { youtubeUrl: 'http://yt', title: 'Rec' }, 
        message: 'Escucha esto' 
      };
      
      const mockSong = { _id: songId, title_: 'Rec', youtubeURL_: 'http://yt' };
      (Song.findOne as jest.Mock).mockResolvedValue(mockSong);
    
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await sendSongRecommendation(req as Request, res as Response);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        friendId.toString(),
        expect.objectContaining({ $push: expect.anything() })
      );

      // Verificamos notificación
      expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
        type_: 'song_recommendation',
        receiverId_: friendId.toString()
      }));

      expect(res.json).toHaveBeenCalled();
    });

    it('getMyRecommendations debería devolver array ordenado', async () => {
      const recs = [
        { receivedAt_: new Date('2023-01-01') },
        { receivedAt_: new Date('2024-01-01') }
      ];
      const mockUser = { recommendations_: recs };
      
      // Mock populate encadenado
      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockUser)
        })
      });

      await getMyRecommendations(req as Request, res as Response);
      
      // Verifica que se llamó a res.json con el array 
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result).toHaveLength(2);
    });

    it('deleteRecommendation debería eliminar del array', async () => {
      req.params = { recId: 'rec123' };
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await deleteRecommendation(req as Request, res as Response);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        userId.toString(),
        expect.objectContaining({ $pull: { recommendations_: { _id: 'rec123' } } })
      );
      expect(res.json).toHaveBeenCalledWith({ message: "Recomendación eliminada" });
    });
  });

  /**
   * 11. TEST: Actividad de Amigos (Privacidad)
   */
  describe('getFriendsLastSong', () => {
    it('debería ocultar actividad si el amigo tiene privateSession: true', async () => {
      const mockUser = {
        preferences_: { showFriendActivity: true },
        friends_: [
          {
            _id: friendId,
            username_: 'AmigoPrivado',
            history_: [{ songId: songId, listenedAt: new Date() }],
            preferences_: { privateSession: true } 
          }
        ]
      };

      // Usamos mockResolvedValue porque el controlador espera una Promesa tras el primer populate
      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      await getFriendsLastSong(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          username: 'AmigoPrivado',
          lastSong: null
        })
      ]));
    });

    it('debería mostrar actividad si la privacidad lo permite', async () => {
      const mockUser = {
        preferences_: { showFriendActivity: true },
        friends_: [
          {
            _id: friendId,
            username_: 'AmigoPublico',
            history_: [{ 
                songId: { _id: songId, title_: 'Hit' }, 
                listenedAt: new Date(), 
                rating: 5 
            }],
            preferences_: { privateSession: false } 
          }
        ]
      };

      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      await getFriendsLastSong(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          username: 'AmigoPublico',
          lastSong: expect.objectContaining({ title: 'Hit' })
        })
      ]));
    });
  });
});