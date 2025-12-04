import { Request, Response } from "express";
import { recommendFromLikes, buildInternalPlaylists, buildExternalPlaylistFromUserLikes} from "../recommendation/recommendation";
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

    const recommendations = await recommendFromLikes(user);
    const internalPlaylists = buildInternalPlaylists(recommendations);
    const externalPlaylist = await buildExternalPlaylistFromUserLikes(userId);

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


/*export const recommendation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const { users, songs, matrix } = await buildUtilityMatrix();

    if (!users.length || !songs.length) {
      return res.json({
        recommendations: [],
        playlists: [],
        externalPlaylist: null,
      });
    }

    const userIndex = users.findIndex(
      (u: any) => u._id.toString() === userId
    );

    if (userIndex === -1) {
      return res.json({
        recommendations: [],
        playlists: [],
        externalPlaylist: null,
      });
    }

    const similarities = computeItemSimilarities(matrix);
    const withScores = recommendedForUser(
      userIndex,
      matrix,
      similarities,
      songs,
      20 
    );

    const recommendations = withScores.map((r) => r.song);

    const playlists = buildInternalPlaylistsFromRecommendations(recommendations);
    const externalPlaylist = await buildExternalPlaylistFromUserLikes(userId);

    return res.json({
      recommendations,
      playlists,
      externalPlaylist,
    });
  } catch (error) {
    console.error("Error en recommendation:", error);
    return res.status(500).json({ message: "Error generando recomendaciones" });
  }
};*/