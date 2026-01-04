import { createMeNotification, createNotification, getMyNotifications, getsenderNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } from '../../src/controllers/notification_controller'; 
import Notification from "../../src/models/notification_model";
import { Request, Response } from 'express';
import mongoose from 'mongoose';

// --- MOCKS ---
jest.mock("../../src/models/notification_model");

describe('Notification Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  const userId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();
  const notificationId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: { id: userId } // Simulamos usuario autenticado
    } as any;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    jest.clearAllMocks();
    
    // Silenciamos console.error para que los tests de error 500 no ensucien la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. Test de creación de notificaciones
  describe('createMeNotification', () => {
    it('debería crear una notificación usando req.user.id como sender', async () => {
      req.body = { receiverId_: otherUserId, type_: 'info', message_: 'Hola', data_: {} };
      
      const mockSavedNotification = { _id: 'new_id', ...req.body, senderId_: userId };
      (Notification.create as jest.Mock).mockResolvedValue(mockSavedNotification);

      await createMeNotification(req as Request, res as Response);

      expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
        senderId_: userId,
        receiverId_: otherUserId,
        message_: 'Hola'
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSavedNotification);
    });

    it('Errores (500)', async () => {
      (Notification.create as jest.Mock).mockRejectedValue(new Error('DB Error'));
      await createMeNotification(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createNotification', () => {
    it('debería crear una notificación con datos explícitos', async () => {
      req.body = { 
        senderId_: userId, 
        receiverId_: otherUserId, 
        type_: 'alert', 
        message_: 'Alerta', 
        data_: null 
      };
      
      (Notification.create as jest.Mock).mockResolvedValue(req.body);

      await createNotification(req as Request, res as Response);

      expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
        senderId_: userId,
        message_: 'Alerta'
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('Errores (500) en createNotification', async () => {
      (Notification.create as jest.Mock).mockRejectedValue(new Error('DB Error'));
      await createNotification(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // 2. Test de obtención de notificaciones
  describe('getMyNotifications', () => {
    it('debería devolver notificaciones recibidas ordenadas y populadas', async () => {
      const mockNotifs = [{ title: 'Notif 1' }];

      // Mock de la cadena: find -> sort -> populate -> resolve
      const mockPopulate = jest.fn().mockResolvedValue(mockNotifs);
      const mockSort = jest.fn().mockReturnValue({ populate: mockPopulate });
      
      (Notification.find as jest.Mock).mockReturnValue({
          sort: mockSort
      });

      await getMyNotifications(req as Request, res as Response);

      expect(Notification.find).toHaveBeenCalledWith({ receiverId_: userId });
      expect(mockSort).toHaveBeenCalledWith({ createdAt_: -1 });
      expect(mockPopulate).toHaveBeenCalledWith("senderId_", expect.any(String));
      expect(res.json).toHaveBeenCalledWith(mockNotifs);
    });
    it('Errores (500) en getMyNotifications', async () => {
      (Notification.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockRejectedValue(new Error('DB Error'))
        })
      });
      await getMyNotifications(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getsenderNotifications', () => {
    it('debería devolver notificaciones enviadas', async () => {
      const mockNotifs = [{ title: 'Sent Notif' }];

      // Mock de la cadena
      const mockPopulate = jest.fn().mockResolvedValue(mockNotifs);
      const mockSort = jest.fn().mockReturnValue({ populate: mockPopulate });
      
      (Notification.find as jest.Mock).mockReturnValue({
        sort: mockSort
      });

      await getsenderNotifications(req as Request, res as Response);

      expect(Notification.find).toHaveBeenCalledWith({ senderId_: userId });
      expect(res.json).toHaveBeenCalledWith(mockNotifs);
    });
  });

  // 3. Test de leer notificaciones
  describe('markAsRead', () => {
    it('debería marcar como leída una notificación existente', async () => {
      req.params = { id_notification: notificationId };

      const mockNotification = {
        _id: notificationId,
        receiverId_: userId,
        isRead_: false,
        save: jest.fn().mockResolvedValue(true)
      };

      (Notification.findOne as jest.Mock).mockResolvedValue(mockNotification);

      await markAsRead(req as Request, res as Response);

      expect(Notification.findOne).toHaveBeenCalledWith({ _id: notificationId, receiverId_: userId });
      expect(mockNotification.isRead_).toBe(true); // Verifica cambio de estado
      expect(mockNotification.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Notificación marcada como leída" }));
    });

    it('debería devolver 400 si el ID es inválido', async () => {
      req.params = { id_notification: 'invalid-id' };
      await markAsRead(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "ID inválido" });
    });

    it('debería devolver 404 si la notificación no existe o no pertenece al usuario', async () => {
      req.params = { id_notification: notificationId };
      (Notification.findOne as jest.Mock).mockResolvedValue(null);

      await markAsRead(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería manejar errores (400) en markAsRead', async () => {
      (Notification.findOne as jest.Mock).mockRejectedValue(new Error('Internal error'));
      await markAsRead(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('markAllAsRead', () => {
    it('debería actualizar todas las notificaciones no leídas del usuario', async () => {
      (Notification.updateMany as jest.Mock).mockResolvedValue({ nModified: 5 });

      await markAllAsRead(req as Request, res as Response);

      expect(Notification.updateMany).toHaveBeenCalledWith(
        { receiverId_: userId, isRead_: false },
        { $set: { isRead_: true } }
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("marcadas como leídas") }));
    });
    it('debería manejar errores (500) en markAllAsRead', async () => {
      (Notification.updateMany as jest.Mock).mockRejectedValue(new Error('Error masivo'));
      await markAllAsRead(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // 4. Test de eliminación de notificaciones
  describe('deleteNotification', () => {
    it('debería eliminar una notificación propia', async () => {
      req.params = { id_notification: notificationId };

      // Mock findOneAndDelete devolviendo el objeto borrado (éxito)
      (Notification.findOneAndDelete as jest.Mock).mockResolvedValue({ _id: notificationId });

      await deleteNotification(req as Request, res as Response);

      expect(Notification.findOneAndDelete).toHaveBeenCalledWith({ 
          _id: notificationId, 
          receiverId_: userId 
      });
      expect(res.json).toHaveBeenCalledWith({ message: "Notificación eliminada" });
    });

    it('debería devolver 404 si no se encuentra o no es dueño', async () => {
      req.params = { id_notification: notificationId };
      (Notification.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      await deleteNotification(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería devolver 400 si el ID es inválido', async () => {
      req.params = { id_notification: 'bad-id' };
      await deleteNotification(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteAllNotifications', () => {
    it('debería eliminar todas las notificaciones del usuario', async () => {
      (Notification.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 10 });

      await deleteAllNotifications(req as Request, res as Response);

      expect(Notification.deleteMany).toHaveBeenCalledWith({ receiverId_: userId });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Todas las notificaciones eliminadas" }));
    });

    it('Errores del servidor (500)', async () => {
      (Notification.deleteMany as jest.Mock).mockRejectedValue(new Error("DB fail"));
      
      await deleteAllNotifications(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(500);
    });
    it('debería manejar errores (400) en deleteNotification', async () => {
      (Notification.findOneAndDelete as jest.Mock).mockRejectedValue(new Error('Error eliminando'));
      await deleteNotification(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});