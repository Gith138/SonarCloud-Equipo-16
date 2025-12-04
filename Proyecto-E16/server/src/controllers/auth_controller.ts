import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user_model";

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret_key";

export const register = async (req: Request, res: Response) => {
  try {
    const { username_, email_, password_ } = req.body;

    // Validaciones básicas
    if (!username_ || !email_ || !password_) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_)) {
      return res.status(400).json({ message: "Email no tiene un formato válido" });
    }

    // Validar longitud mínima de contraseña
    if (password_.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const user_exist = await User.findOne({ email_: email_ });
    if (user_exist) return res.status(400).json({ message: "El usuario ya existe" });

    const hashed_password = await bcrypt.hash(password_, 10);
    const new_user = new User({ 
      username_: username_,
      email_: email_,
      password_: hashed_password, 
      profilePictureUrl_: "",
      friends_: [],
      createdAt_: new Date(),
    });
    await new_user.save();

    res.status(201).json({ message: "Usuario registrado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar usuario", error });
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email_, password_ } = req.body;

    const user = await User.findOne({ email_ });
    if (!user) return res.status(400).json({ message: "Usuario no encontrado" });

    const is_find = await bcrypt.compare(password_, user.password_);
    if (!is_find) return res.status(401).json({ message: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "10 min" });
    res.json({ message: "Inicio de sesión exitoso", token });
  } catch (error) {
    res.status(500).json({ message: "Error al iniciar sesión", error });
  }
}