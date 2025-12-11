import { Request, Response } from "express";
import User from "../models/user_model";
import Song from "../models/song_model";
import Notification from "../models/notification_model"; 
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import fs from "fs/promises";      
import path from "path";  
import { AuthenticatedMulterRequest } from "../type/express";

import { isValidObjectId } from "mongoose";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username_, email_, password_ } = req.body;
    if (!username_ || !email_ || !password_) return res.status(400).json({ message: "Faltan campos obligatorios" });

    const existing = await User.findOne({ email_ });
    if (existing) return res.status(400).json({ message: "El correo ya está registrado" });

    const hashedPassword = await bcrypt.hash(password_, 10);

    const user = new User({
      username_,
      email_,
      password_: hashedPassword,
      profilePictureUrl_: req.body.profilePictureUrl_ || "",
      friends_: [],
      friendRequests_: [],
      likedSongs_: [],
      history_: [],
    });

    const saved = await user.save();

    res.status(201).json({
      message: "Usuario registrado correctamente",
      user: {
        id: saved._id,
        username_: saved.username_,
        email_: saved.email_,
        profilePictureUrl_: saved.profilePictureUrl_,
        createdAt_: saved.createdAt_,
      },
    });

  } catch (err) {
    res.status(500).json({ message: "Error al registrar usuario", error: err });
  }
};

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await User.find().populate("friends_", "username_ email_ profilePictureUrl_").populate("likedSongs_", "title_ artist_ youtubeURL_ thumbnailURL_");
    const formattedUsers = users.map(user => ({
      id: user._id,
      username_: user.username_,
      email_: user.email_,
      profilePictureUrl_: user.profilePictureUrl_,
      friends_: user.friends_ || [],
      likedSongs_: user.likedSongs_ || [],
      createdAt_: user.createdAt_,
    }));
    res.json(formattedUsers);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener usuarios", error: err })
  }
};


/* export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).populate("friends_", "username_ email_ profilePictureUrl_").populate("likedSongs_", "title_ artist_ youtubeURL_ thumbnailURL_");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener usuario", error: err })
  }
}; */

export const getUserById = async (req: Request, res: Response) => {

  const { id } = req.params;
  if (!isValidObjectId(id)) {
     console.log(`[Seguridad] Se bloqueó una consulta con ID inválido: ${id}`);
     return res.status(400).json({ message: "ID de usuario inválido" });
  }
  try {
    const user = await User.findById(req.params.id)
      .populate("friends_", "username_ email_ profilePictureUrl_")
      .populate("likedSongs_", "title_ artist_ youtubeURL_ thumbnailURL_");
      
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener usuario", error: err })
  }
};


// Función para escapar caracteres especiales en regex
function escapeRegex(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// Convierte texto en regex parcial para coincidencias parciales
const makePartialRegex = (text: string) => {
  return `.*${escapeRegex(text.trim())}.*`;
};

// Buscar usuario por email o username (o ambos) (funciona)
export const searchUser = async (req: Request, res: Response) => {
  try {
    const { email, username, query } = req.query;
    const myId = req.user?.id; // ID del usuario que hace la búsqueda (para excluirlo)

    let searchFilters: any = {};

    if (email) searchFilters.email_ = { $regex: makePartialRegex(email.toString()), $options: "i" };
    if (username) searchFilters.username_ = { $regex: makePartialRegex(username.toString()), $options: "i" };

    if (query) {
      const q = makePartialRegex(query.toString());
      searchFilters.$or = [
        { email_: { $regex: q, $options: "i" } },
        { username_: { $regex: q, $options: "i" } }
      ];
    }

    // Excluir tu propio ID de los resultados
    if (myId) searchFilters._id = { $ne: myId };
    
    // Si no se envió ningún filtro
    if (Object.keys(searchFilters).length === 0) return res.status(400).json({ message: "Debes enviar email, username o query" });

    console.log("Filtros de búsqueda:", searchFilters);
    
    // Búsqueda real en MongoDB, case-insensitive y tildes ignoradas
    const users = await User.find(searchFilters)
      .collation({ locale: "es", strength: 1 }) //  Fuerza insensibilidad a mayúsculas y tildes
      .select("_id username_ email_ profilePictureUrl_");

    return res.json({ users });

  } catch (error) {
    console.error("Error al buscar usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// -----------------------------------------------------------------
// Funciones para el usuario autenticado
// -----------------------------------------------------------------

// Para los endpoints que necesitan el usuario autenticado que dentro del token(funciona)
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await User.findById(userId).select("username_ email_ profilePictureUrl_ friends_ likedSongs_");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el usuario", error });
  }
};


// Obtener foto de perfil del usuario autenticado
export const getFotoPerfil = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await User.findById(userId).select("profilePictureUrl_");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    
    let relativePath = user.profilePictureUrl_;
    console.log("Ruta guardada en BD:", relativePath);

    // Quitar el "/" inicial si existe
    if (relativePath.startsWith("/")) relativePath = relativePath.slice(1);
    console.log("Ruta relativa corregida:", relativePath);

    // Construimos la ruta absoluta correcta (dist/controllers → dist → raíz)
    const filePath = path.resolve(__dirname, "..", "..", relativePath);
    console.log("Ruta absoluta del archivo:", filePath);
    
    // Enviar el archivo
    return res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener foto de perfil",
      error,
    });
  }
};


