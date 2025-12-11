import { recommendation } from "../../src/controllers/recommendation_controller";
import User from "../../src/models/user_model";

// 1. Ajusta esto al nombre real de tu archivo
import { 
  recommendFromLikes, 
  buildInternalPlaylists, 
  buildExternalPlaylistFromUserLikes 
} from "../../src/recommendation/recommendation"; 

import { getGlobalPopularityRecommendations } from "../../src/recommendation/initial_recommendation";
import { Request, Response } from 'express';

// --- MOCKS ---
jest.mock("../../src/models/user_model");
jest.mock("../../src/recommendation/recommendation");
jest.mock("../../src/recommendation/initial_recommendation");

describe("recommendation controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    // 🧹 LIMPIEZA TOTAL: Borra implementaciones previas para evitar que el "DB Error" se filtre
    jest.resetAllMocks();

    req = { user: { id: "123" } } as any;
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // 🏗️ CONFIGURACIÓN POR DEFECTO (HAPPY PATH)
    // Configuramos aquí lo que debería pasar si todo sale BIEN.
    // Así, los tests de éxito no necesitan repetir código, y el test de error sobrescribirá esto.

    // 1. User.findById por defecto devuelve un usuario válido
    (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({ likedSongs_: [] })
    });

    // 2. Funciones de recomendación por defecto devuelven arrays vacíos o datos simples
    (recommendFromLikes as jest.Mock).mockResolvedValue([]);
    (buildInternalPlaylists as jest.Mock).mockReturnValue([]);
    (buildExternalPlaylistFromUserLikes as jest.Mock).mockResolvedValue(null);
    
    // 3. Importante: Initial Recommendation por defecto devuelve vacío para no explotar
    (getGlobalPopularityRecommendations as jest.Mock).mockResolvedValue([]);
  });

  /**
   * TEST 1: Usuario no encontrado
   */
  test("devuelve estructuras vacías si el usuario no existe", async () => {
    // Sobrescribimos para que devuelva null
    (User.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null)
    });

    await recommendation(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      recommendations: [],
      playlists: [],
      externalPlaylist: null,
    });
  });

  /**
   * TEST 2: Flujo Exitoso (Success)
   */
  test("devuelve recomendaciones, playlists y playlist externa", async () => {
    const mockUser = { likedSongs_: ["songA"] };

    // Sobrescribimos mocks con datos específicos para este test
    (User.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockUser)
    });

    (recommendFromLikes as jest.Mock).mockResolvedValue(["song1", "song2"]);
    (buildInternalPlaylists as jest.Mock).mockReturnValue(["playlist1"]);
    (buildExternalPlaylistFromUserLikes as jest.Mock).mockResolvedValue("external123");

    await recommendation(req as Request, res as Response);

    // Verificaciones
    expect(recommendFromLikes).toHaveBeenCalledWith(mockUser);
    expect(buildInternalPlaylists).toHaveBeenCalledWith(["song1", "song2"]);
    expect(buildExternalPlaylistFromUserLikes).toHaveBeenCalledWith("123");

    expect(res.json).toHaveBeenCalledWith({
      recommendations: ["song1", "song2"],
      playlists: ["playlist1"],
      externalPlaylist: "external123",
    });
  });

  /**
   * TEST 3: Manejo de Errores (Error)
   */
  test("maneja errores devolviendo 500", async () => {
    // Sobrescribimos para forzar el error
    (User.findById as jest.Mock).mockImplementation(() => {
      throw new Error("DB error");
    });

    await recommendation(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Error generando recomendaciones",
    });
  });
});