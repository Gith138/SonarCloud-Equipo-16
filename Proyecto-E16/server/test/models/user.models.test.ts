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
    it('debería asignar rating 3 por defecto en el historial', () => {
        const user = new User({
            username_: 'UserHistory',
            email_: 'h@test.com',
            password_: '123',
            history_: [
                { songId: new mongoose.Types.ObjectId() } // No pasamos rating
            ]
        });

        const error = user.validateSync();
        expect(error).toBeUndefined();
        
        // Accedemos al primer elemento del historial
        expect(user.history_[0].rating).toBe(3);
        expect(user.history_[0].listenedAt).toBeInstanceOf(Date);
    });

    /**
     * CASO 4: Validación del Historial - Validaciones Min/Max
     */
    it('debería fallar si el rating es menor a 1 o mayor a 5', () => {
        const user = new User({
            username_: 'BadRating',
            email_: 'b@test.com',
            password_: '123',
            history_: [
                { songId: new mongoose.Types.ObjectId(), rating: 0 },  // Malo: < 1
                { songId: new mongoose.Types.ObjectId(), rating: 6 }   // Malo: > 5
            ]
        });

        const error = user.validateSync();
        expect(error).toBeDefined();

        // Mongoose reporta errores en arrays usando la notación de punto: "history_.0.rating"
        expect(error?.errors['history_.0.rating']).toBeDefined(); // Error en el primer elemento
        expect(error?.errors['history_.0.rating'].message).toContain('is less than minimum allowed value');

        expect(error?.errors['history_.1.rating']).toBeDefined(); // Error en el segundo elemento
        expect(error?.errors['history_.1.rating'].message).toContain('is more than maximum allowed value');
    });

    /**
     * CASO 5: Historial - SongId requerido
     */
    it('debería fallar si se agrega una entrada al historial sin songId', () => {
        const user = new User({
            username_: 'NoSongId',
            email_: 'n@test.com',
            password_: '123',
            history_: [
                { rating: 5 } as any // Forzamos a que falte el songId
            ]
        });

        const error = user.validateSync();
        
        expect(error).toBeDefined();
        expect(error?.errors['history_.0.songId']).toBeDefined();
    });
});