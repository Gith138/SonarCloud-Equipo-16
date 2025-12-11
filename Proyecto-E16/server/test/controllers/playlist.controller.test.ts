import { createPlaylist, getPlaylistById, addSongToPlaylist, sharePlaylistWithUser } from '../../src/controllers/playlist_controller'; 
import Playlist from "../../src/models/playlist_model";
import Song from "../../src/models/song_model";
import User from "../../src/models/user_model";
import { Request, Response } from 'express';
import mongoose from 'mongoose';

// --- MOCKS ---
jest.mock("../../src/models/playlist_model");
jest.mock("../../src/models/song_model");
jest.mock("../../src/models/user_model");

describe('Playlist Controller', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    
    // IDs reales
    const userId = new mongoose.Types.ObjectId(); 
    const otherUserId = new mongoose.Types.ObjectId();
    const playlistId = new mongoose.Types.ObjectId();
    const songId = new mongoose.Types.ObjectId();

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: { id: userId.toString() } 
        } as any;

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    /**
     * TEST: createPlaylist
     */
    describe('createPlaylist', () => {
        it('debería crear una playlist exitosamente (201)', async () => {
            req.body = { name_: 'Mi Playlist', isPublic_: true };
            
            const mockSave = jest.fn().mockResolvedValue({ 
                _id: playlistId, 
                ...req.body 
            });
            
            (Playlist as unknown as jest.Mock).mockImplementation(() => ({
                save: mockSave
            }));

            await createPlaylist(req as Request, res as Response);

            expect(mockSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Playlist creada correctamente"
            }));
        });

        it('debería retornar 401 si no hay usuario', async () => {
            (req as any).user = undefined;
            await createPlaylist(req as Request, res as Response);
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    /**
     * TEST: getPlaylistById (CORREGIDO)
     */
    describe('getPlaylistById', () => {
        it('debería obtener una playlist pública exitosamente', async () => {
            req.params = { id: playlistId.toString() };

            const mockPlaylist = {
                _id: playlistId,
                isPublic_: true,
                // CORRECCIÓN 1: Simulamos que owner_ es un objeto poblado (con _id)
                // Esto satisface la lógica: (playlist.owner_ as any)?._id
                owner_: { _id: otherUserId, toString: () => otherUserId.toString() },
                owner_group_: []
            };

            // CORRECCIÓN 2: Mock inteligente para múltiples .populate()
            // Creamos un objeto que se devuelve a sí mismo en cada llamada a populate
            const mockQuery = {
                populate: jest.fn().mockReturnThis(), 
                // Cuando se hace 'await', se llama a 'then', devolviendo los datos
                then: (resolve: any) => resolve(mockPlaylist) 
            };
            
            (Playlist.findById as jest.Mock).mockReturnValue(mockQuery);

            await getPlaylistById(req as Request, res as Response);

            expect(Playlist.findById).toHaveBeenCalledWith(playlistId.toString());
            expect(res.json).toHaveBeenCalledWith(mockPlaylist);
        });

        it('debería denegar acceso (403) a playlist privada si no eres dueño', async () => {
            req.params = { id: playlistId.toString() };

            const mockPlaylist = {
                _id: playlistId,
                isPublic_: false, // Privada
                owner_: { _id: otherUserId, toString: () => otherUserId.toString() }, // Dueño diferente
                owner_group_: []
            };

            // Usamos la misma técnica del mockQuery inteligente
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                then: (resolve: any) => resolve(mockPlaylist)
            };
            (Playlist.findById as jest.Mock).mockReturnValue(mockQuery);

            await getPlaylistById(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Acceso denegado: playlist privada" }));
        });
    });

    /**
     * TEST: addSongToPlaylist
     */
    describe('addSongToPlaylist', () => {
        it('debería crear una canción nueva y añadirla a la playlist', async () => {
            req.body = { youtube_url: 'http://yt.com/abc', song_title: 'Test Song' };
            req.params = { id: playlistId.toString() };
            
            const mockPlaylist = {
                _id: playlistId,
                owner_: userId,
                songs_: [],
                isPublic_: false,
                save: jest.fn().mockResolvedValue(true)
            };
            (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

            (Song.findOne as jest.Mock).mockResolvedValue(null);

            const mockSongSave = jest.fn().mockResolvedValue({ 
                _id: songId, 
                title_: 'Test Song' 
            });
            
            (Song as unknown as jest.Mock).mockImplementation(() => ({
                save: mockSongSave,
                _id: songId
            }));

            await addSongToPlaylist(req as Request, res as Response);
            
            expect(Playlist.findById).toHaveBeenCalled();
            expect(mockSongSave).toHaveBeenCalled(); 
            expect(mockPlaylist.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    /**
     * TEST: sharePlaylistWithUser
     */
    describe('sharePlaylistWithUser', () => {
        it('debería compartir playlist con un usuario existente', async () => {
            req.body = { target: 'friend@test.com' };
            req.params = { id: playlistId.toString() };
            
            const targetUserId = new mongoose.Types.ObjectId(); 

            const mockPlaylist = {
                owner_: userId, 
                owner_group_: [],
                save: jest.fn()
            };
            (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

            const mockUserFound = {
                _id: targetUserId,
                username_: 'friendUser',
                email_: 'friend@test.com'
            };
            (User.findOne as jest.Mock).mockResolvedValue(mockUserFound);

            await sharePlaylistWithUser(req as Request, res as Response);

            expect(User.findOne).toHaveBeenCalled();
            expect(mockPlaylist.owner_group_).toContain(targetUserId);
            expect(mockPlaylist.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('debería dar error si intenta compartirse a sí mismo', async () => {
            req.body = { target: 'yo' };
            req.params = { id: playlistId.toString() };
            
            (Playlist.findById as jest.Mock).mockResolvedValue({ owner_: userId });
            (User.findOne as jest.Mock).mockResolvedValue({ _id: userId });

            await sharePlaylistWithUser(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "No puedes compartir la playlist contigo mismo" }));
        });
    });
});