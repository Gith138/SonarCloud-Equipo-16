import axios from "axios";

// Mapeo de etiquetas Last.fm → géneros generales
const TAG_GENRE_MAP: Record<string, string> = {
  // Rap / Hip Hop
  rap: "Rap",
  "hip hop": "Rap",
  "hip-hop": "Rap",

  // Clásica
  classical: "Clasica",
  symphonic: "Clasica",
  orchestral: "Clasica",

  // Rock
  rock: "Rock",
  "hard rock": "Rock",
  "alternative rock": "Rock",

  // J-Pop / J-Rock / Anime
  "j-pop": "J-Pop",
  jpop: "J-Pop",
  anime: "J-Pop",
  anisong: "J-Pop",
  "j-rock": "J-Rock",
  jrock: "J-Rock",

  // K-Pop
  "k-pop": "K-Pop",
  kpop: "K-Pop",
  kdrama: "K-Pop",

  // Otros géneros
  pop: "Pop",
  metal: "Metal",
  "heavy metal": "Metal",
  trap: "Trap",
  reggaeton: "Reggaeton",
  salsa: "Salsa",
  bachata: "Bachata",
};

const artistGenreCache = new Map<string, string | null>();

export async function inferGenreFromArtist(artist: string): Promise<string | null> {
  if (!artist) return null;

  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    console.warn("LASTFM_API_KEY no está configurada en el .env (dentro de inferGenreFromArtist)");
    return null;
  }

  if (artistGenreCache.has(artist)) return artistGenreCache.get(artist)!;

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist)}&api_key=${apiKey}&format=json`;

    const res = await axios.get<any>(url);
    const tags = res.data?.toptags?.tag;

    if (!Array.isArray(tags) || tags.length === 0) {
      console.warn(`Sin tags en Last.fm para "${artist}"`);
      artistGenreCache.set(artist, null);
      return null;
    }

    // Ordenar por relevancia
    tags.sort((a: any, b: any) => Number(b.count || 0) - Number(a.count || 0));

    // Buscar coincidencias con nuestro mapa
    for (const tag of tags) {
      const name: string = (tag.name || "").toLowerCase();

      for (const [tagKey, genre] of Object.entries(TAG_GENRE_MAP)) {
        if (name.includes(tagKey)) {
          console.log(`Género detectado para "${artist}": ${genre} (${name})`);
          artistGenreCache.set(artist, genre);
          return genre;
        }
      }
    }

    console.log(`Ningún tag mapeado para "${artist}", género desconocido (tags: ${tags.map((t: any) => t.name).join(", ")})`);
    artistGenreCache.set(artist, null);
    return null;
  } catch (error: any) {
    console.error(`Error al consultar Last.fm para ${artist}:`, error?.message || error);
    artistGenreCache.set(artist, null);
    return null;
  }
}
