import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { verify_token } from "./middlewares/auth_middleware";

dotenv.config(); 

import songsRoutes from "./routes/song_routes";
import usersRoutes from "./routes/user_routes";
import playlistsRoutes from "./routes/playlist_routes";
import authRoutes from "./routes/auth_routes";
import streamRoutes from "./routes/stream_routes";
import youtubeRoutes from "./routes/youtube_routes";
import recommendationRoutes from "./routes/recommendation_routes";
import notificationRoutes from "./routes/notification_routes";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/assets", express.static(path.join(process.cwd(), "assets")));

// ---------------------------------------------------------
// Conectar a MongoDB PRIMERO
// ---------------------------------------------------------
mongoose.connect(process.env.MONGO_URI!)
  .then(() => {
    console.log("Conectado a MongoDB");

    // ---------------------------------------------------------
    // 1. ZONA PÚBLICA (Sin Token)
    // ---------------------------------------------------------
    app.use("/api/auth", authRoutes);
    app.use("/api", youtubeRoutes);

    // ---------------------------------------------------------
    // 2. ZONA PROTEGIDA (Requiere Token)
    // ---------------------------------------------------------
    app.use(verify_token);
    app.use("/api/songs", songsRoutes);
    app.use("/api/users", usersRoutes);
    app.use("/api/playlists", playlistsRoutes);
    app.use("/api", streamRoutes);
    app.use("/api", recommendationRoutes);
    app.use("/api/notifications", notificationRoutes);

    // ---------------------------------------------------------
    // 3. LEVANTAR SERVIDOR
    // ---------------------------------------------------------
    app.listen(3000, '0.0.0.0', () => { console.log("Servidor escuchando en puerto 3000"); });
  })
  .catch(err => console.error("Error de conexión:", err));

export default app;
