import mongoose, { Schema, Document, get } from 'mongoose';

//Modificar esto para que tambien este la opcion de hacer la playlist con amigos, es decir un array de owners
export interface Playlist extends Document {
  name_: string;
  description_?: string;
  cover_?: string;
  owner_: mongoose.Types.ObjectId;   
  owner_group_?: mongoose.Types.ObjectId[]; // Array de owners para playlists con amigos        
  songs_: mongoose.Types.ObjectId[];    
  isPublic_: boolean; 
  createdAt_: Date;
  updatedAt_: Date;
}
const PlaylistSchema: Schema = new Schema({
  name_: { type: String, required: true },
  description_: { type: String },
  cover_: { type: String, default: "https://placehold.co/300x300?text=Playlist" },
  owner_: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  owner_group_: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  songs_: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
  isPublic_: { type: Boolean, default: false },
  createdAt_: { type: Date, default: Date.now },
  updatedAt_: { type: Date, default: Date.now },
});

export default mongoose.model<Playlist>('Playlist', PlaylistSchema);