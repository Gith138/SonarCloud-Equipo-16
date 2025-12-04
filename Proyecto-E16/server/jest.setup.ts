// jest.setup.ts
import mongoose from "mongoose";

// Mock de mongoose.connect para tests
jest.mock("mongoose", () => ({
  connect: jest.fn().mockResolvedValue(null),
  connection: { on: jest.fn() },
  Schema: class {},
  model: jest.fn().mockReturnValue({
    findById: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    populate: jest.fn()
  }),
}));

// Evitar logs después de tests
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});
// Configuración global antes de todos los tests