import { inferGenreFromArtist } from '../../src/recommendation/genre_inference'; // Ojo con la ruta, usa la correcta
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Last.fm Service - inferGenreFromArtist', () => {
    
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...OLD_ENV, LASTFM_API_KEY: 'test_key' };
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    it('debería retornar NULL si no hay artista', async () => {
        const result = await inferGenreFromArtist("");
        expect(result).toBeNull();
    });

    it('debería retornar el género mapeado si Last.fm devuelve tags conocidos', async () => {
        // 👇 AÑADIMOS "as any"
        mockedAxios.get.mockResolvedValue({
            data: {
                toptags: {
                    tag: [
                        { name: 'hip-hop', count: 100 }, 
                        { name: 'urban', count: 50 }
                    ]
                }
            }
        } as any); // <--- AQUÍ

        const genre = await inferGenreFromArtist('Eminem');
        
        expect(mockedAxios.get).toHaveBeenCalled();
        expect(genre).toBe('Rap');
    });

    it('debería retornar NULL si los tags no están en nuestro mapa', async () => {
        // 👇 AÑADIMOS "as any"
        mockedAxios.get.mockResolvedValue({
            data: {
                toptags: {
                    tag: [
                        { name: 'experimental noise', count: 100 },
                        { name: 'weirdcore', count: 50 }
                    ]
                }
            }
        } as any); // <--- AQUÍ

        const genre = await inferGenreFromArtist('Unknown Artist');
        expect(genre).toBeNull();
    });

    it('debería usar la CACHÉ y no llamar a axios la segunda vez', async () => {
        // 👇 AÑADIMOS "as any"
        mockedAxios.get.mockResolvedValue({
            data: { toptags: { tag: [{ name: 'rock', count: 100 }] } }
        } as any); // <--- AQUÍ

        await inferGenreFromArtist('Queen');
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        const genre2 = await inferGenreFromArtist('Queen');
        
        expect(mockedAxios.get).toHaveBeenCalledTimes(1); 
        expect(genre2).toBe('Rock');
    });

    it('debería manejar errores de la API silenciosamente y retornar null', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Network Error'));

        const result = await inferGenreFromArtist('Error Artist');
        expect(result).toBeNull();
    });
});