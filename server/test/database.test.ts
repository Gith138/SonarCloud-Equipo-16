import { connectToDatabase } from '../../server/src/database'; // Ajusta la ruta a tu archivo real
import mongoose from 'mongoose';

// 1. MOCK DE MONGOOSE
// Le decimos a Jest que reemplace mongoose por funciones falsas
jest.mock('mongoose');

describe('Database Config (connectToDatabase)', () => {
    
    // Espías para la consola (para que no ensucien el reporte y verificar que se llaman)
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restauramos la consola original después de cada test
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    /**
     * CASO 1: Conexión Exitosa
     */
    it('debería conectar a MongoDB y mostrar un log de éxito', async () => {
        const fakeUri = 'mongodb://localhost:27017/testdb';

        // Simulamos que mongoose.connect resuelve bien (promesa cumplida)
        (mongoose.connect as jest.Mock).mockResolvedValue('Mongoose instance');

        await connectToDatabase(fakeUri);

        // Verificamos que se llamó a connect con la URI correcta
        expect(mongoose.connect).toHaveBeenCalledWith(fakeUri);
        
        // Verificamos que salió el mensaje de éxito
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Conectado a MongoDB Atlas'));
    });

    /**
     * CASO 2: Error de Conexión
     */
    it('debería lanzar un error y mostrar log de error si falla la conexión', async () => {
        const fakeUri = 'mongodb://bad-uri';
        const fakeError = new Error('Connection refused');

        // Simulamos que mongoose.connect falla (promesa rechazada)
        (mongoose.connect as jest.Mock).mockRejectedValue(fakeError);

        // Como la función relanza el error (throw error), usamos expect(...).rejects
        await expect(connectToDatabase(fakeUri)).rejects.toThrow('Connection refused');

        expect(mongoose.connect).toHaveBeenCalledWith(fakeUri);
        
        // Verificamos que se imprimió el error en consola
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Error al conectar'), 
            fakeError
        );
    });
});