import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth_routes';
import * as authController from '../../src/controllers/auth_controller';

// Mockeamos el controlador entero para que no ejecute lógica real
jest.mock('../../src/controllers/auth_controller', () => ({
  register: jest.fn((req, res) => res.status(200).send('Register OK')),
  login: jest.fn((req, res) => res.status(200).send('Login OK')),
}));

const app = express();
app.use(express.json());
app.use('/auth', authRoutes); // Montamos la ruta

describe('Auth Routes', () => {
  it('POST /auth/register debería llamar al controlador register', async () => {
    const res = await request(app).post('/auth/register').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('Register OK');
    expect(authController.register).toHaveBeenCalled();
  });

  it('POST /auth/login debería llamar al controlador login', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('Login OK');
    expect(authController.login).toHaveBeenCalled();
  });
});