import express from "express";
import { createPlaylist, getPlaylists, getPlaylistById, updatePlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, sharePlaylistWithUser } from "../controllers/playlist_controller";

const router = express.Router();

router.post("/", createPlaylist);
router.get("/", getPlaylists);
router.get("/:id", getPlaylistById);
router.put("/:id", updatePlaylist);
router.delete("/:id", deletePlaylist);
router.post("/:id/songs", addSongToPlaylist);
router.delete("/:id/songs/:songId", removeSongFromPlaylist);
router.post("/:id/share", sharePlaylistWithUser);

export default router;
