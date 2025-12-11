import express from "express";
import { resizeProfileImage } from "../middlewares/resize";
import { upload } from "../config/multer";
import { registerUser, getUsers, getProfilePictureById, getMe, deleteUser, actualizar_settings, getFotoPerfil,
  getPreferences, actualizarPreferences,
  getUserById, searchUser, addLikedSong, removeLikedSong, getLikedSongs,addToHistory, getHistory, clearHistory, 
  updateHistoryRating, getFriendsList, getFriendsLastSong, addFriend, removeFriend, getFriendRequests, 
  acceptFriendRequest, rejectFriendRequest } from "../controllers/user_controller";


const router = express.Router();

router.post("/", registerUser);
router.get("/", getUsers);

router.get("/me", getMe);
router.delete("/me", deleteUser);
router.get("/me/image",  getFotoPerfil);

// ---------- Gestión de configuración del usuario ----------

router.put("/me/settings", upload.single("profilePicture"), resizeProfileImage, actualizar_settings);
// ----- Búsqueda de usuarios ----- 
router.get("/search/user", searchUser);

// ------ Gestión de preferencias de canciones ------
router.get("/me/settings/preferences", getPreferences); // Obtener preferencias del usuario
router.put("/me/settings/preferences", actualizarPreferences); // Actualizar preferencias del usuario

// ----- Gestión de canciones -----
router.get("/me/likes", getLikedSongs); // Obtener canciones favoritas del usuario
router.post("/me/likes", addLikedSong);
router.delete("/me/likes/:songId", removeLikedSong); 

// ----- Gestion de historial -----
router.get("/me/history", getHistory); // Obtener historial de reproducción
router.post("/me/history", addToHistory);
router.delete("/me/history/clear", clearHistory);
router.put("/me/history/rating", updateHistoryRating);

// ----- Gestion de amigos -----
router.get("/friends/list", getFriendsList);           // Obtener lista de amigos del usuario
router.get("/friends/activity", getFriendsLastSong);  // Obtener última actividad de los amigos
router.put("/friends/add", addFriend);                // Añadir amigo (recibe friendId en body)
router.delete("/friends/remove", removeFriend);          // Eliminar amigo (recibe friendId en body)


// ----- Solicitudes de amistad -----
router.get("/friends/requests", getFriendRequests);
router.put("/friends/requests/accept", acceptFriendRequest);
router.put("/friends/requests/reject", rejectFriendRequest);

// Rutas “por ID” (para otros usuarios)
router.get("/:id", getUserById);
router.get("/:id/image", getProfilePictureById);

export default router;