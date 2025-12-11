import request from 'supertest';
import express from 'express';
import streamRoutes from '../../src/routes/stream_routes';
import { PassThrough } from 'stream';

// --- MOCKS ---
// 1. Mock de ytdl-core
// Devuelve un stream vacío (PassThrough)
jest.mock('ytdl-core', () => {
  return jest.fn(() => new PassThrough());
});

// 2. Mock de fluent-ffmpeg
// Simulamos la cadena de métodos: .audioBitrate().format().on().pipe()
jest.mock('fluent-ffmpeg', () => {
  return jest.fn(() => ({
    audioBitrate: jest.fn().mockReturnThis(),
    format: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    pipe: jest.fn((destination) => {
      // Simulamos que escribimos algo en el destino para cerrar la conexión
      destination.write('fake-audio-chunk');
      destination.end();
      return destination;
    })
  }));
});

const app = express();
app.use('/', streamRoutes);

describe('Stream Routes', () => {
  
  it('GET /stream/:videoId debería configurar headers e iniciar streaming', async () => {
    const videoId = 'abc12345';
    
    const res = await request(app).get(`/stream/${videoId}`);

    // Verificamos Headers
    expect(res.headers['content-type']).toBe('audio/mpeg');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['accept-ranges']).toBe('bytes');
    
    // Verificamos que llegó "algo" (gracias a nuestro mock de pipe)
    expect(res.status).toBe(200);
  });

  it('debería manejar errores si ytdl falla (simulado)', async () => {
    // Forzamos un error en ytdl sobrescribiendo el mock solo para este test
    const ytdl = require('ytdl-core');
    ytdl.mockImplementationOnce(() => {
        throw new Error('YTDL Error');
    });

    const res = await request(app).get('/stream/error_video');
    
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Error al reproducir el audio" });
  });
});