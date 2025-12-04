import dotenv from "dotenv";
import mongoose from "mongoose";
import  Song  from "../models/song_model";
import { inferGenreFromArtist } from "../recommendation/genre_inference";

dotenv.config();

// 👇 Usa la misma URI que en tu app.ts
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tempo";

// Función para sacar el artista real del título
function extractArtistFromTitle(title?: string, fallback?: string): string {
  if (!title) return fallback || "Artista desconocido";
  const delimiters = [" - ", " – ", " — "];

  for (const d of delimiters) {
    const idx = title.indexOf(d);
    if (idx > 0) {
      const raw = title.slice(0, idx);
      return raw.replace(/\[[^\]]*\]/g, "").trim();
    }
  }

  return fallback || "Artista desconocido";
}

async function runFix() {
  await mongoose.connect(MONGO_URI);
  console.log("Conectado a Mongo");

  const songs = await Song.find();
  console.log(`Encontradas ${songs.length} canciones.`);

  let updatedCount = 0;

  for (const song of songs) {
    let updated = false;
    const before = {
      title: song.title_,
      artist: song.artist_,
      genre: (song as any).genre_,
    };

    // Corregir artista si es canal / desconocido
    if (!song.artist_ || song.artist_.includes("VEVO") || song.artist_.includes("Records") ||  song.artist_.includes("channel") || song.artist_ === "Artista desconocido") {
      const newArtist = extractArtistFromTitle(song.title_, song.artist_);
      if (newArtist && newArtist !== song.artist_) {
        console.log(`Artista: "${before.artist}" → "${newArtist}"`);
        song.artist_ = newArtist;
        updated = true;
      }
    }

    // Inferir género si falta o es genérico
    const currentGenre = (song as any).genre_;
    if (!currentGenre || currentGenre === "YouTube" || currentGenre === "Otros" || currentGenre === "Otro") {
      const inferred = await inferGenreFromArtist(song.artist_);
      if (inferred) {
        console.log(`Género para "${song.artist_}": ${inferred}`);
        (song as any).genre_ = inferred;
        updated = true;
      }
    }

    if (updated) {
      await song.save();
      updatedCount++;
      console.log("Actualizada:", { before,
        after: {
          title: song.title_,
          artist: song.artist_,
          genre: (song as any).genre_,
        },
      });
    }
  }

  console.log(`Limpieza completada. Canciones actualizadas: ${updatedCount}`);
  await mongoose.disconnect();
  console.log("Desconectado de Mongo");
}

runFix().catch((err) => {
  console.error("Error en script de limpieza:", err);
});