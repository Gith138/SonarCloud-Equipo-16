import { Request } from 'express';
import { AuthenticatedMulterRequest, AuthRequest } from '../../src/type/express'; // Ajusta la ruta a donde guardaste ese código

describe('Type Definitions & Interfaces', () => {

    /**
     * TEST 1: Verificar la extensión global de Express (req.user)
     */
    it('debería permitir acceder a user.id en una Request estándar de Express', () => {
        // Creamos un objeto mock y lo forzamos a ser de tipo Request
        const req = {
            user: { id: '12345' }
        } as unknown as Request;

        // Si TypeScript no se queja aquí y el test pasa,
        // significa que tu "declare module 'express-serve-static-core'" funcionó.
        expect(req.user).toBeDefined();
        expect(req.user?.id).toBe('12345');
    });

    /**
     * TEST 2: Verificar AuthRequest
     */
    it('debería cumplir la estructura de AuthRequest', () => {
        // Simulamos una request autenticada
        const authReq: AuthRequest = {
            user: { id: 'user_id_123' },
            // Propiedades nativas de Request que ignoramos con el casting para el test
        } as unknown as AuthRequest;

        expect(authReq.user).toBeDefined();
        expect(authReq.user?.id).toBe('user_id_123');
    });

    /**
     * TEST 3: Verificar AuthenticatedMulterRequest
     */
    it('debería cumplir la estructura compleja de AuthenticatedMulterRequest', () => {
        // Este es el objeto complejo: tiene user, file y body tipado
        const multerReq: AuthenticatedMulterRequest = {
            user: { id: 'user_mul_123' },
            body: {
                username_: 'NuevoUser',
                email_: 'test@test.com',
                password_: '123'
            },
            // Simulamos el objeto File de Multer
            file: {
                fieldname: 'image',
                originalname: 'foto.png',
                encoding: '7bit',
                mimetype: 'image/png',
                buffer: Buffer.from('fake'),
                size: 1024
            } as Express.Multer.File
        } as unknown as AuthenticatedMulterRequest;

        // Verificaciones
        expect(multerReq.user?.id).toBe('user_mul_123');
        expect(multerReq.body.username_).toBe('NuevoUser');
        expect(multerReq.file).toBeDefined();
        expect(multerReq.file?.mimetype).toBe('image/png');
    });

    /**
     * TEST 4: Verificar opcionalidad
     * (Comprobamos que file y user son opcionales con ?)
     */
    it('debería permitir AuthenticatedMulterRequest sin archivo (file undefined)', () => {
        const reqWithoutFile: AuthenticatedMulterRequest = {
            body: { username_: 'SoloTexto' }
        } as unknown as AuthenticatedMulterRequest;

        expect(reqWithoutFile.file).toBeUndefined();
        expect(reqWithoutFile.body.username_).toBe('SoloTexto');
    });
});