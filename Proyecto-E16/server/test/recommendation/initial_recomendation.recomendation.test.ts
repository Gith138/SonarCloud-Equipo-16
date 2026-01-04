import mongoose from 'mongoose';
import { getGlobalPopularityRecommendations } from '../../src/recommendation/initial_recommendation'; // Ajusta la ruta
import User from '../../src/models/user_model';
import Song from '../../src/models/song_model';

jest.mock('../../src/models/user_model');
jest.mock('../../src/models/song_model');

describe('getGlobalPopularityRecommendations', () => {
  const songId1 = new mongoose.Types.ObjectId();
  const songId2 = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * CASO 1: Éxito con datos de popularidad
   */
  it('debería devolver las canciones ordenadas por número de likes', async () => {
    // 1. Simular el resultado de la agregación (Song 2 tiene más likes que Song 1)
    const mockAggregation = [
      { _id: songId2, likes: 10 },
      { _id: songId1, likes: 5 }
    ];
    (User.aggregate as jest.Mock).mockResolvedValue(mockAggregation);

    // 2. Simular la búsqueda de las canciones en la DB
    const mockSongs = [
      { _id: songId1, title_: 'Canción 1' },
      { _id: songId2, title_: 'Canción 2' }
    ];
    (Song.find as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockSongs)
    });

    const result = await getGlobalPopularityRecommendations(2);

    // Verificaciones
    expect(User.aggregate).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    // IMPORTANTE: Verificar que el orden sea el de la agregación (id2 primero)
    expect(result[0]._id.toString()).toBe(songId2.toString());
    expect(result[1]._id.toString()).toBe(songId1.toString());
  });

  /**
   * CASO 2: Fallback (No hay likes en el sistema)
   */
  it('debería devolver las canciones más recientes si no hay likes registrados', async () => {
    // 1. Agregación vacía
    (User.aggregate as jest.Mock).mockResolvedValue([]);

    // 2. Mock del fallback: Song.find().sort().limit().exec()
    const mockRecentSongs = [{ title_: 'Reciente 1' }, { title_: 'Reciente 2' }];
    const mockFindChain = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockRecentSongs)
    };
    (Song.find as jest.Mock).mockReturnValue(mockFindChain);

    const result = await getGlobalPopularityRecommendations(2);

    expect(result).toEqual(mockRecentSongs);
    expect(mockFindChain.sort).toHaveBeenCalledWith({ uploadedAt_: -1 });
  });

  /**
   * CASO 3: Manejo de canciones eliminadas
   */
  it('debería filtrar canciones que aparecen en likes pero ya no existen en la colección Song', async () => {
    (User.aggregate as jest.Mock).mockResolvedValue([{ _id: songId1, likes: 1 }]);
    
    // Song.find devuelve vacío (la canción fue borrada de la DB pero el like persiste)
    (Song.find as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue([])
    });

    const result = await getGlobalPopularityRecommendations(5);

    // El .filter(Boolean) de tu código debería devolver un array vacío en lugar de [undefined]
    expect(result).toHaveLength(0);
  });
});