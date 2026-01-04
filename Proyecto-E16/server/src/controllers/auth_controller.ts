import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user_model";
import crypto from 'crypto';     // Librería nativa para generar códigos aleatorios
import nodemailer from 'nodemailer';

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

// --- 1. FUNCIÓN OLVIDÉ MI CONTRASEÑA ---
export const forgotPassword = async (req: Request, res: Response) => {
  const { email_ } = req.body; // Asegúrate que el frontend envía "email_"

  try {
    const user = await User.findOne({ email_: email_ });
   if (!user) {
      return res.status(404).json({ message: "No encontramos ese correo." });
    }

    // Generamos una llave aleatoria de 20 bytes convertida a hexadecimal
    const token = crypto.randomBytes(20).toString('hex');

    // Guardamos la llave en la BD y decimos que caduca en 1 hora (3600000 ms)
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); 
    await user.save();

    // Configuración del Cartero (Transporter)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
/*         user: 'alu0101463858@ull.edu.es', 
        pass: 'orxv jkbx jquf fwxe' // Sin espacios */
        user: process.env.GMAIL_USER, // Lee del archivo .env
        pass: process.env.GMAIL_PASS  // Lee del archivo .env
      }
    });

    // Configuración del Email
    const mailOptions = {
    from: `"Soporte Tempo" <${process.env.GMAIL_USER}>`, // <--- Nombre bonito + Email automático
    to: user.email_,
    subject: 'Recuperación de contraseña - Tempo',
    text: `Hola ${user.username_ || 'Usuario'},\n\n` +
          `Recibimos una solicitud para cambiar tu contraseña.\n` +
          `Haz clic aquí para crear una nueva:\n` +
          `http://localhost:4200/reset-password/${token}\n\n` + // Asegúrate que el puerto 4200 es el de tu Angular
          `Este enlace expira en 1 hora.\n` +
          `Si no fuiste tú, ignora este mensaje.`
    };

    // Enviar
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Correo enviado correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// --- 2. FUNCIÓN RESETEAR CONTRASEÑA ---
export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params; // Viene de la URL
  const { newPassword } = req.body; // Viene del formulario

  try {
    // Buscamos usuario que tenga ese token Y que la fecha de expiración sea MAYOR ($gt) a ahora
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'El enlace es inválido o ha caducado' });
    }

    // Actualizamos la contraseña
    // IMPORTANTE: Si usas bcrypt en el modelo (pre-save hook), esto la encriptará sola.
    // Si no, tienes que hacer: user.password_ = await bcrypt.hash(newPassword, 10);
    const salt = await bcrypt.genSalt(10);
    user.password_ = await bcrypt.hash(newPassword, salt); // <--- ENCRIPTADO MANUAL

    // Borramos el token para que no se pueda volver a usar
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    console.log(newPassword)
    await user.save();

    res.status(200).json({ message: 'Contraseña cambiada con éxito' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};