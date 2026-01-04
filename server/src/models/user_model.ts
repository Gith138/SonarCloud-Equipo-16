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
  resetPasswordToken?: string; // El signo ? significa que puede ser undefined
  resetPasswordExpires?: Date;
  history_: {
    songId: mongoose.Types.ObjectId;
    listenedAt: Date;
  }[];
  recommendations_: {
    fromUserId_: mongoose.Types.ObjectId;
    songId_: mongoose.Types.ObjectId; // Referencia a la canción (la crearemos si no existe)
    message_: string;
    receivedAt_: Date;
  }[];
  preferences_?: {
    privateSession: boolean;
    showFriendActivity: boolean;
  };
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
      listenedAt: { type: Date, default: Date.now },
    },
  ],
  recommendations_: [{
    fromUserId_: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    songId_: { type: Schema.Types.ObjectId, ref: 'Song', required: true },
    message_: { type: String, default: '' },
    receivedAt_: { type: Date, default: Date.now }
  }],
  preferences_: {
    privateSession: { type: Boolean, default: false },
    showFriendActivity: { type: Boolean, default: true },
  },
  resetPasswordToken: { type: String, default: undefined }, // La llave temporal
  resetPasswordExpires: { type: Date, default: undefined }  // Cuándo caduca esa llave
});

export default mongoose.model<User>('User', userSchema);