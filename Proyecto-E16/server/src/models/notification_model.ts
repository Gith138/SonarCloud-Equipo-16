import mongoose, { Schema, Document } from "mongoose";

export type NotificationType =
  | "friend_request"
  | "friend_accept"
  | "song_recommendation"
  | "new_follower"
  | "system_alert"
  | "like_song"
  | "message"
  | "playlist_share"
  | "playlist_unshare";

export interface Notification extends Document {
  senderId_?: mongoose.Types.ObjectId;   // opcional si es system_alert
  receiverId_: mongoose.Types.ObjectId;
  type_: NotificationType;
  message_: string;
  data_?: any;
  isRead_: boolean;
  createdAt_: Date;
}

const notificationSchema: Schema = new Schema({
  senderId_: { 
    type: Schema.Types.ObjectId, 
    ref: "User",
    required: false                     // ahora permite system_alert
  },

  receiverId_: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  type_: {
    type: String,
    enum: [
      "friend_request",
      "friend_accept",
      "song_recommendation",
      "new_follower",
      "system_alert",
      "like_song",
      "message",
      "playlist_share",
      "playlist_unshare"
    ],
    required: true,
  },

  message_: { type: String, required: true },

  data_: { type: Object, default: {} },

  isRead_: { type: Boolean, default: false },

  createdAt_: { type: Date, default: Date.now }
});

export default mongoose.model<Notification>("Notification", notificationSchema);
