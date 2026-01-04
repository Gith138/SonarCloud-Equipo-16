import mongoose from 'mongoose';
import Notification, { NotificationType } from '../../src/models/notification_model'; // Ajusta ruta

describe('Notification Model', () => {

  /**
   * CASO 1: Crear notificación válida
   */
  it('debería validar una notificación correcta', () => {
    const notification = new Notification({
      receiverId_: new mongoose.Types.ObjectId(),
      type_: 'friend_request' as NotificationType,
      message_: 'Tienes una solicitud de amistad',
    });

    const error = notification.validateSync();
    expect(error).toBeUndefined();

    // Verificar defaults
    expect(notification.isRead_).toBe(false);
    expect(notification.createdAt_).toBeInstanceOf(Date);
    expect(notification.senderId_).toBeUndefined(); // Opcional
    expect(notification.data_).toEqual({});
  });

  /**
   * CASO 2: Campos requeridos
   */
  it('debería fallar si faltan receiverId_, type_ o message_', () => {
    const notification = new Notification({}); // Vacío

    const error = notification.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['receiverId_']).toBeDefined();
    expect(error?.errors['type_']).toBeDefined();
    expect(error?.errors['message_']).toBeDefined();
  });

  /**
   * CASO 3: Enum type_ inválido
   */
  it('debería fallar si type_ no es un valor válido', () => {
    const notification = new Notification({
      receiverId_: new mongoose.Types.ObjectId(),
      type_: 'invalid_type' as any,
      message_: 'Mensaje de prueba',
    });

    const error = notification.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['type_']).toBeDefined();
    expect(error?.errors['type_'].message).toContain('`invalid_type` is not a valid enum value');
  });

  /**
   * CASO 4: Campos opcionales
   */
  it('debería permitir senderId_ y data_ opcionales', () => {
    const notification = new Notification({
      receiverId_: new mongoose.Types.ObjectId(),
      type_: 'system_alert' as NotificationType,
      message_: 'Alerta del sistema',
    });

    const error = notification.validateSync();
    expect(error).toBeUndefined();

    expect(notification.senderId_).toBeUndefined(); // Opcional
    expect(notification.data_).toEqual({});         // Default
  });

  /**
   * CASO 5: senderId_ definido
   */
  it('debería aceptar senderId_ cuando se proporciona', () => {
    const senderId = new mongoose.Types.ObjectId();
    const notification = new Notification({
      senderId_: senderId,
      receiverId_: new mongoose.Types.ObjectId(),
      type_: 'like_song' as NotificationType,
      message_: 'Tu amigo le dio like a una canción',
    });

    const error = notification.validateSync();
    expect(error).toBeUndefined();
    expect(notification.senderId_).toEqual(senderId);
  });
  /**
   * CASO 6: Validar tipos de Playlist (Nuevos)
   */
  it('debería aceptar los nuevos tipos de playlist_share y playlist_unshare', () => {
    const shareNotif = new Notification({
      receiverId_: new mongoose.Types.ObjectId(),
      type_: 'playlist_share',
      message_: 'Te han invitado a una playlist',
    });

    const unshareNotif = new Notification({
      receiverId_: new mongoose.Types.ObjectId(),
      type_: 'playlist_unshare',
      message_: 'Se ha revocado tu acceso',
    });

    expect(shareNotif.validateSync()).toBeUndefined();
    expect(unshareNotif.validateSync()).toBeUndefined();
  });

  /**
   * CASO 7: Estructura de datos compleja en data_
   */
  it('debería permitir guardar objetos complejos en el campo data_', () => {
    const complexData = {
      playlistId: new mongoose.Types.ObjectId(),
      playlistName: "Hits 2024",
      actionBy: "Angela"
    };

    const notification = new Notification({
      receiverId_: new mongoose.Types.ObjectId(),
      type_: 'playlist_share',
      message_: 'Angela compartió una playlist contigo',
      data_: complexData
    });

    const error = notification.validateSync();
    expect(error).toBeUndefined();
    expect(notification.data_).toEqual(complexData);
    expect(notification.data_.playlistName).toBe("Hits 2024");
  });

  /**
   * CASO 8: Cambio de estado isRead_
   */
  it('debería permitir cambiar el estado de isRead_ a true', () => {
    const notification = new Notification({
      receiverId_: new mongoose.Types.ObjectId(),
      type_: 'system_alert',
      message_: 'Test',
    });

    expect(notification.isRead_).toBe(false); // Default
    notification.isRead_ = true;
    expect(notification.isRead_).toBe(true);
    expect(notification.validateSync()).toBeUndefined();
  });
});
