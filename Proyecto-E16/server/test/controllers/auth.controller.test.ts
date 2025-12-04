// tests/auth.controller.test.ts
import request from "supertest";
import app from "../../src/app"; // tu archivo donde creas el express
import User from "../../src/models/user_model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import * as authController from "../../src/controllers/auth_controller";

// Mocks
jest.mock("../../src/models/user_model");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
// tests/controllers/auth.controller.test.ts
// tests/controllers/auth.controller.test.ts (追加部分)
describe("Auth Controller - unit tests", () => {
  const mockedUser = User as unknown as jest.Mock;
  const mockedFindOne = jest.fn();
  const mockedHash = bcrypt.hash as unknown as jest.Mock;
  const mockedCompare = bcrypt.compare as unknown as jest.Mock;
  const mockedJwtSign = jwt.sign as unknown as jest.Mock;

  const mockRequest = (body: any) => ({ body } as Request);
  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // set default mocks to avoid undefined errors
    (User as any).findOne = mockedFindOne;
  });

  it("register - success registers a user and returns 201", async () => {
    const req = mockRequest({ username_: "u", email_: "u@x.com", password_: "secret1" });
    const res = mockResponse();

    mockedFindOne.mockResolvedValue(null);
    mockedHash.mockResolvedValue("hashed_password");
    // mock User constructor to return an object with save()
    mockedUser.mockImplementation(() => ({ save: jest.fn().mockResolvedValue(undefined) }));

    await authController.register(req, res);

    expect(mockedFindOne).toHaveBeenCalledWith({ email_: "u@x.com" });
    expect(mockedHash).toHaveBeenCalledWith("secret1", 10);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "Usuario registrado correctamente" });
  });

  it("register - missing fields returns 400", async () => {
    const req = mockRequest({ email_: "a@b.com", password_: "secret1" }); // missing username_
    const res = mockResponse();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Faltan campos obligatorios" });
  });

  it("register - invalid email returns 400", async () => {
    const req = mockRequest({ username_: "u", email_: "invalid", password_: "secret1" });
    const res = mockResponse();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Email no tiene un formato válido" });
  });

  it("register - short password returns 400", async () => {
    const req = mockRequest({ username_: "u", email_: "u@x.com", password_: "123" });
    const res = mockResponse();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "La contraseña debe tener al menos 6 caracteres",
    });
  });

  it("register - existing user returns 400", async () => {
    const req = mockRequest({ username_: "u", email_: "u@x.com", password_: "secret1" });
    const res = mockResponse();

    mockedFindOne.mockResolvedValue({ email_: "u@x.com" });

    await authController.register(req, res);

    expect(mockedFindOne).toHaveBeenCalledWith({ email_: "u@x.com" });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "El usuario ya existe" });
  });

  it("login - user not found returns 400", async () => {
    const req = mockRequest({ email_: "no@user.com", password_: "pass" });
    const res = mockResponse();

    mockedFindOne.mockResolvedValue(null);

    await authController.login(req, res);

    expect(mockedFindOne).toHaveBeenCalledWith({ email_: "no@user.com" });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Usuario no encontrado" });
  });

  it("login - wrong password returns 401", async () => {
    const req = mockRequest({ email_: "u@x.com", password_: "wrong" });
    const res = mockResponse();

    mockedFindOne.mockResolvedValue({ _id: "1", password_: "hashed" });
    mockedCompare.mockResolvedValue(false);

    await authController.login(req, res);

    expect(mockedCompare).toHaveBeenCalledWith("wrong", "hashed");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Contraseña incorrecta" });
  });

  it("login - success returns token", async () => {
    const req = mockRequest({ email_: "u@x.com", password_: "right" });
    const res = mockResponse();

    mockedFindOne.mockResolvedValue({ _id: "abc", password_: "hashed" });
    mockedCompare.mockResolvedValue(true);
    mockedJwtSign.mockReturnValue("token123");

    await authController.login(req, res);

    expect(mockedCompare).toHaveBeenCalledWith("right", "hashed");
    expect(mockedJwtSign).toHaveBeenCalledWith({ id: "abc" }, expect.any(String), { expiresIn: "10 min" });
    expect(res.json).toHaveBeenCalledWith({ message: "Inicio de sesión exitoso", token: "token123" });
  });
});
