import mongoose from 'mongoose';
import User from '../../src/models/user_model'; // Ajusta la ruta

describe('User Model', () => {

    /**
     * CASO 1: Usuario Válido
     */
    it('debería validar un usuario correcto', () => {
        const user = new User({
            username_: 'TestUser',
            email_: 'test@example.com',
            password_: 'hashedpassword123',
        });

        const error = user.validateSync();
        expect(error).toBeUndefined();

        // Verificar defaults
        expect(user.profilePictureUrl_).toBe('');
        expect(user.createdAt_).toBeInstanceOf(Date);
        expect(user.friends_).toEqual([]); // Array vacío por defecto en Mongoose
        expect(user.history_).toEqual([]);
    });

    /**
     * CASO 2: Campos Requeridos
     */
    it('debería fallar si faltan username, email o password', () => {
        const user = new User({}); // Vacío

        const error = user.validateSync();

        expect(error).toBeDefined();
        expect(error?.errors['username_']).toBeDefined();
        expect(error?.errors['email_']).toBeDefined();
        expect(error?.errors['password_']).toBeDefined();
    });

    /**
     * CASO 3: Validación del Historial (Subdocumento) - Defaults
     */
it('debería asignar valores por defecto en el historial (listenedAt)', () => {
        const user = new User({
            username_: 'UserHistory',
            email_: 'h@test.com',
            password_: '123',
            history_: [
                { songId: new mongoose.Types.ObjectId() }
            ]
        });

        const error = user.validateSync();
        expect(error).toBeUndefined();
        
        // Verificamos que se asigne la fecha actual por defecto
        expect(user.history_[0].listenedAt).toBeInstanceOf(Date);
    });

    /**
     * CASO 4: Historial - SongId requerido
     */
    it('debería fallar si se agrega una entrada al historial sin songId', () => {
        const user = new User({
            username_: 'NoSongId',
            email_: 'n@test.com',
            password_: '123',
            history_: [
                { listenedAt: new Date() } // Falta songId
            ]   
        });

        const error = user.validateSync();
        
        expect(error).toBeDefined();
        expect(error?.errors['history_.0.songId']).toBeDefined();
    });

    /**
     * CASO 5: Preferencias personalizadas
     */
    it('debería permitir guardar preferencias personalizadas', () => {
        const user = new User({
            username_: 'PrivateUser',
            email_: 'p@test.com',
            password_: '123',
            preferences_: {
                privateSession: true,
                showFriendActivity: false
            }
        });

        expect(user.preferences_?.privateSession).toBe(true);
        expect(user.preferences_?.showFriendActivity).toBe(false);
        const error = user.validateSync();
        expect(error).toBeUndefined();
    });

    /**
     * CASO 6: Reset Password (Campos Opcionales)
     */
    it('debería permitir que resetPasswordToken sea undefined por defecto', () => {
        const user = new User({
            username_: 'ResetUser',
            email_: 'reset@test.com',
            password_: '123'
        });

        expect(user.resetPasswordToken).toBeUndefined();
        expect(user.resetPasswordExpires).toBeUndefined();
    });

    /**
     * CASO 7: Validación de Recomendaciones (Subdocumento)
     */
    it('debería fallar si una recomendación no tiene fromUserId_ o songId_', () => {
        const user = new User({
            username_: 'RecTester',
            email_: 'rec@test.com',
            password_: '123',
            recommendations_: [
                { message_: 'Te recomiendo esta canción' } // Faltan los IDs requeridos
            ]
        });

        const error = user.validateSync();
        expect(error).toBeDefined();
        expect(error?.errors['recommendations_.0.fromUserId_']).toBeDefined();
        expect(error?.errors['recommendations_.0.songId_']).toBeDefined();
    });

    /**
     * CASO 8: Valores por defecto de recomendaciones
     */
    it('debería asignar valores por defecto a las recomendaciones (message y receivedAt)', () => {
        const user = new User({
            username_: 'RecDefaults',
            email_: 'recd@test.com',
            password_: '123',
            recommendations_: [
                { 
                    fromUserId_: new mongoose.Types.ObjectId(),
                    songId_: new mongoose.Types.ObjectId()
                }
            ]
        });

        const error = user.validateSync();
        expect(error).toBeUndefined();
        expect(user.recommendations_[0].message_).toBe('');
        expect(user.recommendations_[0].receivedAt_).toBeInstanceOf(Date);
    });

    /**
     * CASO 9: Listas de Amigos y Canciones (Defaults)
     */
    it('debería inicializar friendRequests_ y likedSongs_ como arrays vacíos', () => {
        const user = new User({
            username_: 'ListTester',
            email_: 'list@test.com',
            password_: '123'
        });

        expect(Array.isArray(user.friendRequests_)).toBe(true);
        expect(user.friendRequests_).toHaveLength(0);
        expect(Array.isArray(user.likedSongs_)).toBe(true);
        expect(user.likedSongs_).toHaveLength(0);
    });

    /**
     * CASO 10: Verificación de Unicidad en el Esquema
     */
    it('debería tener definidos los campos username_ y email_ como únicos', () => {
        const usernamePath = User.schema.path('username_') as any;
        const emailPath = User.schema.path('email_') as any;

        expect(usernamePath.options.unique).toBe(true);
        expect(emailPath.options.unique).toBe(true);
    });
});