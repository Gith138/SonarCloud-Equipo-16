import { Request } from "express";

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string };
  }
}

export interface AuthenticatedMulterRequest extends Request {
  user?: { id: string };
  file?: Express.Multer.File;
  body: {
    username_?: string;
    email_?: string;
    password_?: string;
  };
}

// Interfaz extendida para TypeScript
export interface AuthRequest extends Request {
  user?: { id: string };
}