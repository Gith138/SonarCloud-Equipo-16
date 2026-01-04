import request from 'supertest';
import express from 'express';
import notificationRoutes from '../../src/routes/notification_routes'; // Ajusta la ruta
import * as notification from '../../src/controllers/notification_controller';

// --- Mock de controladores ---
jest.mock('../../src/controllers/notification_controller', () => {
  const handler = (req: any, res: any) => res.status(200).send('Controller OK');
  return {
    createMeNotification: jest.fn(handler),
    createNotification: jest.fn(handler),
    getMyNotifications: jest.fn(handler),
    markAsRead: jest.fn(handler),
    markAllAsRead: jest.fn(handler),
    deleteNotification: jest.fn(handler),
    deleteAllNotifications: jest.fn(handler),
    getsenderNotifications: jest.fn(handler),
  };
});

const app = express();
app.use(express.json());
app.use('/users', notificationRoutes);

describe('Notification Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Crear notificaciones ---
  it('POST /users/me -> createMeNotification', async () => {
    const res = await request(app).post('/users/me').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('Controller OK');
    expect(notification.createMeNotification).toHaveBeenCalled();
  });

  it('POST /users/ -> createNotification', async () => {
    const res = await request(app).post('/users/').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('Controller OK');
    expect(notification.createNotification).toHaveBeenCalled();
  });

  // --- Obtener notificaciones ---
  it('GET /users/ -> getMyNotifications', async () => {
    const res = await request(app).get('/users/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Controller OK');
    expect(notification.getMyNotifications).toHaveBeenCalled();
  });

  it('GET /users/sent -> getsenderNotifications', async () => {
    const res = await request(app).get('/users/sent');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Controller OK');
    expect(notification.getsenderNotifications).toHaveBeenCalled();
  });

  // --- Marcar como leídas ---
  it('PUT /users/read-all -> markAllAsRead', async () => {
    const res = await request(app).put('/users/read-all').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('Controller OK');
    expect(notification.markAllAsRead).toHaveBeenCalled();
  });

  it('PUT /users/:id_notification/read -> markAsRead', async () => {
    const res = await request(app).put('/users/1/read').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('Controller OK');
    expect(notification.markAsRead).toHaveBeenCalled();
  });

  // --- Eliminar notificaciones ---
  it('DELETE /users/clear -> deleteAllNotifications', async () => {
    const res = await request(app).delete('/users/clear');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Controller OK');
    expect(notification.deleteAllNotifications).toHaveBeenCalled();
  });

  it('DELETE /users/:id_notification -> deleteNotification', async () => {
    const res = await request(app).delete('/users/1');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Controller OK');
    expect(notification.deleteNotification).toHaveBeenCalled();
  });
});
