import mongoose from "mongoose";
import User from "../models/user_model";
import Song from "../models/song_model";

export async function getGlobalPopularityRecommendations(limit: number = 20) {
  const agg = await User.aggregate([
    { $unwind: "$likedSongs_" },
    { $group: { _id: "$likedSongs_",  likes: { $sum: 1 } } },
    { $sort: { likes: -1 } },
    { $limit: limit },
  ]);

  const songIds = agg.map((it: any) => it._id as mongoose.Types.ObjectId);

  if (songIds.length === 0) return await Song.find().sort({ uploadedAt_: -1 }).limit(limit).exec();

  const songs = await Song.find({ _id: { $in: songIds } }).exec();
  const map = new Map<string, any>();
  songs.forEach((s: any) => map.set(s._id.toString(), s));

  const ordered = songIds.map((id) => map.get(id.toString())).filter(Boolean);

  return ordered;
}