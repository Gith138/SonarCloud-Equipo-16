import { Request, Response } from "express";
import Notification from "../models/notification_model";
import mongoose from "mongoose";

// ------------------------------------------------------------------
// CREAR (Usualmente llamados internamente o para pruebas)
// ------------------------------------------------------------------

export const createMeNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { receiverId_, type_, message_, data_ } = req.body;

    const notification = await Notification.create({
      senderId_: userId,
      receiverId_,
      type_,
      message_,
      data_
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error("Error creando notificación:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const { senderId_, receiverId_, type_, message_, data_ } = req.body;

    const notification = await Notification.create({
      senderId_,
      receiverId_,
      type_,
      message_,
      data_
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error("Error creando notificación:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ------------------------------------------------------------------
// OBTENER
// ------------------------------------------------------------------

export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const notifications = await Notification.find({ receiverId_: userId })
      .sort({ createdAt_: -1 }) // Las más nuevas primero
      .populate("senderId_", "username_ profilePictureUrl_"); // Traer datos del remitente

    res.json(notifications);
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getsenderNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const notifications = await Notification.find({ senderId_: userId })
      .sort({ createdAt_: -1 })
      .populate("receiverId_", "username_ profilePictureUrl_");

    res.json(notifications);
  } catch (error) {
    console.error("Error obteniendo notificaciones enviadas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ------------------------------------------------------------------
// ACTUALIZAR (Leer)
// ------------------------------------------------------------------

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id_notification } = req.params; // 🔥 CORREGIDO: Obtenemos ID de params

    if (!mongoose.Types.ObjectId.isValid(id_notification)) {
        return res.status(400).json({ message: "ID inválido" });
    }

    // Buscamos la notificación por ID Y que pertenezca al usuario (Seguridad)
    const notification = await Notification.findOne({ 
        _id: id_notification, 
        receiverId_: userId 
    });

    if (!notification) {
      return res.status(404).json({ message: "Notificación no encontrada o no te pertenece" });
    }

    notification.isRead_ = true;
    await notification.save();

    res.json({ message: "Notificación marcada como leída", notification });
  } catch (error) {
    console.error("Error marcando como leída:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await Notification.updateMany(
      { receiverId_: userId, isRead_: false }, // Filtro: Solo las mías y no leídas
      { $set: { isRead_: true } }
    );

    res.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    console.error("Error marcando todas como leídas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ------------------------------------------------------------------
// ELIMINAR
// ------------------------------------------------------------------

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id_notification } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id_notification)) {
      return res.status(400).json({ message: "ID de notificación inválido" });
    }

    // 🔥 SEGURIDAD: Usamos findOneAndDelete con el receiverId_
    // Así evitamos que borren notificaciones de otros usuarios
    const notification = await Notification.findOneAndDelete({ 
        _id: id_notification, 
        receiverId_: userId 
    });

    if (!notification) {
      return res.status(404).json({ message: "Notificación no encontrada o no tienes permiso" });
    }

    res.json({ message: "Notificación eliminada" });
  } catch (error) {
    console.error("Error eliminando notificación:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const deleteAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await Notification.deleteMany({ receiverId_: userId });

    res.json({ message: "Todas las notificaciones eliminadas" });
  } catch (error) {
    console.error("Error eliminando todas las notificaciones:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};