import request from 'supertest';
import express from 'express';
import youtubeRoutes from '../../src/routes/youtube_routes'; // Ajusta la ruta
import axios from 'axios';
import * as ytRec from '../../src/recommendation/youtube_recommendation';

// 1. MOCK DE AXIOS
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// 2. MOCK DE LA FUNCIÓN HELPER
jest.mock('../../src/recommendation/youtube_recommendation', () => ({
  fetchYouTubeSongsByArtist: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/', youtubeRoutes);

describe('YouTube Routes', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, YT_API_KEY: 'test_key' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  /**
   * TEST: GET /youtube/search (Usa Axios directamente)
   */
  describe('GET /youtube/search', () => {
    it('debería devolver resultados formateados si la API responde bien', async () => {
      // Mock de respuesta de YouTube API
      const mockResponse = {
        data: {
          items: [
            {
              id: { videoId: 'vid1' },
              snippet: {
                title: 'Song Title',
                channelTitle: 'Artist Name',
                thumbnails: { medium: { url: 'http://img.com' } }
              }
            }
          ]
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse as any);

      const res = await request(app).get('/youtube/search?q=test');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title_).toBe('Song Title');
      expect(res.body[0].youtubeURL_).toContain('vid1');
    });

    it('debería devolver 400 si falta el parámetro q', async () => {
      const res = await request(app).get('/youtube/search'); // Sin q
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Falta el parámetro 'q'");
    });

    it('debería devolver 500 si Axios falla', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      
      const res = await request(app).get('/youtube/search?q=crash');
      expect(res.status).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  /**
   * TEST: GET /youtube/artist (Usa helper function)
   */
  describe('GET /youtube/artist', () => {
    it('debería llamar a fetchYouTubeSongsByArtist y devolver canciones', async () => {
      const mockSongs = [{ title_: 'Hit Song', artist_: 'Star' }];
      (ytRec.fetchYouTubeSongsByArtist as jest.Mock).mockResolvedValue(mockSongs);

      const res = await request(app).get('/youtube/artist?q=Star');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockSongs);
      expect(ytRec.fetchYouTubeSongsByArtist).toHaveBeenCalledWith('Star');
    });

    it('debería devolver 400 si falta el parámetro q', async () => {
      const res = await request(app).get('/youtube/artist');
      expect(res.status).toBe(400);
    });

    it('debería devolver 500 si el helper falla', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (ytRec.fetchYouTubeSongsByArtist as jest.Mock).mockRejectedValue(new Error('Helper Error'));

      const res = await request(app).get('/youtube/artist?q=Star');
      expect(res.status).toBe(500);
      consoleSpy.mockRestore();
    });
  });
});