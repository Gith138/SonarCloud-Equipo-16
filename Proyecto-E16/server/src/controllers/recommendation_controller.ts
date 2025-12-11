import { Request, Response } from "express";
import { recommendFromLikes, buildInternalPlaylists, buildExternalPlaylistFromUserLikes} from "../recommendation/recommendation";
import { getGlobalPopularityRecommendations } from "../recommendation/initial_recommendation"; 
import User from "../models/user_model";

export const recommendation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await User.findById(userId).populate("likedSongs_");

    if (!user) {
      return res.json({
        recommendations: [],
        playlists: [],
        externalPlaylist: null,
      });
    }

    const hasLikes = Array.isArray((user as any).likedSongs_) && (user as any).likedSongs_.length > 0;
    const hasHistory = Array.isArray((user as any).history_) && (user as any).history_.length > 0;

    let recommendations: any[] = [];
    let internalPlaylists: any[] = [];
    let externalPlaylist: any = null;


    if (!hasLikes && !hasHistory) {
      const globalSongs = await getGlobalPopularityRecommendations(40);
      recommendations = globalSongs;
      internalPlaylists = buildInternalPlaylists(globalSongs);
      externalPlaylist = null;
    } else {
      recommendations = await recommendFromLikes(user);
      internalPlaylists = buildInternalPlaylists(recommendations);
      externalPlaylist = await buildExternalPlaylistFromUserLikes(userId);
    }

    return res.json({
      recommendations,
      playlists: internalPlaylists,
      externalPlaylist,
    });
  } catch (error) {
    console.error("Error en recommendation:", error);
    res.status(500).json({ message: "Error generando recomendaciones" });
  }
};