// Actualizar settings de usuario (perfil)
export const actualizar_settings = async (req: AuthenticatedMulterRequest, res: Response) => { 
  try {
    const userId = req.user!.id; // Obtenemos el ID desde el JWT

    const { username_, email_, password_ } = req.body;
    const updateData: Partial<{
      username_: string;
      email_: string;
      password_: string;
      profilePictureUrl_?: string;
    }> = {};

    // Validar y asignar username
    if (username_) updateData.username_ = username_.trim();

    // Validar y asignar email
    if (email_) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email_)) return res.status(400).json({ message: "Email inválido" });
      
      updateData.email_ = email_;
    }

      // Hash password si aplica
    let passwordHashPromise: Promise<string> | null = null;
    if (password_ && password_.length >= 6) passwordHashPromise = bcrypt.hash(password_, 10);
    

    // Manejo de imagen
    let unlinkPromise: Promise<void> | null = null;
    if (req.file) {
      const currentUser = await User.findById(userId);

      if (currentUser?.profilePictureUrl_ && currentUser.profilePictureUrl_.startsWith("/assets/") && // ruta guardada empieza con /
        currentUser.profilePictureUrl_ !== `/assets/profiles/${req.file.filename}` // solo borrar si cambia
      ) {
        const oldImagePath = path.join(process.cwd(), currentUser.profilePictureUrl_);
        fs.unlink(oldImagePath).catch((err) =>
          console.error("Error al borrar imagen antigua:", err)
        );
      }

      // Guardamos la nueva ruta relativa
      updateData.profilePictureUrl_ = `/assets/profiles/${req.file.filename}`;
    }

      // Si no hay nada que actualizar
    if (Object.keys(updateData).length === 0 && !passwordHashPromise && !unlinkPromise) return res.status(400).json({ message: "No hay datos para actualizar" });
    

    // Ejecutar hash y unlink en paralelo si existen
    if (passwordHashPromise || unlinkPromise) {
      const [hashedPassword] = await Promise.all([ passwordHashPromise, unlinkPromise ]);
      if (hashedPassword) updateData.password_ = hashedPassword;
    }

    // Actualizar usuario en BD
    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, select: "-password_" });
    if (!updatedUser) return res.status(404).json({ message: "Usuario no encontrado" });

    console.log("Usuario actualizado:", updatedUser);
    return res.json({ message: "Perfil actualizado correctamente", user: updatedUser });
  } catch (error) {
    console.error("Error en settings:", error);
    return res.status(500).json({ message: "Error interno del servidor", error });
  }
};

// Obtener preferencias
export const getPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Buscamos al usuario
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // se crea si no lo tienes
    if (!user.preferences_) {
      console.log(`Usuario antiguo detectado (${user.username_}). Inicializando preferencias...`);
      
      user.preferences_ = {
        privateSession: false,
        showFriendActivity: true
      };

      // Guardamos el cambio en la base de datos para siempre
      await user.save();
    }

    // Ahora seguro que existe, lo devolvemos
    res.json(user.preferences_);
    
  } catch (error) {
    console.error("Error al obtener preferencias:", error);
    res.status(500).json({ message: "Error interno" });
  }
};

