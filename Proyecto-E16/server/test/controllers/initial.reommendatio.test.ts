import { getGlobalPopularityRecommendations } from '../../src/recommendation/initial_recommendation'; // Ajusta la ruta si es distinta
import User from "../../src/models/user_model";
import Song from "../../src/models/song_model";
import mongoose from "mongoose";

// --- MOCKS ---
jest.mock("../../src/models/user_model");
jest.mock("../../src/models/song_model");

describe('Global Popularity Recommendation', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * CASO 1: Hay canciones populares (Camino principal)
     */
    it('debería devolver canciones ordenadas por popularidad (Aggregation)', async () => {
        const songId1 = new mongoose.Types.ObjectId();
        const songId2 = new mongoose.Types.ObjectId();

        // 1. Mock del Aggregate de User
        // Simulamos que la canción 1 tiene más likes que la 2
        (User.aggregate as jest.Mock).mockResolvedValue([
            { _id: songId1, likes: 10 },
            { _id: songId2, likes: 5 }
        ]);

        // 2. Mock de Song.find
        // OJO: Mongoose no garantiza el orden en .find({ $in: ... }), así que simulamos
        // que la BD las devuelve desordenadas (la 2 antes que la 1) para probar tu lógica de ordenamiento.
        const mockSongsFromDB = [
            { _id: songId2, title_: 'Song 2' },
            { _id: songId1, title_: 'Song 1' }
        ];

        (Song.find as jest.Mock).mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockSongsFromDB)
        });

        const result = await getGlobalPopularityRecommendations(5);

        // Verificaciones
        expect(User.aggregate).toHaveBeenCalled();
        
        // Lo más importante: ¿El resultado final respeta el orden del aggregate (popularidad)?
        // Debería ser [Song 1, Song 2] aunque la BD devolvió [Song 2, Song 1]
        expect(result).toHaveLength(2);
        expect(result[0]._id).toEqual(songId1); // La más popular primero
        expect(result[1]._id).toEqual(songId2);
    });

    /**
     * CASO 2: No hay likes (Fallback a 'Recientes')
     */
    it('debería devolver las canciones más recientes si no hay likes', async () => {
        // 1. Aggregate devuelve array vacío
        (User.aggregate as jest.Mock).mockResolvedValue([]);

        // 2. Mock de la cadena: Song.find().sort().limit().exec()
        const mockExec = jest.fn().mockResolvedValue(['RecentSong1', 'RecentSong2']);
        const mockLimit = jest.fn().mockReturnThis(); // Para encadenar .limit()
        const mockSort = jest.fn().mockReturnThis();  // Para encadenar .sort()

        (Song.find as jest.Mock).mockReturnValue({
            sort: mockSort,
            limit: mockLimit,
            exec: mockExec
        });

        const result = await getGlobalPopularityRecommendations(10);

        expect(User.aggregate).toHaveBeenCalled();
        // Debe entrar al IF de songIds.length === 0
        expect(Song.find).toHaveBeenCalled();
        expect(mockSort).toHaveBeenCalledWith({ uploadedAt_: -1 }); // Ordenado por fecha
        expect(mockLimit).toHaveBeenCalledWith(10);
        expect(result).toEqual(['RecentSong1', 'RecentSong2']);
    });

    /**
     * CASO 3: Integridad de datos (Canción borrada)
     */
    it('debería filtrar canciones que ya no existen en la BD (filter Boolean)', async () => {
        const existingId = new mongoose.Types.ObjectId();
        const deletedId = new mongoose.Types.ObjectId();

        // 1. Aggregate dice que la canción borrada es popular
        (User.aggregate as jest.Mock).mockResolvedValue([
            { _id: existingId, likes: 10 },
            { _id: deletedId, likes: 8 } // Esta ya no existe en la tabla Songs
        ]);

        // 2. Song.find solo encuentra la que existe
        (Song.find as jest.Mock).mockReturnValue({
            exec: jest.fn().mockResolvedValue([
                { _id: existingId, title_: 'I exist' }
            ])
        });

        const result = await getGlobalPopularityRecommendations();

        // El resultado debería tener solo 1 elemento, ignorando el 'undefined'
        expect(result).toHaveLength(1);
        expect(result[0]._id).toEqual(existingId);
    });
});