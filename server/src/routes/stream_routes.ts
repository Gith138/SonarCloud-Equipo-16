import express from "express";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
const router = express.Router();

router.get("/stream/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    const audio_stream = ytdl(url, { filter: "audioonly", quality: "highestaudio", highWaterMark: 1 << 25, dlChunkSize: 0 });
    const ffmpeg_stream = new PassThrough();

    ffmpeg(audio_stream).audioBitrate(128).format("mp3").on("error", (err) => {
      console.error("Error en FFmpeg:", err);
      res.status(500).json({ message: "Error al convertir el audio" });
    }).pipe(ffmpeg_stream);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Accept-Ranges", "bytes");

    ffmpeg_stream.pipe(res);
  } catch (err) {
    res.status(500).json({ message: "Error al reproducir el audio" });
  }
});

export default router;