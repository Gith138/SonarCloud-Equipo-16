import User from "../models/user_model";
import Song from "../models/song_model";
import mongoose from "mongoose";
import { fetchYouTubeSongs, fetchYouTubeSongsByArtist } from "../recommendation/youtube_recommendation";

export async function recommendFromLikes(user: any) {
  if (!user.likedSongs_ || user.likedSongs_.length === 0) return [];

  const likedSongs = user.likedSongs_ as any[];

  const artistCounts = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  const likedUrls = new Set<string>();

  const BAD_ARTISTS = ["Artista desconocido"];
  const BAD_GENRES = ["Desconocido", "Otro"];

  for (const s of likedSongs) {
    const artist = (s.artist_ || "Artista desconocido").trim();
    const genre = (s.genre_ || "Desconocido").trim();

    if (!BAD_ARTISTS.includes(artist)) artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
    if (!BAD_GENRES.includes(genre)) genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    if (s.youtubeURL_) likedUrls.add(s.youtubeURL_);
  }

  if (genreCounts.size === 0 && artistCounts.size === 0) return [];

  const sortedGenres = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topGenres = sortedGenres.slice(0, 3).map(([g]) => g);

  const topArtists = Array.from(artistCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([a]) => a);

  const MAX_TOTAL = 25;
  const recommendationsMap = new Map<string, any>();

  // para no tener 15 canciones del mismo artista
  const artistChosenCounts = new Map<string, number>();
  const MAX_PER_ARTIST = 5;

  const totalGenreLikes = sortedGenres.slice(0, 3).reduce((sum, [, c]) => sum + c, 0);

  async function tryAddCandidate(song: any, quotaForGenre: number, genre: string, addedForGenreRef: { value: number }) {
    if (recommendationsMap.size >= MAX_TOTAL) return;
    if (addedForGenreRef.value >= quotaForGenre) return;

    const url = song.youtubeURL_;
    if (!url) return;
    if (likedUrls.has(url)) return;
    if (recommendationsMap.has(url)) return;

    const artist = (song.artist_ || "").trim();
    const genreVal = (song.genre_ || "").trim();

    if (!artist || BAD_ARTISTS.includes(artist)) return;
    if (!genreVal || BAD_GENRES.includes(genreVal)) return;

    const currentArtistCount = artistChosenCounts.get(artist) || 0;
    if (currentArtistCount >= MAX_PER_ARTIST) return;

    recommendationsMap.set(url, song);
    artistChosenCounts.set(artist, currentArtistCount + 1);
    addedForGenreRef.value++;
  }

  // Repartimos los 25 huecos entre géneros (proporcional a los likes)
  for (const [genre, count] of sortedGenres.slice(0, 3)) {
    if (recommendationsMap.size >= MAX_TOTAL) break;
    if (totalGenreLikes === 0) break;

    const quotaForGenre = Math.max(4, Math.round((count / totalGenreLikes) * MAX_TOTAL));
    const addedForGenre = { value: 0 };

    // Canciones de ese género en la base de datos
    const mongoSongs = await Song.find({ genre_: genre }).limit(quotaForGenre * 3);
    for (const s of mongoSongs) {
      await tryAddCandidate(s, quotaForGenre, genre, addedForGenre);
      if (addedForGenre.value >= quotaForGenre || recommendationsMap.size >= MAX_TOTAL) break;
    }

    if (addedForGenre.value >= quotaForGenre || recommendationsMap.size >= MAX_TOTAL) continue;

    // Rellena con YouTube para ese género (busca cualquier artista de ese género)
    const baseQueries = [`${genre} music`, `${genre} songs`];

    for (const q of baseQueries) {
      if (addedForGenre.value >= quotaForGenre || recommendationsMap.size >= MAX_TOTAL) break;

      const ytSongs = await fetchYouTubeSongs(q, quotaForGenre * 2);
      for (const y of ytSongs) {
        if (!y.genre_) y.genre_ = genre; // marcamos el género que estamos explorando
        await tryAddCandidate(y, quotaForGenre, genre, addedForGenre);
        if (addedForGenre.value >= quotaForGenre || recommendationsMap.size >= MAX_TOTAL) break;
      }
    }
  }

  // Extra con los artistas más escuchados (si aún quedan huecos)
  for (const artist of topArtists) {
    if (recommendationsMap.size >= MAX_TOTAL) break;

    const ytArtistSongs = await fetchYouTubeSongsByArtist(artist, 5);
    const dummyQuota = MAX_PER_ARTIST * 2; 
    const dummyRef = { value: 0 };

    for (const y of ytArtistSongs) {
      await tryAddCandidate(y, dummyQuota, y.genre_ || "", dummyRef);
      if (recommendationsMap.size >= MAX_TOTAL) break;
    }
  }

  return Array.from(recommendationsMap.values()).slice(0, MAX_TOTAL);
}

