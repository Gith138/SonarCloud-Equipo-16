import express from "express";

import { createPlaylist, getPlaylists, getPlaylistById, updatePlaylist, updatePlaylistCover, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, sharePlaylistWithUser, unsharePlaylistWithUser } from "../controllers/playlist_controller";
import { upload } from "../config/multer";
import { resizePlaylistCover } from "../middlewares/resize";
import { deletePlaylistCover } from "../controllers/playlist_controller";


const router = express.Router();

router.post("/", createPlaylist);
router.get("/", getPlaylists);
router.get("/:id", getPlaylistById);
router.put("/:id", updatePlaylist);
router.delete("/:id", deletePlaylist);
router.post("/:id/songs", addSongToPlaylist);
router.delete("/:id/songs/:songId", removeSongFromPlaylist);
router.post("/:id/share", sharePlaylistWithUser);
router.delete('/:id/share', unsharePlaylistWithUser);
router.put("/:id/cover", upload.single("cover"), resizePlaylistCover, updatePlaylistCover);
router.delete('/:id/cover', deletePlaylistCover);

export default router;