// Actualizar preferencias
export const actualizarPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { privateSession, showFriendActivity } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // Inicializar si no existe (Doble seguridad)
    if (!user.preferences_) {
      user.preferences_ = { 
        privateSession: false, 
        showFriendActivity: true 
      };
    }

    // Actualizar valores SOLO si vienen en la petición
    if (privateSession !== undefined) {
      user.preferences_.privateSession = privateSession;
    }
    
    if (showFriendActivity !== undefined) {
      user.preferences_.showFriendActivity = showFriendActivity;
    }

    await user.save();

    res.json({ 
      message: "Preferencias guardadas", 
      preferences: user.preferences_ 
    });
    
  } catch (error) {
    console.error("Error al actualizar:", error);
    res.status(500).json({ message: "Error al actualizar" });
  }
};

// Eliminar cuenta de usuario
export const deleteUser = async (req: Request, res: Response) => {
   try {
    const userId = req.user!.id;  // ← ESTE es el ID real del usuario autenticado

    if (!userId) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="Access to the protected resource"');
      return res.status(401).json({ message: "No autenticado" });
    }
    const deleted = await User.findByIdAndDelete(userId);

    if (!deleted) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar usuario", error: err });
  }
};

// -----------------------------------------------------------------
// Gestión de canciones favoritas
// -----------------------------------------------------------------


// Obtener canciones favoritas
export const getLikedSongs = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await User.findById(userId).populate("likedSongs_");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ likedSongs: user.likedSongs_ });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener canciones favoritas", error });
  }
};

// Añadir canción a favoritos
export const addLikedSong = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      _id,
      youtubeURL_,
      title_,
      artist_,
      thumbnailURL_,
      durationInSeconds_,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    if (!Array.isArray(user.likedSongs_)) user.likedSongs_ = [];

    let song;
    if (_id) song = await Song.findById(_id);

    if (!song && youtubeURL_) {
      song = await Song.findOne({ youtubeURL_ });

      if (!song) {
        song = new Song({
          title_: title_,
          artist_: artist_,
          thumbnailURL_: thumbnailURL_,
          youtubeURL_: youtubeURL_,
          durationInSeconds_: typeof durationInSeconds_ === "number" ? durationInSeconds_ : 0,
          uploadedAt_: new Date(),
          addedByUserId_: userId,
        });
        await song.save();
      }
    }
    
    if (!song) return res.status(404).json({ message: "Canción no encontrada" });

    const is_liked = user.likedSongs_.some((id: mongoose.Types.ObjectId) => id.toString() === song._id.toString());

    if (is_liked) return res.status(400).json({ message: "La canción ya está en favoritos" });

    if (user.likedSongs_.includes(song._id as mongoose.Types.ObjectId)) return res.status(400).json({ message: "La canción ya está en favoritos" });

    user.likedSongs_.push(song._id as mongoose.Types.ObjectId);
    await user.save();

    res.json({ message: `"${song.title_}" añadida a favoritos`, likedSongs_: user.likedSongs_ });
  } catch (error) {
    res.status(500).json({ message: "Error al añadir canción a favoritos", error });
  }
};

// Eliminar canción de favoritos
export const removeLikedSong = async (req: Request, res: Response) => {
  try {
    
    const { songId } = req.params;
     const userId = req.user!.id;
    if (!mongoose.Types.ObjectId.isValid(songId) && !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "ID de canción inválido" });
    }
   


    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const index = user.likedSongs_.findIndex((id) => id.toString() === songId);

    if (index === -1) return res.status(400).json({ message: "La canción no estaba en favoritos" });

    user.likedSongs_.splice(index, 1);
    await user.save();

    return res.json({ message: "Canción eliminada de favoritos", likedSongs_: user.likedSongs_ });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar canción de favoritos", error });
  }
};


// -----------------------------------------------------------------
// Historial de reproducción
// -----------------------------------------------------------------

// Obtener historial de reproducción
export const getHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await User.findById(userId).populate({
      path: "history_.songId",
      select: "title_ artist_ thumbnailURL_ durationInSeconds_"
    });

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    // Ordenar historial por fecha descendente y formatear fechas dia/mes/año hora minuto
    const sortedHistory = user.history_.slice().sort((a, b) => b.listenedAt.getTime() - a.listenedAt.getTime()).map(entry => ({
      song: entry.songId,
      rating: entry.rating,
      listenedAt: {
        iso: entry.listenedAt, // fecha en formato ISO (para backend o cálculo)
        formatted: entry.listenedAt.toLocaleString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      }
    }));

    res.json({ history: sortedHistory });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener historial de reproducción", error });
  }
};



