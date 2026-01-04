import request from 'supertest';
import express from 'express';
import songRoutes from '../../src/routes/song_routes';
import * as songController from '../../src/controllers/song_controller';

// Definimos la función DENTRO del mock para evitar ReferenceError
jest.mock('../../src/controllers/song_controller', () => {
  const handler = (req: any, res: any) => res.status(200).send('OK');
  return {
    createSong: jest.fn(handler),
    getSongs: jest.fn(handler),
    getSongById: jest.fn(handler),
    updateSong: jest.fn(handler),
    deleteSong: jest.fn(handler),
  };
});

const app = express();
app.use('/songs', songRoutes);

describe('Song Routes', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('POST /songs -> createSong', async () => {
    await request(app).post('/songs');
    expect(songController.createSong).toHaveBeenCalled();
  });

  it('GET /songs -> getSongs', async () => {
    await request(app).get('/songs');
    expect(songController.getSongs).toHaveBeenCalled();
  });

  it('GET /songs/:id -> getSongById', async () => {
    await request(app).get('/songs/123');
    expect(songController.getSongById).toHaveBeenCalled();
  });

  it('PUT /songs/:id -> updateSong', async () => {
    await request(app).put('/songs/123');
    expect(songController.updateSong).toHaveBeenCalled();
  });

  it('DELETE /songs/:id -> deleteSong', async () => {
    await request(app).delete('/songs/123');
    expect(songController.deleteSong).toHaveBeenCalled();
  });
});