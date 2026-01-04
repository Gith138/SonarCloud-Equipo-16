import { recommendation } from "../../src/controllers/recommendation_controller";
import User from "../../src/models/user_model";

import { recommendFromLikes, buildInternalPlaylists, buildExternalPlaylistFromUserLikes, getFriendsBasedRecommendations, mergeUniqueWithLimit } from "../../src/recommendation/recommendation"; 

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
    jest.resetAllMocks();

    req = { user: { id: "123" } } as any;
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({ likedSongs_: [] })
    });

    // Funciones de recomendación por defecto devuelven arrays vacíos o datos simples
    (recommendFromLikes as jest.Mock).mockResolvedValue([]);
    (buildInternalPlaylists as jest.Mock).mockReturnValue([]);
    (buildExternalPlaylistFromUserLikes as jest.Mock).mockResolvedValue(null);
    
    // Estas funciones por defecto devuelven vacío para no explotar
    (getGlobalPopularityRecommendations as jest.Mock).mockResolvedValue([]);
    (getFriendsBasedRecommendations as jest.Mock).mockResolvedValue([]);
    (mergeUniqueWithLimit as jest.Mock).mockReturnValue([]);
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

    (User.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockUser)
    });

    (recommendFromLikes as jest.Mock).mockResolvedValue(["song1", "song2"]);
    (buildInternalPlaylists as jest.Mock).mockReturnValue(["playlist1"]);
    (mergeUniqueWithLimit as jest.Mock).mockReturnValue(["song1", "song2"]);
    (buildInternalPlaylists as jest.Mock).mockReturnValue(["playlist1"]);
    (buildExternalPlaylistFromUserLikes as jest.Mock).mockResolvedValue("external123");

    await recommendation(req as Request, res as Response);

    // Verificaciones
    expect(recommendFromLikes).toHaveBeenCalledWith(mockUser);
    expect(mergeUniqueWithLimit).toHaveBeenCalled();
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
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (User.findById as jest.Mock).mockImplementation(() => {
      throw new Error("DB error");
    });

    await recommendation(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Error generando recomendaciones",
    });
    consoleSpy.mockRestore();
  });
});