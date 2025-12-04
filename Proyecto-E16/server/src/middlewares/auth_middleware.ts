import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../type/express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret_key";

export const verify_token = (req: AuthRequest, res: Response, next: NextFunction) => {
  const auth_header = req.headers["authorization"];

    if (!auth_header) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="Access to the protected resource"');
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  if (!auth_header.startsWith("Bearer ")) return res.status(400).json({ message: "Formato de token incorrecto. Debe empezar con 'Bearer '" });

  const token = auth_header.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (error: any) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="Access to the protected resource", error="invalid_token"');
    if (error.name === "TokenExpiredError") return res.status(401).json({ message: "Token expirado" });
    else if (error.name === "JsonWebTokenError") return res.status(401).json({ message: "Token inválido" });
    else return res.status(500).json({ message: "Error al verificar token" });
  }
}