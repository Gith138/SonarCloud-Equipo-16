import request from 'supertest';
import express from 'express';
import recRoutes from '../../src/routes/recommendation_routes';
import * as recController from '../../src/controllers/recommendation_controller';

jest.mock('../../src/controllers/recommendation_controller', () => ({
  recommendation: jest.fn((req, res) => res.status(200).send('Recs OK')),
}));

const app = express();
app.use('/', recRoutes);

describe('Recommendation Routes', () => {
  it('GET /recommendations debería llamar al controlador', async () => {
    const res = await request(app).get('/recommendations');
    expect(res.status).toBe(200);
    expect(recController.recommendation).toHaveBeenCalled();
  });
});