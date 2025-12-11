import mongoose from 'mongoose';
import Song from '../../src/models/song_model'; // Ajusta la ruta

describe('Song Model', () => {

    /**
     * CASO 1: Canción Válida
     */
    it('debería crear una canción válida con todos los campos requeridos', () => {
        const song = new Song({
            title_: 'Bohemian Rhapsody',
            artist_: 'Queen',
            youtubeURL_: 'https://youtu.be/fJ9rUzIMcZQ',
            thumbnailURL_: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
            genre_: 'Rock',
            addedByUserId_: new mongoose.Types.ObjectId()
        });

        const error = song.validateSync();
        expect(error).toBeUndefined();
        
        // Verificar default
        expect(song.uploadedAt_).toBeDefined();
        expect(song.uploadedAt_).toBeInstanceOf(Date);
    });

    /**
     * CASO 2: Campos Requeridos
     */
    it('debería fallar si faltan campos obligatorios (title, artist, url, thumb)', () => {
        const song = new Song({
            // Objeto vacío
        });

        const error = song.validateSync();

        expect(error).toBeDefined();
        expect(error?.errors['title_']).toBeDefined();
        expect(error?.errors['artist_']).toBeDefined();
        expect(error?.errors['youtubeURL_']).toBeDefined();
        expect(error?.errors['thumbnailURL_']).toBeDefined();
    });

    /**
     * CASO 3: Tipos de datos
     */
    it('debería aceptar un ObjectId válido en addedByUserId_', () => {
        const song = new Song({
            title_: 'Test',
            artist_: 'Test',
            youtubeURL_: 'url',
            thumbnailURL_: 'thumb',
            addedByUserId_: new mongoose.Types.ObjectId()
        });

        const error = song.validateSync();
        expect(error).toBeUndefined();
    });
});