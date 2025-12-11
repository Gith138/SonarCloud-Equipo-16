import { 
    registerUser, 
    getUserById, 
    addFriend, 
    acceptFriendRequest, 
    rejectFriendRequest, 
    getFriendsLastSong, 
    actualizar_settings,
    addToHistory,
    addLikedSong
} from '../../src/controllers/user_controller'; // Ajusta la ruta
import User from "../../src/models/user_model";
import Song from "../../src/models/song_model";
import Notification from "../../src/models/notification_model";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import { Request, Response } from 'express';
import mongoose from 'mongoose';

// --- MOCKS ---
jest.mock("../../src/models/user_model");
jest.mock("../../src/models/song_model");
jest.mock("../../src/models/notification_model"); // Vital para addFriend
jest.mock("bcryptjs");
jest.mock("fs/promises");

describe('User Controller Unit Tests', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    // IDs reales para evitar CastErrors
    const userId = new mongoose.Types.ObjectId();
    const friendId = new mongoose.Types.ObjectId();
    const songId = new mongoose.Types.ObjectId();

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            query: {},
            user: { id: userId.toString() } // Simulamos token decodificado
        } as any;

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            sendFile: jest.fn(),
            setHeader: jest.fn()
        };
        
        jest.clearAllMocks();
    });

    /**
     * 1. TEST: Registro
     */
    describe('registerUser', () => {
        it('debería registrar usuario y hashear password', async () => {
            req.body = { username_: 'NewUser', email_: 'new@mail.com', password_: '123456' };
            
            (User.findOne as jest.Mock).mockResolvedValue(null); // No existe
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pass');

            const mockSave = jest.fn().mockResolvedValue({ 
                _id: userId, 
                username_: 'NewUser', 
                email_: 'new@mail.com' 
            });
            
            (User as unknown as jest.Mock).mockImplementation(() => ({
                save: mockSave
            }));

            await registerUser(req as Request, res as Response);

            expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
            expect(mockSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    /**
     * 2. TEST: Actualizar Perfil (con imagen)
     */
    describe('actualizar_settings', () => {
        it('debería borrar imagen antigua si se sube una nueva', async () => {
            req.user = { id: userId.toString() };
            req.file = { filename: 'nueva.jpg' } as any;

            const mockUser = { 
                _id: userId,
                profilePictureUrl_: '/assets/profiles/vieja.jpg' 
            };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);
            (fs.unlink as jest.Mock).mockResolvedValue(undefined);
            (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...mockUser, profilePictureUrl_: '/assets/profiles/nueva.jpg' });

            await actualizar_settings(req as any, res as Response);

            expect(fs.unlink).toHaveBeenCalled(); // Se borró la vieja
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                userId.toString(),
                expect.objectContaining({ $set: expect.objectContaining({ profilePictureUrl_: '/assets/profiles/nueva.jpg' }) }),
                expect.any(Object)
            );
        });
    });

    /**
     * 3. TEST: Añadir Amigo (Lógica compleja + Notificaciones)
     */
    describe('addFriend', () => {
        it('debería enviar solicitud y crear NOTIFICACIÓN', async () => {
            req.body = { friendId: friendId.toString() };
            // En el test addFriend:
            const mockMe = { 
                _id: userId, 
                username_: 'MiUsuario', // <--- Faltaba esto
                friends_: [], 
                save: jest.fn() 
            };
            const mockFriend = { 
                _id: friendId, 
                friends_: [], 
                friendRequests_: [], 
                save: jest.fn() 
            };

            // Mock dinámico de findById
            (User.findById as jest.Mock).mockImplementation((id) => {
                if (id.toString() === userId.toString()) return Promise.resolve(mockMe);
                if (id.toString() === friendId.toString()) return Promise.resolve(mockFriend);
                return Promise.resolve(null);
            });

            await addFriend(req as Request, res as Response);

            // Verificaciones
            expect(mockFriend.friendRequests_).toContain(mockMe._id);
            expect(mockFriend.save).toHaveBeenCalled();
            
            // POR ESTO (Usamos expect.anything() o verificamos solo strings):
            expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
                // Usamos stringMatching para que coincida con el texto del ID
                senderId_: expect.stringMatching(userId.toString()),
                receiverId_: expect.stringMatching(friendId.toString()),
                type_: 'friend_request'
            }));

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Solicitud de amistad enviada" }));
        });

        it('debería aceptar MUTUAMENTE si ya había solicitud inversa', async () => {
            req.body = { friendId: friendId.toString() };

            const mockMe = { 
                _id: userId, 
                username_: 'Yo',
                friends_: [], 
                friendRequests_: [friendId], // YA tengo solicitud de él
                save: jest.fn() 
            };
            const mockFriend = { 
                _id: friendId, 
                friends_: [], 
                friendRequests_: [], 
                save: jest.fn() 
            };

            (User.findById as jest.Mock).mockImplementation((id) => {
                if (id.toString() === userId.toString()) return Promise.resolve(mockMe);
                if (id.toString() === friendId.toString()) return Promise.resolve(mockFriend);
                return Promise.resolve(null);
            });

            await addFriend(req as Request, res as Response);

            // Deben ser amigos directos
            expect(mockMe.friends_).toContain(mockFriend._id);
            expect(mockFriend.friends_).toContain(mockMe._id);
            
            // Notificación de aceptación automática
            expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
                type_: 'friend_accept'
            }));

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Solicitud mutua aceptada. Ya sois amigos." }));
        });
    });

    /**
     * 4. TEST: Aceptar Solicitud
     */
    describe('acceptFriendRequest', () => {
        it('debería aceptar, guardar ambos y crear notificación', async () => {
            req.body = { requesterId: friendId.toString() };

            const mockMe = { 
                _id: userId, 
                username_: 'Yo',
                friends_: [], 
                friendRequests_: [friendId], // Existe la solicitud
                save: jest.fn() 
            };
            const mockFriend = { 
                _id: friendId, 
                friends_: [], 
                save: jest.fn() 
            };

            (User.findById as jest.Mock).mockImplementation((id) => {
                if (id.toString() === userId.toString()) return Promise.resolve(mockMe);
                if (id.toString() === friendId.toString()) return Promise.resolve(mockFriend);
                return null;
            });

            await acceptFriendRequest(req as Request, res as Response);

            expect(mockMe.friends_).toContain(mockFriend._id);
            expect(mockFriend.friends_).toContain(mockMe._id);
            expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ type_: 'friend_accept' }));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Solicitud aceptada") }));
        });
    });

    /**
     * 5. TEST: Rechazar Solicitud
     */
    describe('rejectFriendRequest', () => {
        it('debería eliminar solicitud y borrar la notificación visual', async () => {
            req.body = { requesterId: friendId.toString() };

            const mockMe = {
                _id: userId,
                friendRequests_: [friendId],
                save: jest.fn()
            };

            (User.findById as jest.Mock).mockResolvedValue(mockMe);

            await rejectFriendRequest(req as Request, res as Response);

            // Array filtrado
            expect(mockMe.friendRequests_).not.toContain(friendId);
            
            // Notificación borrada de la DB
            expect(Notification.findOneAndDelete).toHaveBeenCalledWith(expect.objectContaining({
                receiverId_: expect.stringMatching(userId.toString()),
                senderId_: expect.stringMatching(friendId.toString()),
                type_: 'friend_request'
            }));
        });
    });

    /**
     * 6. TEST: Actividad de Amigos (Privacidad)
     */

    describe('getFriendsLastSong', () => {
        it('debería ocultar actividad si el amigo tiene privateSession: true', async () => {
            const mockUser = {
                preferences_: { showFriendActivity: true },
                friends_: [
                    {
                        _id: friendId,
                        username_: 'AmigoPrivado',
                        history_: [{ songId: songId, listenedAt: new Date() }],
                        preferences_: { privateSession: true } 
                    }
                ]
            };

            // 👇 CORRECCIÓN: Simulamos que .populate() devuelve DIRECTAMENTE los datos
            // Usamos mockResolvedValue porque el controlador espera una Promesa tras el primer populate
            (User.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockUser)
            });

            await getFriendsLastSong(req as Request, res as Response);

            expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    username: 'AmigoPrivado',
                    lastSong: null
                })
            ]));
        });

        it('debería mostrar actividad si la privacidad lo permite', async () => {
            const mockUser = {
                preferences_: { showFriendActivity: true },
                friends_: [
                    {
                        _id: friendId,
                        username_: 'AmigoPublico',
                        history_: [{ 
                            songId: { _id: songId, title_: 'Hit' }, 
                            listenedAt: new Date(), 
                            rating: 5 
                        }],
                        preferences_: { privateSession: false } 
                    }
                ]
            };

            // 👇 CORRECCIÓN: Igual aquí, un solo nivel de mock
            (User.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockUser)
            });

            await getFriendsLastSong(req as Request, res as Response);

            expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    username: 'AmigoPublico',
                    lastSong: expect.objectContaining({ title: 'Hit' })
                })
            ]));
        });
    });

    /**
     * 7. TEST: Canciones y Creación automática
     */
    describe('addLikedSong', () => {
        it('debería crear la canción si no existe y añadirla', async () => {
            req.body = { youtubeURL_: 'http://yt.com/new', title_: 'New Song' };
            
            const mockUser = { _id: userId, likedSongs_: [], save: jest.fn() };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);
            
            // 1. Song no existe en DB
            (Song.findOne as jest.Mock).mockResolvedValue(null);
            
            // 2. Mock guardado de canción nueva
            const newSongId = new mongoose.Types.ObjectId();
            const mockSongSave = jest.fn().mockResolvedValue({ _id: newSongId, title_: 'New Song' });
            
            (Song as unknown as jest.Mock).mockImplementation(() => ({
                save: mockSongSave,
                _id: newSongId
            }));

            await addLikedSong(req as Request, res as Response);

            expect(mockSongSave).toHaveBeenCalled(); // Se guardó en songs collection
            expect(mockUser.likedSongs_).toContain(newSongId); // Se vinculó al usuario
            expect(mockUser.save).toHaveBeenCalled();
        });
    });
});