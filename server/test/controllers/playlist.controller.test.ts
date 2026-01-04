import { 
  createPlaylist, getPlaylistById, addSongToPlaylist, 
  sharePlaylistWithUser, unsharePlaylistWithUser,
  updatePlaylist, updatePlaylistCover, deletePlaylist, 
  deletePlaylistCover, removeSongFromPlaylist, getPlaylists 
} from '../../src/controllers/playlist_controller';

import Playlist from "../../src/models/playlist_model";
import Song from "../../src/models/song_model";
import User from "../../src/models/user_model";
import Notification from "../../src/models/notification_model";
import { Request, Response } from 'express';
import fs from 'fs';
import mongoose from 'mongoose';

// --- MOCKS ---
jest.mock("../../src/models/playlist_model");
jest.mock("../../src/models/song_model");
jest.mock("../../src/models/user_model");
jest.mock("../../src/models/notification_model");

jest.mock('fs', () => ({
  unlink: jest.fn((path, callback) => callback(null)), 
}));

describe('Playlist Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  
  // IDs reales
  const userId = new mongoose.Types.ObjectId(); 
  const otherUserId = new mongoose.Types.ObjectId();
  const playlistId = new mongoose.Types.ObjectId();
  const songId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: { id: userId.toString() } 
    } as any;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  /**
   * TEST: createPlaylist
   */
  describe('createPlaylist', () => {
    it('debería crear una playlist exitosamente (201)', async () => {
      req.body = { name_: 'Mi Playlist', isPublic_: true };
      
      const mockSave = jest.fn().mockResolvedValue({ 
        _id: playlistId, 
        ...req.body 
      });
      
      (Playlist as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave
      }));

      await createPlaylist(req as Request, res as Response);

      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Playlist creada correctamente"
      }));
    });

    it('debería retornar 401 si no hay usuario', async () => {
      (req as any).user = undefined;
      await createPlaylist(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  /**
   * TEST: getPlaylistById (CORREGIDO)
   */
  describe('getPlaylistById', () => {
    it('debería obtener una playlist pública exitosamente', async () => {
      req.params = { id: playlistId.toString() };

      const mockPlaylist = {
        _id: playlistId,
        isPublic_: true,
        owner_: { _id: otherUserId, toString: () => otherUserId.toString() },
        owner_group_: []
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(), 
        then: (resolve: any) => resolve(mockPlaylist) 
      };
        
      (Playlist.findById as jest.Mock).mockReturnValue(mockQuery);

      await getPlaylistById(req as Request, res as Response);

      expect(Playlist.findById).toHaveBeenCalledWith(playlistId.toString());
      expect(res.json).toHaveBeenCalledWith(mockPlaylist);
    });

    it('debería denegar acceso (403) a playlist privada si no eres dueño', async () => {
      req.params = { id: playlistId.toString() };

      const mockPlaylist = {
        _id: playlistId,
        isPublic_: false, // Privada
        owner_: { _id: otherUserId, toString: () => otherUserId.toString() }, // Dueño diferente
        owner_group_: []
      };

      // Usamos la misma técnica del mockQuery inteligente
      const mockQuery = {
          populate: jest.fn().mockReturnThis(),
          then: (resolve: any) => resolve(mockPlaylist)
      };
      (Playlist.findById as jest.Mock).mockReturnValue(mockQuery);

      await getPlaylistById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Acceso denegado: playlist privada" }));
    });
  });

  /**
   * TEST: addSongToPlaylist
   */
  describe('addSongToPlaylist', () => {
    it('debería crear una canción nueva y añadirla a la playlist', async () => {
      req.body = { youtube_url: 'http://yt.com/abc', song_title: 'Test Song' };
      req.params = { id: playlistId.toString() };
      
      const mockPlaylist = {
        _id: playlistId,
        owner_: userId,
        songs_: [],
        isPublic_: false,
        save: jest.fn().mockResolvedValue(true)
      };
      (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

      (Song.findOne as jest.Mock).mockResolvedValue(null);

      const mockSongSave = jest.fn().mockResolvedValue({ 
        _id: songId, 
        title_: 'Test Song' 
      });
      
      (Song as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSongSave,
        _id: songId
      }));

      await addSongToPlaylist(req as Request, res as Response);
        
      expect(Playlist.findById).toHaveBeenCalled();
      expect(mockSongSave).toHaveBeenCalled(); 
      expect(mockPlaylist.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  /**
   * TEST: removeSongFromPlaylist
   */
  describe('removeSongFromPlaylist', () => {
    it('debería eliminar una canción exitosamente si el usuario es el DUEÑO', async () => {
      req.params = { id: playlistId.toString(), songId: songId.toString() };

      const mockPlaylist = {
        _id: playlistId,
        owner_: userId, // El dueño es el usuario actual
        owner_group_: [],
        songs_: [songId], // La canción está en la lista
        save: jest.fn().mockResolvedValue(true)
      };

      (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

      await removeSongFromPlaylist(req as Request, res as Response);

      expect(Playlist.findById).toHaveBeenCalledWith(playlistId.toString());
      // Verificamos que la canción ya no esté en el array
      expect(mockPlaylist.songs_).not.toContain(songId);
      expect(mockPlaylist.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        message: "Canción eliminada correctamente" 
      }));
    });

    it('debería eliminar una canción exitosamente si el usuario es COLABORADOR', async () => {
      req.params = { id: playlistId.toString(), songId: songId.toString() };

      const mockPlaylist = {
        _id: playlistId,
        owner_: otherUserId, // El dueño es otro
        owner_group_: [userId], // Pero el usuario actual está en el grupo
        songs_: [songId],
        save: jest.fn().mockResolvedValue(true)
      };

      (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

      await removeSongFromPlaylist(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockPlaylist.save).toHaveBeenCalled();
    });

    it('debería retornar 403 si el usuario NO tiene permiso', async () => {
      req.params = { id: playlistId.toString(), songId: songId.toString() };

      (Playlist.findById as jest.Mock).mockResolvedValue({
        owner_: otherUserId, // No es dueño
        owner_group_: []      // No es colaborador
      });

      await removeSongFromPlaylist(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        message: "No tienes permiso para modificar esta playlist" 
      });
    });

    it('debería retornar 404 si la playlist no existe', async () => {
      req.params = { id: 'id-inexistente' };
      (Playlist.findById as jest.Mock).mockResolvedValue(null);

      await removeSongFromPlaylist(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Playlist no encontrada" });
    });

    it('debería retornar 500 si ocurre un error de base de datos', async () => {
      req.params = { id: playlistId.toString() };
      // Forzamos un error en la búsqueda
      (Playlist.findById as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await removeSongFromPlaylist(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        message: "Error al eliminar la canción" 
      }));
    });
  });
  /**
   * TEST: sharePlaylistWithUser
   */
  describe('sharePlaylistWithUser', () => {
    it('debería compartir playlist y crear una notificación exitosamente', async () => {
      req.body = { target: 'friend@test.com' };
      req.params = { id: playlistId.toString() };
      
      const targetUserId = new mongoose.Types.ObjectId(); 

      const mockPlaylist = {
        _id: playlistId,
        name_: 'Mi Playlist',
        owner_: userId, 
        owner_group_: [],
        save: jest.fn().mockResolvedValue(true)
      };
      (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

      const mockUserFound = {
        _id: targetUserId,
        username_: 'friendUser',
        email_: 'friend@test.com'
      };
      (User.findOne as jest.Mock).mockResolvedValue(mockUserFound);
      
      // Mock de la creación de notificación
      (Notification.create as jest.Mock).mockResolvedValue({});

      await sharePlaylistWithUser(req as Request, res as Response);

      // Verificaciones básicas
      expect(mockPlaylist.owner_group_).toContain(targetUserId);
      expect(mockPlaylist.save).toHaveBeenCalled();
      
      // VERIFICACIÓN DE LA NOTIFICACIÓN
      expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
        senderId_: userId.toString(),
        receiverId_: targetUserId,
        type_: 'playlist_share',
        message_: expect.stringContaining('Mi Playlist')
      }));

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('friendUser')
      }));
    });

    it('debería compartir la playlist incluso si la notificación falla (silenciosamente)', async () => {
      req.body = { target: 'friend@test.com' };
      req.params = { id: playlistId.toString() };
      
      const targetUserId = new mongoose.Types.ObjectId();
      const mockPlaylist = {
        _id: playlistId,
        owner_: userId,
        owner_group_: [],
        save: jest.fn().mockResolvedValue(true)
      };

      // 1. Mocks necesarios para que el flujo llegue a la notificación
      (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (User.findOne as jest.Mock).mockResolvedValue({ _id: targetUserId, username_: 'User' });
      
      // 2. Silenciamos el error para que la consola salga limpia
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Simulamos el fallo de la base de datos de notificaciones
      (Notification.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await sharePlaylistWithUser(req as Request, res as Response);

      // 3. Verificaciones
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockPlaylist.save).toHaveBeenCalled(); // <-- Importante: Verificar que sí se guardó el cambio
      expect(consoleSpy).toHaveBeenCalled(); // <-- Opcional: Verificar que el código REALMENTE pasó por el catch y llamó al log

      // Restauramos el console.error original
      consoleSpy.mockRestore();
    });

    it('debería dar error si intenta compartirse a sí mismo', async () => {
      req.body = { target: 'yo' };
      req.params = { id: playlistId.toString() };
      
      (Playlist.findById as jest.Mock).mockResolvedValue({ owner_: userId });
      (User.findOne as jest.Mock).mockResolvedValue({ _id: userId });

      await sharePlaylistWithUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        message: "No puedes compartir la playlist contigo mismo" 
      }));
    });

    it('debería retornar 400 si el usuario ya tiene acceso', async () => {
        const targetUserId = new mongoose.Types.ObjectId();
        req.body = { target: 'already@shared.com' };
        req.params = { id: playlistId.toString() };

        (Playlist.findById as jest.Mock).mockResolvedValue({
            owner_: userId,
            owner_group_: [targetUserId] // Ya está en el grupo
        });
        (User.findOne as jest.Mock).mockResolvedValue({ _id: targetUserId });

        await sharePlaylistWithUser(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "El usuario ya tiene acceso a esta playlist" 
        }));
    });
  });

  /**
   * TEST: unsharePlaylistWithUser
   */
  describe('unsharePlaylistWithUser', () => {
    const targetEmail = 'remover@test.com';

    it('debería revocar el acceso a un usuario exitosamente (200)', async () => {
      req.params = { id: playlistId.toString() };
      req.body = { target: targetEmail };

      const mockUserToUnshare = {
        _id: otherUserId,
        username_: 'usuarioRemovido',
        email_: targetEmail
      };

      const mockUpdatedPlaylist = {
        _id: playlistId,
        name_: 'Playlist compartida',
        owner_: userId
      };

      // 1. Mock encontrar al usuario
      (User.findOne as jest.Mock).mockResolvedValue(mockUserToUnshare);
      
      // 2. Mock actualizar la playlist (findOneAndUpdate)
      (Playlist.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedPlaylist);
      
      // 3. Mock crear notificación
      (Notification.create as jest.Mock).mockResolvedValue({});

      await unsharePlaylistWithUser(req as Request, res as Response);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [{ email_: targetEmail }, { username_: targetEmail }]
      });
      expect(Playlist.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: playlistId.toString(), owner_: userId.toString() },
        { $pull: { owner_group_: otherUserId } },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: `Acceso revocado para ${mockUserToUnshare.username_}`
      }));
    });

    it('debería retornar 400 si no se proporciona el target', async () => {
      req.body = { target: undefined };
      
      await unsharePlaylistWithUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Faltan datos (usuario a eliminar)" });
    });

    it('debería retornar 404 si el usuario a eliminar no existe', async () => {
      req.body = { target: 'no-existe' };
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await unsharePlaylistWithUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Usuario a eliminar no encontrado" });
    });

    it('debería retornar 404 si la playlist no existe o el usuario no es el dueño', async () => {
      req.params = { id: playlistId.toString() };
      req.body = { target: targetEmail };

      (User.findOne as jest.Mock).mockResolvedValue({ _id: otherUserId });
      // Simulamos que findOneAndUpdate no encuentra nada (porque el ID no existe o no eres el owner_)
      (Playlist.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await unsharePlaylistWithUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Playlist no encontrada o no tienes permiso" });
    });
  });
  /**
   * TEST: updatePlaylist
   */
  describe('updatePlaylist', () => {
    it('debería actualizar campos de la playlist si es el dueño', async () => {
        req.params = { id: playlistId.toString() };
        req.body = { name_: 'Nuevo Nombre', isPublic_: false };

        // Mock de la playlist existente
        const mockPlaylist = {
            _id: playlistId,
            owner_: userId, // Mismo usuario
            isPublic_: true
        };
        (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

        // Mock de la actualización
        const mockUpdated = { ...mockPlaylist, name_: 'Nuevo Nombre' };
        (Playlist.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdated);

        await updatePlaylist(req as Request, res as Response);

        expect(Playlist.findById).toHaveBeenCalledWith(playlistId.toString());
        // Verificamos que se llame a update con los campos correctos
        expect(Playlist.findByIdAndUpdate).toHaveBeenCalledWith(
            playlistId.toString(),
            expect.objectContaining({ name_: 'Nuevo Nombre', isPublic_: false }),
            { new: true }
        );
        expect(res.json).toHaveBeenCalledWith({ message: "Playlist actualizada", playlist: mockUpdated });
    });

    it('debería denegar actualización (403) si es privada y no es dueño', async () => {
        req.params = { id: playlistId.toString() };
        req.body = { name_: 'Hacker Edit' };

        const mockPlaylist = {
            _id: playlistId,
            owner_: otherUserId, // Otro usuario
            isPublic_: false     // Privada
        };
        (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

        await updatePlaylist(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(Playlist.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  /**
   * TEST: updatePlaylistCover
   */
  describe('updatePlaylistCover', () => {
    it('debería actualizar la portada si se sube un archivo', async () => {
      req.params = { id: playlistId.toString() };
      // Simulamos el archivo que Multer habría procesado
      req.file = { filename: 'nueva_portada.jpg' } as any;

      const mockUpdated = { _id: playlistId, cover_: 'http://localhost:3000/uploads/nueva_portada.jpg' };
      (Playlist.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdated);

      await updatePlaylistCover(req as Request, res as Response);

      expect(Playlist.findByIdAndUpdate).toHaveBeenCalledWith(
        playlistId.toString(),
        expect.objectContaining({ cover_: expect.stringContaining('nueva_portada.jpg') }),
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(mockUpdated);
    });

    it('debería retornar 400 si no se sube ningún archivo', async () => {
      req.params = { id: playlistId.toString() };
      req.file = undefined; // Sin archivo

      await updatePlaylistCover(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "No se subió ningún archivo de imagen" });
    });
  });

  /**
   * TEST: deletePlaylistCover
   */
  describe('deletePlaylistCover', () => {
    it('debería eliminar el archivo físico y limpiar el campo cover_ en BD', async () => {
      req.params = { id: playlistId.toString() };

      const mockPlaylist = {
        _id: playlistId,
        owner_: userId,
        cover_: 'http://localhost:3000/uploads/antigua.jpg',
        save: jest.fn().mockResolvedValue(true)
      };
      (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

      await deletePlaylistCover(req as Request, res as Response);

      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('antigua.jpg'), 
        expect.any(Function) 
      );

      expect(mockPlaylist.cover_).toBe("");
      expect(mockPlaylist.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockPlaylist);
    });

    it('debería denegar (403) si no es el dueño', async () => {
      req.params = { id: playlistId.toString() };

      const mockPlaylist = {
        _id: playlistId,
        owner_: otherUserId,
        cover_: 'url'
      };
      (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

      await deletePlaylistCover(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });

  /**
   * TEST: deletePlaylist
   */
  describe('deletePlaylist', () => {
    it('debería eliminar la playlist si el usuario es el dueño', async () => {
      req.params = { id: playlistId.toString() };

      // Mock de la playlist encontrada
      const mockPlaylist = {
          _id: playlistId,
          owner_: userId, // El dueño coincide con req.user.id
          deleteOne: jest.fn().mockResolvedValue(true) // Importante: Mock de deleteOne
      };
      
      (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

      await deletePlaylist(req as Request, res as Response);

      expect(Playlist.findById).toHaveBeenCalledWith(playlistId.toString());
      // Verificamos que se llamó a la función de borrado del documento
      expect(mockPlaylist.deleteOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: "Playlist eliminada correctamente" });
    });

    it('debería denegar eliminación (403) si no es el dueño', async () => {
      req.params = { id: playlistId.toString() };

      const mockPlaylist = {
        _id: playlistId,
        owner_: otherUserId, // Otro usuario diferente
        deleteOne: jest.fn()
      };
      
      (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

      await deletePlaylist(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "No tienes permiso para eliminar esta playlist" }));
      // Aseguramos que NO se borró
      expect(mockPlaylist.deleteOne).not.toHaveBeenCalled();
    });

    it('debería retornar 404 si la playlist no existe', async () => {
      req.params = { id: playlistId.toString() };

      // Simulamos que no encuentra nada
      (Playlist.findById as jest.Mock).mockResolvedValue(null);

      await deletePlaylist(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Playlist no encontrada" }));
    });
  });
});