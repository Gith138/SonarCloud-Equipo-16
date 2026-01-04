import mongoose from 'mongoose';
import Playlist from '../../src/models/playlist_model'; // Ajusta la ruta a tu modelo

describe('Playlist Model', () => {
    
    /**
     * CASO 1: Playlist Válida
     */
    it('debería ser válida si tiene todos los campos obligatorios', () => {
        const playlist = new Playlist({
            name_: 'Playlist de prueba',
            owner_: new mongoose.Types.ObjectId(), // Generamos un ID falso pero válido
        });

        // validateSync devuelve "undefined" si todo está bien
        // o devuelve un objeto de error si algo falla.
        const error = playlist.validateSync();
        
        expect(error).toBeUndefined();
    });

    /**
     * CASO 2: Validación de campos requeridos (name_)
     */
    it('debería dar error si falta el campo name_', () => {
        const playlist = new Playlist({
            // No ponemos name_
            owner_: new mongoose.Types.ObjectId(),
        });

        const error = playlist.validateSync();

        // Esperamos que haya error
        expect(error).toBeDefined();
        // Esperamos que el error específico sea en 'name_'
        expect(error?.errors['name_']).toBeDefined();
        expect(error?.errors['name_'].message).toContain('Path `name_` is required');
    });

    /**
     * CASO 3: Validación de campos requeridos (owner_)
     */
    it('debería dar error si falta el campo owner_', () => {
        const playlist = new Playlist({
            name_: 'Sin dueño',
            // No ponemos owner_
        });

        const error = playlist.validateSync();

        expect(error).toBeDefined();
        expect(error?.errors['owner_']).toBeDefined();
    });

    /**
     * CASO 4: Valores por defecto
     */
    it('debería asignar valores por defecto correctamente (cover_, isPublic_)', () => {
        const playlist = new Playlist({
            name_: 'Playlist Default',
            owner_: new mongoose.Types.ObjectId(),
        });

        // No hace falta llamar a validateSync para ver los defaults, se ponen al crear la instancia
        expect(playlist.isPublic_).toBe(false); // Default false
        expect(playlist.cover_).toBe("https://placehold.co/300x300?text=Playlist"); // Default URL
        expect(playlist.createdAt_).toBeDefined(); // Debe tener fecha
    });

    /**
     * CASO 5: Array de amigos (owner_group_)
     */
    it('debería permitir agregar múltiples IDs en owner_group_', () => {
        const friend1 = new mongoose.Types.ObjectId();
        const friend2 = new mongoose.Types.ObjectId();

        const playlist = new Playlist({
            name_: 'Playlist Compartida',
            owner_: new mongoose.Types.ObjectId(),
            owner_group_: [friend1, friend2] // Probamos tu nueva funcionalidad
        });

        const error = playlist.validateSync();
        expect(error).toBeUndefined();
        
        expect(playlist.owner_group_).toHaveLength(2);
        expect(playlist.owner_group_?.[0]).toEqual(friend1);
    });

    /**
     * CASO 6: Tipos de datos inválidos
     */
    it('debería fallar si owner_group_ contiene algo que no es un ObjectId', () => {
        const playlist = new Playlist({
            name_: 'Playlist Rota',
            owner_: new mongoose.Types.ObjectId(),
            // @ts-ignore: Forzamos un error de tipo para probar Mongoose
            owner_group_: ['NO_SOY_UN_ID_VALIDO'] 
        });

        const error = playlist.validateSync();
        
        expect(error).toBeDefined();
        // Mongoose intentará castearlo ("CastError"), si falla, da error en ese path
        expect(error?.errors['owner_group_.0']).toBeDefined(); 
    });
});