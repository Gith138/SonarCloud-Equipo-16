import mongoose, { Schema, Document } from 'mongoose';

export interface User extends Document {
  username_: string;
  email_: string;
  password_: string;
  profilePictureUrl_: string;
  createdAt_: Date;
  friends_: mongoose.Types.ObjectId[];
  friendRequests_: mongoose.Types.ObjectId[];
  likedSongs_: mongoose.Types.ObjectId[];
  history_: {
    songId: mongoose.Types.ObjectId;
    rating: number;
    listenedAt: Date;
  }[];
}

const userSchema: Schema = new Schema({
  username_: { type: String, required: true, unique: true },
  email_: { type: String, required: true, unique: true },
  password_: { type: String, required: true },
  profilePictureUrl_: { type: String, default: '' },
  createdAt_: { type: Date, default: Date.now },
  friends_: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  friendRequests_: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  likedSongs_: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
  history_: [
    {
      songId: { type: Schema.Types.ObjectId, ref: 'Song', required: true },
      rating: { type: Number, min: 1, max: 5, default: 3 },
      listenedAt: { type: Date, default: Date.now },
    },
  ],
});

export default mongoose.model<User>('User', userSchema);