// Añadir canción al historial de reproducción
export const addToHistory = async (req: Request, res: Response) => {
  try {
    const {
      songId,
      rating,
      youtubeURL_,
      title_,
      artist_,
      thumbnailURL_,
      durationInSeconds_,
    } = req.body;

    const userId = req.user!.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    let finalRating = Number(rating);
    if (!finalRating || isNaN(finalRating)) finalRating = 3;
    if (finalRating < 1) finalRating = 1;
    if (finalRating > 5) finalRating = 5;

    let finalSongId = songId as mongoose.Types.ObjectId | undefined;

    if (!finalSongId && youtubeURL_) {
      let song = await Song.findOne({ youtubeURL_ });

      if (!song) {
        song = new Song({
          title_: title_ || "Sin título",
          artist_: artist_ || "Desconocido",
          youtubeURL_,
          thumbnailURL_: thumbnailURL_ || "",
          durationInSeconds_:
            typeof durationInSeconds_ === "number" ? durationInSeconds_ : 0,
          uploadedAt_: new Date(),
          addedByUserId_: userId,
        });
        await song.save();
      }
      finalSongId = song._id as mongoose.Types.ObjectId;
    }

    if (!finalSongId) {
      return res.status(400).json({
        message: "Debes enviar songId o los datos de la canción (youtubeURL_, title_, ...)",
      });
    }

    user.history_.push({
      songId: finalSongId,
      rating: finalRating,
      listenedAt: new Date(),
    });
    await user.save();

    return res.json({ message: "Historial actualizado", history: user.history_ });
  } catch (error) {
    console.error("Error en addToHistory:", error);
    return res.status(500).json({ message: "Error al actualizar historial", error });
  }
};

// Borrar todo el historial de reproducción
export const clearHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    user.history_ = [];
    await user.save();

    res.json({ message: "Historial de reproducción borrado" });
  } catch (error) {
    res.status(500).json({ message: "Error al borrar historial de reproducción", error });
  }
};


export const getProfilePictureById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // --- ESCUDO OBLIGATORIO ---
  // Si llega "me", bloqueamos para que NO intente consultar la BD
  if (id === 'me' || !isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de imagen inválido. Usa /me/image para tu propio perfil." });
  }
  // --------------------------
  const user = await User.findById(id).select('profilePictureUrl_');
  if (!user || !user.profilePictureUrl_) return res.status(404).send("El usuario no tiene foto de perfil");

  const filePath = path.join(process.cwd(), user.profilePictureUrl_);

  try {
    const user = await User.findById(id).select("profilePictureUrl_");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

      await fs.access(filePath); 
      // Si llega aquí, el archivo existe y es accesible
      return res.sendFile(filePath);
    
  } catch (error) {
    console.log("Error al servir la imagen:", error); // <--- Este es el log que veíamos
    res.status(500).json({ message: "Error al obtener foto de perfil", error });
  }
};

// -----------------------------------------------------------------
// Amigos
// -----------------------------------------------------------------

export const addFriend = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { friendId } = req.body;

    if (!friendId) return res.status(400).json({ message: "friendId es obligatorio" });
    if (userId === friendId) return res.status(400).json({ message: "No puedes enviarte una solicitud a ti mismo" });

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) return res.status(404).json({ message: "Usuario o amigo no encontrado" });

    // Validaciones de amistad existente...
    if (user.friends_.some(id => id.toString() === friendId)) return res.status(400).json({ message: "Ya sois amigos" });
    if (friend.friendRequests_?.some(id => id.toString() === userId)) return res.status(400).json({ message: "Solicitud ya enviada" });

    // CASO ESPECIAL: Si él ya me había enviado solicitud (cruce de solicitudes), aceptamos directamente
    if (user.friendRequests_?.some(id => id.toString() === friendId)) {
      // 1. Limpiamos solicitud
      user.friendRequests_ = user.friendRequests_.filter(id => id.toString() !== friendId);
      
      // 2. Nos hacemos amigos mutuamente
      user.friends_.push(friend._id as mongoose.Types.ObjectId);
      friend.friends_.push(user._id as mongoose.Types.ObjectId);
      
      await user.save();
      await friend.save();

      // 3. 🔥 NOTIFICACIÓN DE ACEPTACIÓN AUTOMÁTICA (Para él)
      await Notification.create({
        senderId_: userId,
        receiverId_: friendId,
        type_: 'friend_accept',
        message_: `${user.username_} aceptó tu solicitud de amistad.`
      });

      return res.json({ message: "Solicitud mutua aceptada. Ya sois amigos." });
    }

    // CASO NORMAL: Enviar solicitud
    friend.friendRequests_ = friend.friendRequests_ || [];
    friend.friendRequests_.push(user._id as mongoose.Types.ObjectId);
    await friend.save();

    // 4. 🔥 CREAR NOTIFICACIÓN DE SOLICITUD (Para él)
    await Notification.create({
      senderId_: userId,
      receiverId_: friendId,
      type_: 'friend_request', // Asegúrate que este string coincida con tu enum en NotificationModel
      message_: `${user.username_} quiere ser tu amigo.`
    });

    return res.json({ message: "Solicitud de amistad enviada" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al enviar solicitud" });
  }
};

