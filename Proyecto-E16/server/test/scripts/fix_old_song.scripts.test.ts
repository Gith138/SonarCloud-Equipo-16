import { runFix, extractArtistFromTitle } from '../../src/scripts/fix_old_songs'; // Ajusta la ruta a tu script real
import Song from "../../src/models/song_model";
import { inferGenreFromArtist } from "../../src/recommendation/genre_inference";
import mongoose from "mongoose";

// --- MOCKS ---

// 1. MOCK DE MONGOOSE (CORREGIDO)
// Usamos requireActual para mantener Schema, Types y Model funcionando
jest.mock("mongoose", () => {
    const actualMongoose = jest.requireActual("mongoose");
    return {
        ...actualMongoose,
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        connection: { readyState: 0 }
    };
});

// 2. MOCK DEL MODELO SONG
// Esto es importante para interceptar .find() y .save()
jest.mock("../../src/models/song_model");

// 3. MOCK DE INFERENCIA
jest.mock("../../src/recommendation/genre_inference");

describe('Script de Limpieza (Fix Songs)', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        // Silenciamos logs
        jest.spyOn(console, 'log').mockImplementation(() => {}); 
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    /**
     * TEST: extractArtistFromTitle (Utilidad)
     */
    describe('extractArtistFromTitle', () => {
        it('debería extraer el artista correctamente usando guiones', () => {
            expect(extractArtistFromTitle('Queen - Bohemian Rhapsody', 'QueenVEVO')).toBe('Queen');
            expect(extractArtistFromTitle('Metallica – One', 'MetallicaOfficial')).toBe('Metallica');
        });

        it('debería devolver el fallback si no hay separador', () => {
            expect(extractArtistFromTitle('Solo Titulo', 'ArtistaOriginal')).toBe('ArtistaOriginal');
        });

        it('debería limpiar corchetes', () => {
            expect(extractArtistFromTitle('Nirvana - Smells Like Teen Spirit [Video]', 'NirvanaVEVO')).toBe('Nirvana');
        });
    });

    /**
     * TEST: runFix (Lógica Principal)
     */
    describe('runFix Logic', () => {
        it('debería CORREGIR artista si tiene "VEVO" y el título lo permite', async () => {
            const mockSong = {
                title_: 'Coldplay - Yellow',
                artist_: 'ColdplayVEVO', // Malo
                genre_: 'Rock',
                save: jest.fn().mockResolvedValue(true)
            };

            // Simulamos respuesta de DB
            (Song.find as jest.Mock).mockResolvedValue([mockSong]);

            await runFix();

            // Verificamos cambios
            expect(mockSong.artist_).toBe('Coldplay');
            expect(mockSong.save).toHaveBeenCalled();
        });

        it('debería INFERIR género si es "YouTube" o falta', async () => {
            const mockSong = {
                title_: 'Lose Yourself',
                artist_: 'Eminem',
                genre_: 'YouTube', // Malo
                save: jest.fn().mockResolvedValue(true)
            };

            (Song.find as jest.Mock).mockResolvedValue([mockSong]);
            
            // Simulamos respuesta de LastFM/Inferencia
            (inferGenreFromArtist as jest.Mock).mockResolvedValue('Rap');

            await runFix();

            expect(inferGenreFromArtist).toHaveBeenCalledWith('Eminem');
            expect(mockSong.genre_).toBe('Rap');
            expect(mockSong.save).toHaveBeenCalled();
        });

        it('NO debería hacer nada si la canción ya está bien', async () => {
            const mockSong = {
                title_: 'Song',
                artist_: 'Good Artist',
                genre_: 'Pop',
                save: jest.fn()
            };

            (Song.find as jest.Mock).mockResolvedValue([mockSong]);

            await runFix();

            expect(mockSong.save).not.toHaveBeenCalled();
        });

        it('debería corregir AMBOS (artista y género) si es necesario', async () => {
            const mockSong = {
                title_: 'Linkin Park - Numb',
                artist_: 'LinkinParkVEVO', // Malo
                genre_: 'Otro', // Malo
                save: jest.fn().mockResolvedValue(true)
            };

            (Song.find as jest.Mock).mockResolvedValue([mockSong]);
            
            // Inferencia devuelve Rock
            (inferGenreFromArtist as jest.Mock).mockResolvedValue('Rock');

            await runFix();

            expect(mockSong.artist_).toBe('Linkin Park'); // Corregido
            expect(inferGenreFromArtist).toHaveBeenCalledWith('Linkin Park'); // Usó el nombre nuevo
            expect(mockSong.genre_).toBe('Rock');
            expect(mockSong.save).toHaveBeenCalled();
        });
    });
});