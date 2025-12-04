import axios from "axios";

const YOUTUBE_API_KEY = process.env.YT_API_KEY;

interface YouTubeSearchResponse {
  items: {
    id: { videoId: string };
    snippet: {
      title: string;
      channelTitle: string;
      thumbnails: { 
        high: { url: string }; 
        medium?: { url: string };
        default?: { url: string };
      };
    };
  }[];
}

const EXCLUDED_TITLE_KEYWORDS = [
  // Shorts
  "shorts", "#shorts", "youtubeshorts",

  // Playlists / mixes / recopilatorios
  "playlist", "mix", "medley", "full album", "compilation", "greatest hits", "70s", "80s", "90s", 
  "2000s", "2010s", "all time", "best of", "classic rock", "greatest rock", "#altrock",

  // Vídeos de “ranking” tipo BEST/TOP
  "best ", "top ",

  // Directos / música de fondo infinita
  "24/7", "24／7", "non stop", "non-stop", "live stream", "live radio", "loop",

  // Cosas muy de BGM / café
  "bgm", "study music", "study playlist", "cafe", "coffee shop", "lofi", "lo-fi", "soda pop",

  // En japonés, típicos de BGM/medley
  "メドレー", "カフェ" , "#jpop", "kpop" 
];

const EXCLUDED_CHANNEL_KEYWORDS = ["music media", "party tunes", "Adela Anghelici"];

export const fetchYouTubeSongs = async (query: string, maxResults = 10) => {
  try {
    if (!YOUTUBE_API_KEY) {
      console.warn("YT_API_KEY no está configurada en el .env");
      return [];
    }

    // Pedimos más resultados para poder filtrar
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults * 4}&key=${YOUTUBE_API_KEY}`;

    const response = await axios.get<YouTubeSearchResponse>(url);
    const items = response.data.items || [];

    const validItems = items.filter((item) => {
      const titleLc = (item.snippet.title || "").toLowerCase();
      const channelLc = (item.snippet.channelTitle || "").toLowerCase();

      // Palabras clave prohibidas en título
      if (EXCLUDED_TITLE_KEYWORDS.some((bad) => titleLc.includes(bad))) return false;

      // Títulos tipo “best jpop songs”, “top rap songs”...
      if ((titleLc.includes("best ") || titleLc.includes("top ")) && (titleLc.includes(" song") || titleLc.includes(" songs"))) return false;
      
      // Canales sospechosos de subir mixes/listas
      if (EXCLUDED_CHANNEL_KEYWORDS.some((bad) => channelLc.includes(bad))) return false;
      
      const commaCount = (titleLc.match(/,/g) || []).length;
      if (commaCount >= 3) return false;
      
      return true;
    });

    const songs = validItems.slice(0, maxResults).map((item: any) => {
      const title = item.snippet.title;
      const channel = item.snippet.channelTitle || "Artista desconocido";

      const artist = extractArtistFromTitle(title, channel);

      return {
        title_: title,
        artist_: artist,
        youtubeURL_: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnailURL_:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default?.url ||
          "",
        // El recomendador le asignará el género adecuado
        genre_: undefined as string | undefined,
        durationInSeconds_: 0,
        uploadedAt_: new Date(),
      };
    });

    return songs;
  } catch (error: any) {
    console.error("Error obteniendo canciones desde YouTube:", error.message);
    return [];
  }
};

export const fetchYouTubeSongsByArtist = async (artist: string, maxResults = 10) => {
  try {
    // Un poco más específico para pillar canciones “normales”
    const query = `${artist} official music video`;
    return await fetchYouTubeSongs(query, maxResults);
  } catch (error: any) {
    console.error("Error en fetchYouTubeSongsByArtist:", error.message);
    return [];
  }
};

export function extractArtistFromTitle(title: string, fallback: string): string {
  if (!title) return fallback;

  const delimiters = [" - ", " – ", " — "];

  for (const d of delimiters) {
    const idx = title.indexOf(d);
    if (idx > 0) {
      const raw = title.slice(0, idx);
      return raw.replace(/\[[^\]]*\]/g, "").trim();
    }
  }

  return fallback;
}