export const removeFriend = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { friendId } = req.body;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId); // Buscamos al amigo también

    if (!user || !friend) return res.status(404).json({ message: "Usuario no encontrado" });

    // 1. Me borro de su lista
    friend.friends_ = friend.friends_.filter(id => id.toString() !== userId);
    await friend.save();

    // 2. Lo borro de mi lista
    const index = user.friends_.indexOf(friendId);
    if (index === -1) return res.status(400).json({ message: "No era tu amigo" });
    
    user.friends_.splice(index, 1);
    await user.save();

    // Opcional: Podrías mandar notificación de "Ya no sois amigos", pero suele ser mejor hacerlo silencioso.
    
    res.json({ message: "Amigo eliminado correctamente" });
  } catch (error) {
     console.error(error);
    res.status(500).json({ message: "Error al eliminar amigo" });
  }
};

export const getFriendRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await User.findById(userId).populate("friendRequests_", "username_ email_ profilePictureUrl_");

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    
    return res.json(user.friendRequests_);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener solicitudes de amistad" });
  }
};


// Aceptar solicitud
export const acceptFriendRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;          // Yo (quien acepta)
    const { requesterId } = req.body;     // Él (quien envió)

    if (!requesterId) return res.status(400).json({ message: "requesterId es obligatorio" });

    const user = await User.findById(userId);
    const requester = await User.findById(requesterId);

    if (!user || !requester) return res.status(404).json({ message: "Usuario no encontrado" });

    // Verificar si existe la solicitud
    if (!user.friendRequests_?.some(id => id.toString() === requesterId)) {
        return res.status(400).json({ message: "No existe esta solicitud" });
    }

    // 1. Borrar de solicitudes
    user.friendRequests_ = user.friendRequests_.filter(id => id.toString() !== requesterId);

    // 2. Añadir a amigos (Evitar duplicados)
    if (!user.friends_.some(id => id.toString() === requesterId)) {
        user.friends_.push(requester._id as mongoose.Types.ObjectId);
    }
    if (!requester.friends_.some(id => id.toString() === userId)) {
        requester.friends_.push(user._id as mongoose.Types.ObjectId);
    }

    await user.save();
    await requester.save();

    // 3. 🔥 NOTIFICACIÓN DE ACEPTACIÓN (Para él)
    // Así él sabrá que ya le aceptaste
    await Notification.create({
      senderId_: userId,
      receiverId_: requesterId,
      type_: 'friend_accept',
      message_: `${user.username_} aceptó tu solicitud de amistad.`
    });

    return res.json({ message: "Solicitud aceptada, ahora sois amigos." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al aceptar solicitud" });
  }
};

// Rechazar solicitud
export const rejectFriendRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;          // Yo (quien rechaza)
    const { requesterId } = req.body;     // Él (quien envió)

    if (!requesterId) return res.status(400).json({ message: "requesterId es obligatorio" });

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // Verificar si existe la solicitud
    const hasRequest = user.friendRequests_?.some(id => id.toString() === requesterId);
    
    if (!hasRequest) {
        return res.status(400).json({ message: "No existe solicitud de amistad de este usuario" });
    }
    
    // 1. Eliminar la solicitud del array del Usuario
    user.friendRequests_ = user.friendRequests_!.filter(id => id.toString() !== requesterId);
    await user.save();

    // 2. Borrar la notificación visual de "X quiere ser tu amigo"
    // Buscamos la notificación que ME enviaron (receiver = userId)
    // desde ESA persona (sender = requesterId)
    // y que sea de tipo solicitud.
    await Notification.findOneAndDelete({
        receiverId_: userId,
        senderId_: requesterId,
        type_: "friend_request"
    });

    return res.json({ message: "Solicitud rechazada y notificación eliminada" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al rechazar solicitud" });
  }
};

