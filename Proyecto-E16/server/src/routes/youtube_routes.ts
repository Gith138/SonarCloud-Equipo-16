import express from "express";
import axios from "axios";
import { fetchYouTubeSongsByArtist } from "../recommendation/youtube_recommendation";

const router = express.Router();

router.get("/youtube/search", async (req, res) => {
  try {
    const YT_API_KEY = process.env.YT_API_KEY;
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: "Falta el parámetro 'q'" });

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(q as string)}&key=${YT_API_KEY}`;

    const response = await axios.get<{ items: any[] }>(url);
    const results = response.data.items.map((item: any) => ({
      title_: item.snippet.title,
      artist_: item.snippet.channelTitle,
      youtubeURL_: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnailURL_: item.snippet.thumbnails.medium.url,
    }));

    res.json(results);
  } catch (error: any) {
    console.error("Error al buscar en YouTube:", error.message);
    res.status(500).json({ message: "Error al buscar en YouTube", error: error.message });
  }
});

router.get("/youtube/artist", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: "Missing artist name" });

    const songs = await fetchYouTubeSongsByArtist(q as string);

    res.json(songs);

  } catch (err: any) {
    console.error("Error buscando canciones por artista:", err.message);
    res.status(500).json({ message: "Error buscando canciones por artista" });
  }
});

export default router;