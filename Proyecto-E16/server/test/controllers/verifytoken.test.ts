// tests/middlewares/verifyToken.test.ts
import express, { Request, Response } from "express";
import request from "supertest";
import { verify_token } from "../../src/middlewares/auth_middleware";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret_key";

describe("Middleware verify_token", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.get("/protected", verify_token, (req: Request, res: Response) => {
      res.json({ message: "Acceso permitido", user: (req as any).user });
    });
  });

  it("Debe rechazar si no hay token", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Token no proporcionado");
  });

  it("Debe rechazar si el token tiene formato incorrecto", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "BadToken xyz");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Formato de token incorrecto. Debe empezar con 'Bearer '"
    );
  });

  it("Debe rechazar si el token es inválido", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalidtoken");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Token inválido");
  });

  it("Debe permitir acceso con token válido", async () => {
    const payload = { id: 1, username: "testuser" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Acceso permitido");
    expect(res.body.user.id).toBe(1);
    expect(res.body.user.username).toBe("testuser");
  });
});