export const getFriendsList = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // ya TypeScript sabe que user existe

    const user = await User.findById(userId).populate('friends_', 'username_ profilePictureUrl_');
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    

    res.json(user.friends_);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener lista de amigos" });
  }
};


export const getFriendsLastSong = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Buscamos al usuario y sus amigos
    // Importante: Asegurarnos de traer 'preferences_' de los amigos
    const user = await User.findById(userId).populate({
      path: "friends_",
      select: "username_ profilePictureUrl_ history_ preferences_", 
      populate: {
        path: "history_.songId",
        model: "Song"
      }
    });

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // ---------------------------------------------------------------
    //  Mi configuración (showFriendActivity)
    // ---------------------------------------------------------------
    // Si yo he desactivado "Ver actividad de amigos", devolvemos array vacío.
    if (user.preferences_ && user.preferences_.showFriendActivity === false) {
      return res.json([]); 
    }

    const result = user.friends_.map((friend: any) => {
      // Estructura base de respuesta
      const baseResponse = {
        friendId: friend._id,
        username: friend.username_,
        lastSong: null // Por defecto null
      };

      // ---------------------------------------------------------------
      //  La privacidad del amigo (privateSession)
      // ---------------------------------------------------------------
      // Si el amigo tiene sesión privada activada, devolvemos lastSong: null
      // y terminamos aquí para este amigo.
      if (friend.preferences_ && friend.preferences_.privateSession === true) {
        return baseResponse;
      }

      // Si no tiene historial, también devolvemos null
      if (!friend.history_ || friend.history_.length === 0) {
        return baseResponse;
      }

      // Lógica para encontrar la última canción
      const lastEntry = friend.history_.reduce((prev: any, curr: any) =>
        new Date(prev.listenedAt) > new Date(curr.listenedAt) ? prev : curr
      );

      // Si la canción fue borrada o hay error de datos
      if (!lastEntry || !lastEntry.songId) {
          return baseResponse;
      }

      return {
        friendId: friend._id,
        username: friend.username_,
        lastSong: {
          songId: lastEntry.songId._id,
          title: lastEntry.songId.title_,
          artist: lastEntry.songId.artist_,
          thumbnail: lastEntry.songId.thumbnailURL_,
          listenedAt: lastEntry.listenedAt,
          rating: lastEntry.rating
        }
      };
    });

    // Opcional: Si quieres enviar solo los que están escuchando algo, descomenta esto:
    // const activeFriends = result.filter((r: any) => r.lastSong !== null);
    // res.json(activeFriends);

    res.json(result);

  } catch (error) {
    console.error("Error en getFriendsLastSong:", error);
    res.status(500).json({ message: "Error al obtener últimas canciones de amigos" });
  }
};

export const updateHistoryRating = async (req: Request, res: Response) => {
  try {
   const userId = req.user!.id;
      const { songId, rating } = req.body;

      if (!songId) return res.status(400).json({ message: "songId es obligatorio" });
      
      let finalRating = Number(rating);
      if (!finalRating || isNaN(finalRating)) finalRating = 3;
      if (finalRating < 1) finalRating = 1;
      if (finalRating > 5) finalRating = 5;

      const user = await User.findById(userId);
      if (!user)  return res.status(404).json({ message: "Usuario no encontrado" });
      if (!user.history_ || user.history_.length === 0) return res.status(404).json({ message: "No hay historial para actualizar" });
      
      let updated = false;

      // Actualizamos la valoración de todas las entradas de esa canción
      user.history_.forEach((entry: any) => {
        if (entry.songId.toString() === songId) {
          entry.rating = finalRating;
          updated = true;
        }
      });

      if (!updated) return res.status(404).json({ message: "La canción no está en tu historial" });
      await user.save();

      return res.json({ message: "Valoración actualizada", songId, rating: finalRating });
    } catch (error) {
      console.error("Error al actualizar rating:", error);
      return res.status(500).json({ message: "Error al actualizar valoración", error });
    }
  };