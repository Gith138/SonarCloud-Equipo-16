import { Request, Response } from "express";
import Song from "../models/song_model";

export const createSong = async (req: Request, res: Response) => {
  try {
    const song = new Song(req.body);
    await song.save();
    res.status(201).json(song);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getSongs = async (_req: Request, res: Response) => {
  try {
    const songs = await Song.find();
    res.status(200).json(songs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getSongById = async (req: Request, res: Response) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: "Song not found" });
    res.status(200).json(song);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateSong = async (req: Request, res: Response) => {
  try {
    const updatedSong = await Song.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedSong) return res.status(404).json({ error: "Song not found" });
    res.status(200).json(updatedSong);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const deleteSong = async (req: Request, res: Response) => {
  try {
    const deleted = await Song.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Song not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
