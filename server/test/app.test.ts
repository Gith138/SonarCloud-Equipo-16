import request from 'supertest';
import mongoose from 'mongoose';
import http from 'http';

/* // 1. MOCK DE MONGOOSE
jest.mock('mongoose', () => ({
    connect: jest.fn().mockResolvedValue(true),
    Schema: {},
    model: jest.fn(),
}));
 */
// En test/app.test.ts

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose'); // Importante para mantener ObjectId real
  return {
    ...actualMongoose, // Mantenemos todo lo original...
    connect: jest.fn().mockResolvedValue(true), // ...excepto connect
    // NO mockeamos Schema ni model aquí para evitar romper los modelos reales que app.ts importa
  };
});

// 2. MOCK DE LAS RUTAS
const mockRoute = (req: any, res: any) => res.status(200).send('Mocked Route OK');
jest.mock('../src/routes/song_routes', () => mockRoute);
jest.mock('../src/routes/user_routes', () => mockRoute);
jest.mock('../src/routes/playlist_routes', () => mockRoute);
jest.mock('../src/routes/auth_routes', () => mockRoute);
jest.mock('../src/routes/stream_routes', () => mockRoute);
jest.mock('../src/routes/youtube_routes', () => mockRoute);
jest.mock('../src/routes/recommendation_routes', () => mockRoute);

// 3. MOCK DEL MIDDLEWARE DE AUTH
jest.mock('../src/middlewares/auth_middleware', () => ({
    verify_token: (req: any, res: any, next: any) => next()
}));

describe('App Entry Point (app.ts)', () => {
    let serverSpy: jest.SpyInstance;
    let app: any;

    beforeAll(async () => {
        // --- AQUÍ ESTÁ EL ARREGLO ---
        
        // A. Guardamos la función original ANTES de que Jest la toque
        const originalListen = http.Server.prototype.listen;

        // B. Creamos el espía
        serverSpy = jest.spyOn(http.Server.prototype, 'listen').mockImplementation(function (this: any, ...args: any[]) {
            const port = args[0];
            
            // Si es tu app.ts (puerto 3000), bloqueamos
            if (port === 3000) {
                return {} as any; 
            }
            
            // Si es Supertest, llamamos a la ORIGINAL que guardamos arriba
            // (Ya no usamos actualHttp, usamos la referencia guardada)
            return originalListen.apply(this, args as [any, (() => void) | undefined]);
        });

        // -----------------------------

        // 5. IMPORTAR LA APP
        const appModule = require('../src/app');
        app = appModule.default;

        // 6. ESPERA ASÍNCRONA
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    afterAll(() => {
        if (serverSpy) serverSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('debería intentar conectar a MongoDB', () => {
        expect(mongoose.connect).toHaveBeenCalled();
    });

    it('debería registrar las rutas públicas (YouTube)', async () => {
        const res = await request(app).get('/api/search?q=test'); 
        expect(res.status).toBe(200); 
        expect(res.text).toBe('Mocked Route OK');
    });

    it('debería registrar las rutas protegidas (Songs)', async () => {
        const res = await request(app).get('/api/songs');
        expect(res.status).toBe(200);
        expect(res.text).toBe('Mocked Route OK');
    });

    it('debería registrar las rutas de autenticación', async () => {
        const res = await request(app).post('/api/auth/login');
        expect(res.status).toBe(200);
        expect(res.text).toBe('Mocked Route OK');
    });

    it('debería intentar levantar el servidor en puerto 3000', () => {
        expect(serverSpy).toHaveBeenCalledWith(3000, '0.0.0.0', expect.any(Function));
    });
});