export async function buildExternalPlaylistFromUserLikes(userId: string) {
  const user = await User.findById(userId).populate("likedSongs_");
  if (!user || !user.likedSongs_ || user.likedSongs_.length === 0) return null;

  const artistCounts = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  const likedSongs = user.likedSongs_ as any[];

  for (const song of likedSongs) {
    const artist = song.artist_ || "Artista desconocido";
    const genre = song.genre_ || "Otro";
    artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
    genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  }

  // Obtener top artista y top género
  const [topArtist] = Array.from(artistCounts.entries()).sort((a, b) => b[1] - a[1])[0] || ["Artista desconocido", 0];
  const [topGenre] = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1])[0] || ["Otro", 0];

  // Decidir si basar la playlist en artista o género
  const base = artistCounts.get(topArtist)! >= genreCounts.get(topGenre)! ? topArtist : topGenre;

  const yt = await fetchYouTubeSongs(`${base} playlist`, 15);
  if (!yt.length) return null;

  return {
    name: `Playlist de ${base} en YouTube`,
    cover: yt[0].thumbnailURL_ || "",
    songsCount: yt.length,
  };
}

export function buildInternalPlaylists(songs: any[]) {
  if (!songs || songs.length === 0) return [];

  const byArtist = new Map<string, any[]>();
  const byGenre = new Map<string, any[]>();

  const BAD_ARTISTS = ["Artista desconocido"];
  const BAD_GENRES = ["Desconocido", "Otro"];

  const MIN_SONGS_PER_ARTIST_PLAYLIST = 3;
  const MIN_SONGS_PER_GENRE_PLAYLIST = 4;

  for (const s of songs) {
    const artist = s.artist_ || "Artista desconocido";
    const genre = s.genre_ || "Desconocido";

    if (!byArtist.has(artist)) byArtist.set(artist, []);
    if (!byGenre.has(genre)) byGenre.set(genre, []);

    byArtist.get(artist)!.push(s);
    byGenre.get(genre)!.push(s);
  }

  const artistPlaylists = Array.from(byArtist.entries())
    .filter(([artist, list]) => !BAD_ARTISTS.includes(artist) && list.length >= MIN_SONGS_PER_ARTIST_PLAYLIST)
    .sort((a, b) => b[1].length - a[1].length) // más canciones primero
    .slice(0, 3)
    .map(([artist, list]) => ({
      name_: `Basado en ${artist}`,
      description_: `${list.length} canciones recomendadas para ti`,
      cover_: list[0]?.thumbnailURL_ || "",
      songs: list,
      artist,
    }));

  const genrePlaylists = Array.from(byGenre.entries())
    .filter(([genre, list]) => !BAD_GENRES.includes(genre) && list.length >= MIN_SONGS_PER_GENRE_PLAYLIST)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 2)
    .map(([genre, list]) => ({
      name_: `Basado en ${genre}`,
      description_: `${list.length} canciones del género ${genre}`,
      cover_: list[0]?.thumbnailURL_ || "",
      songs: list,
      genre,
    }));
  
  if (artistPlaylists.length === 0 && genrePlaylists.length === 0) {
    const fallbackArtist = Array.from(byArtist.entries())
      .filter(([artist]) => !BAD_ARTISTS.includes(artist))
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 1)
      .map(([artist, list]) => ({
         name_: `Basado en ${artist}`,
        description_: `${list.length} canciones recomendadas para ti`,
        cover_: list[0]?.thumbnailURL_ || "",
        songs: list,
        artist,
      }));
    return fallbackArtist;
  }

  return [...artistPlaylists, ...genrePlaylists];
}

export async function getFriendsBasedRecommendations(userId: string, limit: number = 20) {
  const me = await User.findById(userId).populate("likedSongs_").populate("friends_");

  if (!me) return [];

  const myLikedIds = new Set((me.likedSongs_ as any[]).map((s) => s._id.toString()));
  const friendIds = me.friends_ as mongoose.Types.ObjectId[];
  if (!friendIds) return [];

  const friends = await User.find({ _id: { $in: friendIds } }).populate("likedSongs_").exec();

  const map = new Map<string, {song: any, count: number}>();

  for (const friend of friends) {
    const liked = friend.likedSongs_ || [];
    for (const song of liked) {
      const id = song._id.toString();
      if (myLikedIds.has(id)) continue;
      const existing = map.get(id);
      if (existing) existing.count += 1;
      else map.set(id, {song, count: 1});
    }
  }
  const ordered = [...map.values()].sort((a, b) => b.count - a.count)
  .slice(0, limit)
  .map((entry) => entry.song);

  return ordered;
}

export function mergeUniqueWithLimit<T extends { _id?: any }>(limit: number, ...arrays: T[][]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const array of arrays) {
    for (const item of array) {
      if (!item) continue;

      const id = item._id ? item._id.toString() : JSON.stringify(item);
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(item);
      if (result.length >= limit) return result;
    }
  }
  return result;
}