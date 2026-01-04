import { Router } from "express";
import { 
  createMeNotification, createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification, deleteAllNotifications,
  getsenderNotifications
} from "../controllers/notification_controller";

const router = Router();

// Crear notificación (normalmente usado internamente)
router.post("/me", createMeNotification);

// Crear notificación
router.post("/", createNotification);


// Obtener mis notificaciones
router.get("/", getMyNotifications);

// Obtener notificaciones enviadas
router.get("/sent", getsenderNotifications);

// Marcar todas como leídas
router.put("/read-all", markAllAsRead);


// Marcar una como leída
router.put("/:id_notification/read", markAsRead);


// Eliminar todas las notificaciones 
router.delete("/clear", deleteAllNotifications);

// Eliminar notificación
router.delete("/:id_notification", deleteNotification);



export default router;
