import mongoose from "mongoose";

export async function connectToDatabase(uri: string) {
  try {
    await mongoose.connect(uri);
    console.log(" Conectado a MongoDB Atlas");
  } catch (error) {
    console.error(" Error al conectar a MongoDB:", error);
    throw error;
  }
}
