import { Request, Response } from "express";
import Playlist from "../models/playlist_model";
import Song from "../models/song_model";
import mongoose from "mongoose";
import User from "../models/user_model"
import multer from "multer";

import fs from 'fs';
import path from 'path';

import Notification from "../models/notification_model"; 



export const createPlaylist = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    if (!user_id) return res.status(401).json({ message: "Token inválido o no proporcionado" });

    // 1. Crear la playlist
    const playlist = new Playlist({
      ...req.body,
      owner_: user_id,
    });

    const saved = await playlist.save();
    // 2. Notificar a los usuarios en owner_group_ si existen
    if (saved.owner_group_ && saved.owner_group_.length > 0) {
      // Obtenemos el nombre del usuario creador para el mensaje
      const owner = await User.findById(user_id);
      const ownerName = owner?.username_ || 'Alguien';

      // Recorremos cada usuario añadido al grupo
      for (const memberId of saved.owner_group_) {
        // Evitamos notificarnos a nosotros mismos si por error nos incluimos
        if (memberId.toString() === user_id) continue;

        try {
          await Notification.create({
            senderId_: user_id,
            receiverId_: memberId,
            type_: 'playlist_share', // Asegúrate de tener este tipo en tu modelo
            message_: `${ownerName} ha creado una playlist compartida contigo: "${saved.name_}"`,
            data_: {
              playlistId: saved._id,
              playlistName: saved.name_
            }
          });
        } catch (notifError) {
          console.error(`Error al notificar al usuario ${memberId}:`, notifError);
        }
      }
    }

    res.status(201).json({ message: "Playlist creada correctamente", playlist: saved });
  } catch (err) {
    res.status(400).json({ message: "Error al crear la playlist", error: err });
  }
};

export const getPlaylists = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;

    const playlists = await Playlist.find({
      $or: [
        { owner_: user_id },
        { owner_group_: user_id },
        { isPublic_: true }
      ]
    }).populate("songs_").populate("owner_", "username_").populate("owner_group_", "username_");

    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las playlists", error });
  }
};

export const getPlaylistById = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    const playlist = await Playlist.findById(req.params.id)
        .populate("songs_")
        .populate("owner_", "username_")
        .populate("owner_group_", "username_");

    if (!playlist) return res.status(404).json({ message: "Playlist no encontrada" });

    // 1. Verificar si es el dueño
    // Intentamos sacar el ID del objeto populado, si falla, usamos el valor directo
    const ownerId = (playlist.owner_ as any)?._id?.toString() || playlist.owner_.toString();
    const isOwner = ownerId === user_id;

    // 2. Verificar si está compartido (owner_group_)
    // Al estar populado, cada elemento es un objeto. Buscamos el ._id dentro de cada objeto.
    const isShared = Array.isArray(playlist.owner_group_) && playlist.owner_group_.some((member: any) => {
        // Si el miembro es un objeto (por el populate), sacamos su _id, si no, es el ID directo
        const memberId = member._id ? member._id.toString() : member.toString();
        return memberId === user_id;
    });

    // 3. Lógica de acceso
    if (!playlist.isPublic_ && !isOwner && !isShared) {
        return res.status(403).json({ message: 'Acceso denegado: playlist privada' });
    }

    res.json(playlist);
  } catch (error) {
    console.error("Error en getPlaylistById:", error);
    res.status(500).json({ message: "Error al obtener playlist", error });
  }
};

export const updatePlaylist = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user.id;
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) return res.status(404).json({ message: "Playlist no encontrada" });
    if (!playlist.isPublic_ && playlist.owner_.toString() !== user_id) return res.status(403).json({ message: "No tienes permiso para editar esta playlist privada" });
    
    const updates: any = {};

    if (req.body.name_ !== undefined) updates.name_ = req.body.name_;
    if (req.body.description_ !== undefined) updates.description_ = req.body.description_;
    if (req.body.cover_ !== undefined) updates.cover_ = req.body.cover_;
    if (typeof req.body.isPublic_ === "boolean") updates.isPublic_ = req.body.isPublic_;

   const updated = await Playlist.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    res.json({ message: "Playlist actualizada", playlist: updated });

  } catch (error) {
    res.status(500).json({ message: "Error al actualizar playlist", error });
  }
};


export const updatePlaylistCover = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se subió ningún archivo de imagen" });
    }
    const serverUrl = process.env.API_URL || "http://localhost:3000";
    const imageUrl = `${serverUrl}/uploads/${req.file.filename}`;
    const playlist = await Playlist.findByIdAndUpdate(
      id,
      { cover_: imageUrl }, // Guardamos la URL
      { new: true }
    );

    if (!playlist) {
      return res.status(404).json({ message: "Playlist no encontrada" });
    }
    res.json(playlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la portada" });
  }
};

