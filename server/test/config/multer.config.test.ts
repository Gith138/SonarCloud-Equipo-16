import { upload } from '../../src/config/multer'; // Ajusta la ruta a tu archivo real
import multer from 'multer';

describe('Multer Configuration', () => {
  /**
   * TEST 1: Configuración de Almacenamiento
   */
  it('debería usar MemoryStorage', () => {
    // Accedemos a la propiedad interna 'storage'
    const storageEngine = (upload as any).storage;
    
    // Multer MemoryStorage no tiene un nombre de clase fácil de leer a veces,
    // pero podemos verificar que NO sea DiskStorage comprobando si tiene métodos específicos
    // o simplemente confiando en la configuración.
    
    // Una forma efectiva es ver si la función getDestination existe (típica de DiskStorage)
    // MemoryStorage no la tiene.
    expect(storageEngine.getDestination).toBeUndefined();
  });

  /**
   * TEST 2: Límites de Tamaño
   */
  it('debería tener un límite de archivo de 5MB', () => {
    // TypeScript a veces oculta las propiedades internas de Multer, usamos 'any' para leerlas
    const limits = (upload as any).limits;
    
    expect(limits).toBeDefined();
    expect(limits.fileSize).toBe(5 * 1024 * 1024); // 5242880 bytes
  });

  /**
   * TEST 3: FileFilter (Lógica de validación)
   */
  describe('fileFilter logic', () => {
    // Extraemos la función fileFilter de la instancia de upload
    const fileFilter = (upload as any).fileFilter;

    // Mock del callback de Multer (cb)
    // cb(error, acceptFile)
    let cb: jest.Mock;
    let req: any;

    beforeEach(() => {
      cb = jest.fn();
      req = {}; // Request vacía simulada
    });

    it('debería ACEPTAR imágenes con mimetype válido (jpeg, png, webp)', () => {
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

      validMimeTypes.forEach((mime) => {
        const file = {
          originalname: 'test.img',
          mimetype: mime
        };

        // Ejecutamos tu función manualmente
        fileFilter(req, file, cb);

        // Esperamos cb(null, true)
        expect(cb).toHaveBeenCalledWith(null, true);
        
        // Limpiamos el mock para la siguiente vuelta del loop
        cb.mockClear();
      });
    });

    it('debería RECHAZAR archivos con mimetype inválido (pdf, gif, text)', () => {
      const invalidFiles = [
        { mimetype: 'application/pdf' },
        { mimetype: 'text/plain' },
        { mimetype: 'image/gif' }, // No está en tu lista permitida
        { mimetype: 'application/octet-stream' }
      ];

      invalidFiles.forEach((file: any) => {
        fileFilter(req, file, cb);

        // Esperamos que el primer argumento sea un Error
        expect(cb).toHaveBeenCalledWith(expect.any(Error));
        
        // Opcional: Verificar el mensaje de error exacto
        const errorArg = cb.mock.calls[0][0]; // Primer argumento de la primera llamada
        expect(errorArg.message).toBe("Solo se permiten imágenes JPG, PNG o WEBP");

        cb.mockClear();
      });
    });
  });
});