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
  const uploadPath = path.join(process.cwd(), 'assets', 'profiles');
  // Crear carpetas si no existen
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  // Definir el nombre del archivo
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
        .toFile(fullPath); // Guardar en disco
    req.file.filename = filename;
        
    next();
  } catch (error) {
    console.error('Error al procesar imagen:', error);
    return res.status(500).json({ message: 'Error al procesar la imagen' });
  }
};


export const resizePlaylistCover = async (req: MulterRequest, res: Response, next: NextFunction) => {
  // Si no hay archivo, pasamos
  if (!req.file) return next();

  try {
    const playlistId = req.params.id; 
    // Usamos process.cwd() para ir a la raíz del SERVIDOR (donde está package.json)
    // Apuntamos a la carpeta 'uploads' (que ya hicimos pública en app.ts)
    const uploadDir = path.join(process.cwd(), 'uploads');

    // Crear la carpeta si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    // Nombre del archivo
    const filename = `playlist-${playlistId}-${Date.now()}.png`;
    const fullPath = path.join(uploadDir, filename);

    // Guardar con Sharp
    await sharp(req.file.buffer)
      .resize(800, 800, { fit: 'cover' })
      .toFormat('png')
      .png({ quality: 80 })
      .toFile(fullPath);
    // Le decimos al controlador cómo se llama el archivo
    req.file.filename = filename;

    next();
  } catch (error) {
    console.error('Error al procesar portada de playlist:', error);
    return res.status(500).json({ message: 'Error al procesar la portada de la playlist' });
  }
};