export const deletePlaylist = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user.id;
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) return res.status(404).json({ message: "Playlist no encontrada" });
    if (playlist.owner_.toString() !== user_id) return res.status(403).json({ message: "No tienes permiso para eliminar esta playlist" });
    
    await playlist.deleteOne();
    res.json({ message: "Playlist eliminada correctamente" });

  } catch (error) {
    res.status(500).json({ message: "Error al eliminar playlist", error });
  }
};

export const addSongToPlaylist = async (req: Request, res: Response) => {
  try {
    const { song_title, youtube_url, genre } = req.body;
    const playlist_id = req.params.id;
    const user_id = (req as any).user.id;

    if (!song_title && !youtube_url) return res.status(400).json({ message: "Debe proporcionar un título o una URL de YouTube" });

    const playlist = await Playlist.findById(playlist_id);
    if (!playlist) return res.status(404).json({ message: "Playlist no encontrada" });
    

    const is_owner = playlist.owner_ && playlist.owner_.toString() === user_id;
    const is_group_member = Array.isArray(playlist.owner_group_) && playlist.owner_group_.some((id: any) => id.toString() === user_id);

    if (!is_owner && !is_group_member) {
      if (!playlist.isPublic_) return res.status(403).json({ message: "No tienes permiso para modificar esta playlist privada" });

      return res.status(403).json({ message: "Solo el dueño o el grupo pueden modificar playlists públicas" });
    }

    let song: any = null;

    if (youtube_url) song = await Song.findOne({ youtubeURL_: youtube_url });
    else if (song_title)song = await Song.findOne({ title_: song_title });
    
    if (!song) {
      let video_id = "";

      if (youtube_url) {
        try {
          const urlObj = new URL(youtube_url);
          video_id = urlObj.searchParams.get("v") || urlObj.pathname.split("/").filter(Boolean).pop() || "";
        } catch {}
      }

      song = new Song({
        title_: song_title || "Título desconocido",
        artist_: "Artista desconocido",
        youtubeURL_: youtube_url || "",
        thumbnailURL_: video_id
          ? `https://img.youtube.com/vi/${video_id}/hqdefault.jpg`
          : "https://placehold.co/200x200?text=Sin+Portada",
        genre_: genre || "Desconocido",
        uploadedAt_: new Date(),
        addedByUserId_: new mongoose.Types.ObjectId(String(user_id)),
      });

      await song.save();
    }

    const song_id = song._id as mongoose.Types.ObjectId;

    if (playlist.songs_.some((id: any) => id.equals(song_id))) return res.status(400).json({ message: "La canción ya está en la playlist" });
    
    playlist.songs_.push(song_id);
    await playlist.save();

    return res.status(200).json({ message: "Canción añadida con éxito", song });
  } catch (error) {
    console.error("Error al añadir la canción:", error);
    return res.status(500).json({ message: "Error al añadir la canción", error: error instanceof Error ? error.message : error });
  }
};

export const removeSongFromPlaylist = async (req: Request, res: Response) => {
  try {
    const playlist_id = req.params.id;
    const song_id = req.params.songId;
    const user_id = (req as any).user.id;

    const playlist = await Playlist.findById(playlist_id);
    if (!playlist) return res.status(404).json({ message: "Playlist no encontrada" });

    const is_owner = playlist.owner_.toString() === user_id;
    const is_group_member = playlist.owner_group_?.some((id) => id.toString() === user_id) ?? false;

    if (!is_owner && !is_group_member)
      return res.status(403).json({ message: "No tienes permiso para modificar esta playlist" });

    playlist.songs_ = playlist.songs_.filter(
      (song: mongoose.Types.ObjectId) => song.toString() !== song_id
    );

    await playlist.save();
    res.status(200).json({ message: "Canción eliminada correctamente", playlist });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la canción", error });
  }
};

