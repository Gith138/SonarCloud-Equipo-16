import { resizeProfileImage } from '../../src/middlewares/resize'; // Ajusta tu ruta
import { Response, NextFunction } from 'express';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// 1. MOCK DE LIBRERÍAS EXTERNAS
jest.mock('sharp');
jest.mock('fs');

describe('Resize Profile Image Middleware', () => {
    let req: any;
    let res: Partial<Response>;
    let next: NextFunction;

    // Helper para simular la cadena de Sharp (Builder Pattern)
    const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),   // Devuelve 'this' para permitir .resize().toFormat()
        toFormat: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue({}), // El último devuelve una promesa
    };

    beforeEach(() => {
        // Reiniciar contadores de mocks
        jest.clearAllMocks();

        // Configurar req, res, next básicos
        req = {
            file: {
                buffer: Buffer.from('fake-image-data'), // Simulamos un buffer de imagen
            },
            user: { id: 'user123' }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        next = jest.fn();

        // Hacemos que cuando se llame a sharp(), devuelva nuestra instancia falsa
        (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);
    });

    /**
     * CASO 1: No hay archivo
     */
    it('debería saltar al siguiente middleware si no hay archivo (req.file undefined)', async () => {
        req.file = undefined;

        await resizeProfileImage(req, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(sharp).not.toHaveBeenCalled(); // No debió intentar procesar nada
    });

    /**
     * CASO 2: Flujo Exitoso
     */
    it('debería procesar la imagen, crear carpeta si falta y llamar a next', async () => {
        // Simulamos que la carpeta NO existe (para probar que intenta crearla)
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

        await resizeProfileImage(req, res as Response, next);

        // 1. Verificamos gestión de carpetas
        expect(fs.existsSync).toHaveBeenCalled();
        expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('profiles'), { recursive: true });

        // 2. Verificamos Sharp
        expect(sharp).toHaveBeenCalledWith(req.file.buffer);
        expect(mockSharpInstance.resize).toHaveBeenCalledWith(500, 500, expect.any(Object));
        expect(mockSharpInstance.toFile).toHaveBeenCalled();

        // 3. Verificamos que modificó el req.file.filename
        // El nombre debe contener el ID del usuario
        expect(req.file.filename).toContain('user123');
        expect(req.file.filename).toMatch(/.png$/); // Debe terminar en .png

        // 4. Verificamos next()
        expect(next).toHaveBeenCalled();
    });

    /**
     * CASO 3: Carpeta ya existe
     */
    it('no debería intentar crear la carpeta si ya existe', async () => {
        // Simulamos que la carpeta SÍ existe
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        await resizeProfileImage(req, res as Response, next);

        expect(fs.existsSync).toHaveBeenCalled();
        expect(fs.mkdirSync).not.toHaveBeenCalled(); // IMPORTANTE: No debe llamarse
        expect(next).toHaveBeenCalled();
    });

    /**
     * CASO 4: Error en Sharp
     */
    it('debería devolver error 500 si Sharp falla', async () => {
        // Simulamos que .toFile() explota
        mockSharpInstance.toFile.mockRejectedValue(new Error('Sharp error'));

        await resizeProfileImage(req, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Error al procesar la imagen' });
        expect(next).not.toHaveBeenCalled(); // Si falla, no debe seguir
    });
});