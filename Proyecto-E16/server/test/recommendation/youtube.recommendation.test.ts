import { fetchYouTubeSongs, extractArtistFromTitle } from '../../src/recommendation/youtube_recommendation'; 
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('YouTube Service', () => {
  const OLD_ENV = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Simulamos la API Key
    process.env = { ...OLD_ENV, YT_API_KEY: 'test_key' };
  });
  
  afterAll(() => { process.env = OLD_ENV; });

  /**
   * TEST: fetchYouTubeSongs (Filtrado)
   */
  describe('fetchYouTubeSongs', () => {
    it('debería filtrar resultados no deseados (Shorts, Mixes, Full Album)', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          items: [
            // 1. VÁLIDO (Este es el que queremos)
            { 
              id: { videoId: 'valid1' }, 
              snippet: { 
                title: 'Coldplay - Yellow', 
                channelTitle: 'Coldplay', 
                thumbnails: { high: { url: 'img_valid' } } 
              } 
            },
            // 2. INVÁLIDO (Shorts)
            { 
              id: { videoId: 'bad1' }, 
              snippet: { 
                title: 'Funny Moments #Shorts', 
                channelTitle: 'Random',
                thumbnails: { high: { url: 'img_bad1' } }
              } 
            },
            // 3. INVÁLIDO (Playlist)
            { 
              id: { videoId: 'bad2' }, 
              snippet: { 
                title: 'Best Rock Songs 2000s Playlist', 
                channelTitle: 'MusicHub',
                thumbnails: { high: { url: 'img_bad2' } } 
              } 
            },
            // 4. INVÁLIDO (Canal prohibido)
            { 
              id: { videoId: 'bad3' }, 
              snippet: { 
                title: 'Song OK', 
                channelTitle: 'Adela Anghelici',
                thumbnails: { high: { url: 'img_bad3' } } 
              } 
            }
          ]
        }
      } as any);

      const songs = await fetchYouTubeSongs('coldplay');

      // Debug: Si esto falla, veremos qué canciones pasaron el filtro
      if (songs.length !== 1) {
        console.log("Canciones devueltas:", songs.map(s => s.title_));
      }

      expect(songs).toHaveLength(1); 
      expect(songs[0].title_).toBe('Coldplay - Yellow');
      expect(songs[0].artist_).toBe('Coldplay'); 
    });
  });

  /**
   * TEST: extractArtistFromTitle
   */
  describe('extractArtistFromTitle', () => {
    it('debería extraer el artista correctamente usando separadores', () => {
      expect(extractArtistFromTitle('Queen - Bohemian Rhapsody', 'Ch')).toBe('Queen');
      expect(extractArtistFromTitle('Metallica – One', 'Ch')).toBe('Metallica'); 
      expect(extractArtistFromTitle('Artist — Title', 'Ch')).toBe('Artist'); 
    });

    it('debería limpiar corchetes [Official Video]', () => {
      expect(extractArtistFromTitle('Nirvana - Smells Like Teen Spirit [Official Music Video]', 'Ch'))
        .toBe('Nirvana');
    });

    it('debería usar el fallback (nombre del canal) si no hay separador', () => {
      const title = 'Una canción sin guiones';
      const channel = 'Mi Canal';
      expect(extractArtistFromTitle(title, channel)).toBe('Mi Canal');
    });
  });
});