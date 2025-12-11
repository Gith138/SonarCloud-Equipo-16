import { Request, Response } from "express";
import Playlist from "../models/playlist_model";
import Song from "../models/song_model";
import mongoose from "mongoose";
import User from "../models/user_model";

export const createPlaylist = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    if (!user_id) return res.status(401).json({ message: "Token inválido o no proporcionado" });

    const playlist = new Playlist({
      ...req.body,
      owner_: user_id,
    });

    const saved = await playlist.save();
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

/* export const getPlaylistById = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    const playlist = await Playlist.findById(req.params.id).populate("songs_").populate("owner_", "username_").populate("owner_group_", "username_");

    if (!playlist) return res.status(404).json({ message: "Playlist no encontrada" });

    const is_owner = (playlist.owner_ as any)?._id?.toString() ?? (playlist.owner_ as any).toString();
    const is_shared_user = Array.isArray(playlist.owner_group_) && playlist.owner_group_.some((id: any) => id.toString() === user_id);
    
    if (!playlist.isPublic_ && !is_owner && !is_shared_user) return res.status(403).json({ message: "Acceso denegado: playlist privada" });

    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener playlist", error });
  }
}; */

export const getPlaylistById = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    const playlist = await Playlist.findById(req.params.id)
        .populate("songs_")
        .populate("owner_", "username_")
        .populate("owner_group_", "username_");

    if (!playlist) return res.status(404).json({ message: "Playlist no encontrada" });

    // 👇 CORRECCIÓN AQUÍ 👇
    // 1. Obtenemos el ID del dueño
    const ownerId = (playlist.owner_ as any)?._id?.toString() ?? (playlist.owner_ as any).toString();
    
    // 2. Comparamos si es igual al usuario logueado (Devuelve true/false)
    const is_owner = ownerId === user_id; 

    const is_shared_user = Array.isArray(playlist.owner_group_) && playlist.owner_group_.some((id: any) => id.toString() === user_id);
    
    // Ahora esta lógica funcionará bien
    if (!playlist.isPublic_ && !is_owner && !is_shared_user) return res.status(403).json({ message: "Acceso denegado: playlist privada" });

    res.json(playlist);
  } catch (error) {
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

    res.status(200).json({
      message: `Playlist compartida con ${userToShare.username_}`,
      sharedWith: userToShare.username_,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al compartir la playlist", error });
  }
};