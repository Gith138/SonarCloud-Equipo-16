import { recommendFromLikes, buildInternalPlaylists, buildExternalPlaylistFromUserLikes, getFriendsBasedRecommendations, mergeUniqueWithLimit } from '../../src/recommendation/recommendation'; // Ajusta ruta
import Song from "../../src/models/song_model";
import User from "../../src/models/user_model";
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
        { artist_: 'Queen', genre_: 'Rock', thumbnailURL_: 'img3' },

        { artist_: 'Eminem', genre_: 'Rap', thumbnailURL_: 'img4' },
        { artist_: 'Eminem', genre_: 'Rap', thumbnailURL_: 'img5' },
        { artist_: 'Eminem', genre_: 'Rap', thumbnailURL_: 'img6' },

        { artist_: 'Dr. Dre', genre_: 'Rap', thumbnailURL_: 'img7' }
      ];

      const playlists = buildInternalPlaylists(songs);

      // Debería crear:
      // 1. Basado en Queen (3 canciones)
      // 2. Basado en Eminem (3 canciones)
      // 3. Mix de Rap (4 canciones) -> Eminem + Dr. Dre
      // Total = 3 playlists
      
      expect(playlists).toHaveLength(3);
      
      const queenPL = playlists.find(p => 'artist' in p && p.artist === 'Queen');
      expect(queenPL).toBeDefined();
      expect(queenPL?.songs).toHaveLength(3);

      const eminemPL = playlists.find(p => 'artist' in p && p.artist === 'Eminem');
      expect(eminemPL).toBeDefined();
      expect(eminemPL?.songs).toHaveLength(3);

      const rapPL = playlists.find(p => 'genre' in p && p.genre === 'Rap');
      expect(rapPL).toBeDefined();
      expect(rapPL?.songs).toHaveLength(4);

      const rockPL = playlists.find(p => 'genre' in p && p.genre === 'Rock');
      expect(rockPL).toBeUndefined();
    });

    it('debería usar fallback si no se cumple ningún mínimo', () => {
      // Solo 2 canciones, no llega a ningún mínimo
      const songs = [
        { artist_: 'Queen', genre_: 'Rock', thumbnailURL_: 'img1' },
        { artist_: 'Queen', genre_: 'Rock', thumbnailURL_: 'img2' },
      ];

      const playlists = buildInternalPlaylists(songs);

      // La lógica de fallback devuelve el artista con más canciones (aunque no llegue al mínimo)
      expect(playlists).toHaveLength(1);
      expect(playlists[0].name_).toContain('Basado en Queen');
    });

    it('debería ignorar artistas y géneros desconocidos', () => {
      const songs = [
        { artist_: 'Artista desconocido', genre_: 'Desconocido' },
        { artist_: 'Artista desconocido', genre_: 'Otro' }
      ];
      const result = buildInternalPlaylists(songs);
      expect(result).toHaveLength(0);
    });
  });

  /**
   * TEST: buildExternalPlaylistFromUserLikes
   */
  describe('buildExternalPlaylistFromUserLikes', () => {
    it('debería retornar null si el usuario no tiene likes', async () => {
      // Mock User.findById
      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({ likedSongs_: [] })
      });

      const result = await buildExternalPlaylistFromUserLikes("user123");
      expect(result).toBeNull();
    });

    it('debería crear una playlist basada en el artista top si gana por cantidad', async () => {
      // Usuario le gusta 3 veces Queen (Rock) y 1 vez Eminem (Rap)
      // Ganador esperado: Queen
      const mockUser = {
        likedSongs_: [
          { artist_: 'Queen', genre_: 'Rock' },
          { artist_: 'Queen', genre_: 'Rock' },
          { artist_: 'Queen', genre_: 'Rock' },
          { artist_: 'Eminem', genre_: 'Rap' }
        ]
      };

      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      // Mock respuesta de YouTube para la playlist
      mockFetchYouTube.mockResolvedValue([
        { title_: 'Queen Mix', thumbnailURL_: 'cover.jpg' } as any
      ]);

      const result = await buildExternalPlaylistFromUserLikes("user123");

      expect(result).not.toBeNull();
      expect(result?.name).toContain('Playlist de Queen');
      expect(result?.cover).toBe('cover.jpg');
      expect(mockFetchYouTube).toHaveBeenCalledWith(expect.stringContaining('Queen playlist'), 15);
    });

    it('debería crear una playlist basada en el género si hay variedad de artistas pero mismo género', async () => {
      // Usuario le gusta Rock pero de artistas distintos
      // Queen (1), Nirvana (1), AC/DC (1). Total Rock = 3. Top Artista = 1.
      // Ganador esperado: Rock (porque 3 > 1)
      const mockUser = {
        likedSongs_: [
          { artist_: 'Queen', genre_: 'Rock' },
          { artist_: 'Nirvana', genre_: 'Rock' },
          { artist_: 'AC/DC', genre_: 'Rock' }
        ]
      };

      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      mockFetchYouTube.mockResolvedValue([{ thumbnailURL_: 'rock.jpg' } as any]);

      const result = await buildExternalPlaylistFromUserLikes("user123");

      expect(result?.name).toContain('Playlist de Rock');
      expect(mockFetchYouTube).toHaveBeenCalledWith(expect.stringContaining('Rock playlist'), 15);
    });
  });

  /**
   * TEST: getFriendsBasedRecommendations
   */
  describe('getFriendsBasedRecommendations', () => {
    it('debería recomendar canciones que gustan a los amigos pero NO al usuario (filtro)', async () => {
      // YO: Me gusta la Canción A.
      // AMIGO 1: Le gusta Canción A y Canción B.
      // Resultado esperado: Solo Canción B (porque A ya la tengo).
      
      const songA = { _id: 'id_a', title_: 'Song A' };
      const songB = { _id: 'id_b', title_: 'Song B' };

      const me = {
        _id: 'my_id',
        likedSongs_: [songA],
        friends_: ['friend_id']
      };

      const friend = {
        _id: 'friend_id',
        likedSongs_: [songA, songB]
      };

      // Mock de la búsqueda de MI usuario
      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(me) 
        })
      });

      // Mock de la búsqueda de amigos
      const mockFind = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([friend])
        })
      });
      (User.find as jest.Mock).mockImplementation(mockFind);

      const result = await getFriendsBasedRecommendations("my_id");

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe('id_b'); // Solo B
    });

    it('debería ordenar por popularidad entre amigos', async () => {
      // AMIGO 1: Le gusta X
      // AMIGO 2: Le gusta X y Y
      // X tiene 2 votos, Y tiene 1 voto.
      // Orden esperado: X, Y.
      
      const songX = { _id: 'id_x' };
      const songY = { _id: 'id_y' };

      const me = { likedSongs_: [], friends_: ['f1', 'f2'] };
      const f1 = { likedSongs_: [songX] };
      const f2 = { likedSongs_: [songX, songY] };

      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(me) })
      });

      (User.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([f1, f2])
        })
      });

      const result = await getFriendsBasedRecommendations("my_id");

      expect(result).toHaveLength(2);
      expect(result[0]._id).toBe('id_x'); // X primero (2 votos)
      expect(result[1]._id).toBe('id_y'); // Y segundo (1 voto)
    });
  });

  /**
   * TEST: mergeUniqueWithLimit
   */
  describe('mergeUniqueWithLimit', () => {
    it('debería mezclar arrays eliminando duplicados por _id', () => {
      const arr1 = [{ _id: '1', val: 'A' }, { _id: '2', val: 'B' }];
      const arr2 = [{ _id: '2', val: 'B' }, { _id: '3', val: 'C' }]; // '2' repetido

      const result = mergeUniqueWithLimit(10, arr1, arr2);

      expect(result).toHaveLength(3);
      expect(result.map(i => i._id)).toEqual(['1', '2', '3']);
    });

    it('debería respetar el límite máximo', () => {
      const arr1 = [{ _id: '1' }, { _id: '2' }];
      const arr2 = [{ _id: '3' }, { _id: '4' }];
      
      // Límite de 3
      const result = mergeUniqueWithLimit(3, arr1, arr2);

      expect(result).toHaveLength(3);
      expect(result.map(i => i._id)).toEqual(['1', '2', '3']); 
    });
  });
});