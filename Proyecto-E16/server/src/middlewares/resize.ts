import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const resizeProfileImage = async (req: MulterRequest, res: Response, next: NextFunction) => {
  // Si no subieron foto, pasamos al controlador directamente
  if (!req.file) return next();

  const userId =  req.user!.id;
    
  // 1. DEFINIR LA RUTA FÍSICA: 'Raíz del Proyecto / assets / profiles'
  // process.cwd() apunta a la carpeta raíz donde está el package.json
  const uploadPath = path.join(process.cwd(), 'assets', 'profiles');

  // 2. Crear carpetas si no existen
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  // 3. Definir el nombre del archivo
  // Agregamos Date.now() para evitar problemas de caché si el usuario sube otra foto luego
  const filename = `${userId}-${Date.now()}.png`;
  const fullPath = path.join(uploadPath, filename);

  try {
    // 4. Procesar y Guardar con Sharp
    await sharp(req.file.buffer)
          .resize(500, 500, {
          fit: 'cover',
          position: 'center'
          })
          .toFormat('png')
          .png({ quality: 80 })
          .toFile(fullPath); // <--- AQUÍ SE GUARDA EL ARCHIVO FÍSICO

    // 5. INYECTAR EL NOMBRE EN LA REQUEST
    // Esto es vital para que tu controlador sepa cómo se llamó el archivo
    req.file.filename = filename;
        
    next();
  } catch (error) {
    console.error('Error al procesar imagen:', error);
    return res.status(500).json({ message: 'Error al procesar la imagen' });
  }
};