export const sharePlaylistWithUser = async (req: Request, res: Response) => {
  try {
    const { target } = req.body;
    const playlist_id = req.params.id;
    const user_id = (req as any).user.id;

    if (!target || typeof target !== "string") return res.status(400).json({ message: "Debes indicar email o nombre de usuario" });

    // Verificamos que la playlist existe
    const playlist = await Playlist.findById(playlist_id);
    if (!playlist) return res.status(404).json({ message: "Playlist no encontrada" });

    if (playlist.owner_.toString() !== user_id) return res.status(403).json({ message: "Solo el dueño puede compartir la playlist" });
    

    // Buscar usuario al que se va a compartir
    const userToShare = await User.findOne({ $or: [{ email_: target }, { username_: target }] });
    if (!userToShare) return res.status(404).json({ message: "Usuario no encontrado" });

    if (userToShare._id!.toString() === user_id) return res.status(400).json({ message: "No puedes compartir la playlist contigo mismo" });

    // Evitar duplicados
    const already_shared = Array.isArray(playlist.owner_group_) && playlist.owner_group_.some((id) => id.toString() === userToShare._id!.toString());
    if (already_shared) return res.status(400).json({ message: "El usuario ya tiene acceso a esta playlist" });

    if (!Array.isArray(playlist.owner_group_)) playlist.owner_group_ = [];

    playlist.owner_group_.push(userToShare._id as mongoose.Types.ObjectId);
    await playlist.save();

    try {
      await Notification.create({
        senderId_: user_id, // Tú (el dueño)
        receiverId_: userToShare._id, // El amigo al que invitas
        type_: 'playlist_share', // El nuevo tipo que añadimos al modelo
        message_: `te ha invitado a colaborar en la playlist "${playlist.name_ || 'Sin nombre'}"`,
        data_: {
          playlistId: playlist._id,
          playlistName: playlist.name_
          // Puedes añadir cover_ si la playlist tiene portada
        }
      });
    } catch (notifError) {
      // No bloqueamos la respuesta si falla la notificación, solo lo logueamos
      console.error("Error al crear notificación de playlist:", notifError);
    }

    res.status(200).json({
      message: `Playlist compartida con ${userToShare.username_}`,
      sharedWith: userToShare.username_,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al compartir la playlist", error });
  }
};

export const unsharePlaylistWithUser = async (req: Request, res: Response) => {
  try {
    const { target } = req.body; // El email o username del usuario a eliminar
    const playlist_id = req.params.id;
    const user_id = (req as any).user.id; // Tú (el dueño)
    
    if (!target) return res.status(400).json({ message: "Faltan datos (usuario a eliminar)" });

    const userToUnshare = await User.findOne({ $or: [{ email_: target }, { username_: target }] });
    if (!userToUnshare) return res.status(404).json({ message: "Usuario a eliminar no encontrado" });

    const updatedPlaylist = await Playlist.findOneAndUpdate(
      { 
        _id: playlist_id, 
        owner_: user_id 
      },
      { 
        $pull: { owner_group_: userToUnshare._id } // Quitamos su ID del array
      },
      { new: true } // Para obtener la versión actualizada (opcional)
    );

    if (!updatedPlaylist) {
      return res.status(404).json({ message: "Playlist no encontrada o no tienes permiso" });
    }

    try {
      await Notification.create({
        senderId_: user_id,            // Tú envías la acción
        receiverId_: userToUnshare._id, // Él recibe el aviso
        type_: 'playlist_unshare',      // El nuevo tipo
        message_: `te ha eliminado de la playlist compartida "${updatedPlaylist.name_}"`,
        data_: {
          playlistName: updatedPlaylist.name_
          // No enviamos ID para redirigir porque ya no tiene acceso
        }
      });
    } catch (notifError) {
      console.error("Error creando notificación unshare:", notifError);
    }

    res.status(200).json({ message: `Acceso revocado para ${userToUnshare.username_}` });

  } catch (error) {
    res.status(500).json({ message: "Error al revocar acceso", error });
  }
};

export const deletePlaylistCover = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.id; // Asumiendo que usas verify_token

  try {
    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: "Playlist no encontrada" });

    // Verificar permisos (dueño)
    if (playlist.owner_.toString() !== userId) {
      return res.status(403).json({ message: "No tienes permiso" });
    }
    // 1. BORRAR ARCHIVO FÍSICO SI EXISTE
    if (playlist.cover_ && playlist.cover_.includes('/uploads/')) {
      // Extraemos el nombre del archivo de la URL
      const filename = playlist.cover_.split('/uploads/').pop();
      if (filename) {
        const filePath = path.join(process.cwd(), 'uploads', filename);
        // Usamos fs.unlink para borrar, ignorando errores si no existe
        fs.unlink(filePath, (err) => {
          if (err) console.log("No se pudo borrar el archivo físico antiguo:", err);
        });
      }
    }

    // ACTUALIZAR BASE DE DATOS
    playlist.cover_ = ""; 
    await playlist.save();
    res.json(playlist);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la portada" });
  }
};