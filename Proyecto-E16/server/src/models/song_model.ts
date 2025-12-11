import mongoose, { Schema, Document } from 'mongoose';

export interface Song extends Document {
  title_: string;
  artist_: string;
  youtubeURL_: string;
  thumbnailURL_: string; // Miniatura
  genre_?: string;
  uploadedAt_: Date;
  addedByUserId_?: mongoose.Types.ObjectId;
}

const songSchema: Schema = new Schema({
  title_: { type: String, required: true },
  artist_: { type: String, required: true },
  youtubeURL_: { type: String, required: true, unique: true },
  thumbnailURL_: { type: String, required: true },
  genre_: { type: String },
  uploadedAt_: { type: Date, default: Date.now },
  addedByUserId_: { type: Schema.Types.ObjectId, ref: 'User' },
});

export default mongoose.model<Song>('Song', songSchema);