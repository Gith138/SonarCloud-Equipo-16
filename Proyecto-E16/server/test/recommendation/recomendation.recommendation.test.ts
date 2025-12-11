import { recommendFromLikes, buildInternalPlaylists } from '../../src/recommendation/recommendation'; // Ajusta ruta
import Song from "../../src/models/song_model";
import * as YoutubeRec from "../../src/recommendation/youtube_recommendation";

// Mocks
jest.mock("../../src/models/song_model");
jest.mock("../../src/models/user_model");

// Espiamos las funciones de YouTube para controlar qué devuelven
const mockFetchYouTube = jest.spyOn(YoutubeRec, 'fetchYouTubeSongs');
const mockFetchYouTubeByArtist = jest.spyOn(YoutubeRec, 'fetchYouTubeSongsByArtist');

describe('Recommendation Logic', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * TEST: recommendFromLikes
     */
    describe('recommendFromLikes', () => {
        it('debería retornar array vacío si el usuario no tiene likes', async () => {
            const user = { likedSongs_: [] };
            const result = await recommendFromLikes(user);
            expect(result).toEqual([]);
        });

        it('debería generar recomendaciones mezclando DB y YouTube', async () => {
            // 1. Datos del usuario (Le gusta el Rock)
            const user = {
                likedSongs_: [
                    { artist_: 'Linkin Park', genre_: 'Rock', youtubeURL_: 'url1' },
                    { artist_: 'System of a Down', genre_: 'Rock', youtubeURL_: 'url2' },
                    { artist_: 'Metallica', genre_: 'Metal', youtubeURL_: 'url3' } // Minoritario
                ]
            };

            // 2. Mock de búsqueda en MongoDB (Song.find)
            const mockMongoSongs = [
                { artist_: 'Nirvana', genre_: 'Rock', youtubeURL_: 'db_url1' }
            ];
            // Simulamos el chain: Song.find().limit()
            const mockLimit = jest.fn().mockResolvedValue(mockMongoSongs);
            (Song.find as jest.Mock).mockReturnValue({ limit: mockLimit });

            // 3. Mock de búsqueda en YouTube
            mockFetchYouTube.mockResolvedValue([
                { artist_: 'Green Day', genre_: undefined, youtubeURL_: 'yt_url1' } as any
            ]);
            
            // 4. Mock de búsqueda por artista top
            mockFetchYouTubeByArtist.mockResolvedValue([]);

            const result = await recommendFromLikes(user);

            // Verificaciones
            expect(result).toHaveLength(2); // 1 de Mongo + 1 de Youtube
            expect(result.some(s => s.youtubeURL_ === 'db_url1')).toBe(true);
            expect(result.some(s => s.youtubeURL_ === 'yt_url1')).toBe(true);
            
            // Verificar que se asignó el género a la canción de YouTube
            const ytSong = result.find(s => s.youtubeURL_ === 'yt_url1');
            expect(ytSong.genre_).toBe('Rock'); // Heredado del género que buscaba
        });

        it('no debería recomendar canciones que ya ha dado like (filtrado)', async () => {
            const user = {
                likedSongs_: [ { artist_: 'A', genre_: 'Pop', youtubeURL_: 'same_url' } ]
            };

            (Song.find as jest.Mock).mockReturnValue({ limit: jest.fn().mockResolvedValue([]) });
            
            // YouTube devuelve la misma URL que ya le gusta
            mockFetchYouTube.mockResolvedValue([
                { artist_: 'B', youtubeURL_: 'same_url' } as any
            ]);
            mockFetchYouTubeByArtist.mockResolvedValue([]);

            const result = await recommendFromLikes(user);
            
            expect(result).toHaveLength(0); // Debe estar vacío porque filtró la duplicada
        });
    });

    /**
     * TEST: buildInternalPlaylists
     */
    describe('buildInternalPlaylists', () => {
        it('debería agrupar canciones por artista y género', () => {
            const songs = [
                { artist_: 'Queen', genre_: 'Rock', thumbnailURL_: 'img1' },
                { artist_: 'Queen', genre_: 'Rock', thumbnailURL_: 'img2' },
                { artist_: 'Eminem', genre_: 'Rap', thumbnailURL_: 'img3' }
            ];

            const playlists = buildInternalPlaylists(songs);

            // Debería crear:
            // 1. Based on Queen (2 canciones)
            // 2. Based on Eminem (1 canción)
            // 3. Based on Rock (2 canciones)
            // 4. Based on Rap (1 canción)
            // Total = 4 playlists
            
            expect(playlists).toHaveLength(4);
            
            const queenPL = playlists.find(p => 'artist' in p && p.artist === 'Queen');
            expect(queenPL).toBeDefined();
            expect(queenPL?.songs).toHaveLength(2);

            const rockPL = playlists.find(p => 'genre' in p && p.genre === 'Rock');
            expect(rockPL).toBeDefined();
            expect(rockPL?.songs).toHaveLength(2);
        });

        it('debería ignorar artistas y géneros desconocidos', () => {
            const songs = [
                { artist_: 'Artista desconocido', genre_: 'Desconocido' }
            ];
            const result = buildInternalPlaylists(songs);
            expect(result).toHaveLength(0);
        });
    });
});