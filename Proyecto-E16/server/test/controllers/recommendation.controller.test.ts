import { recommendation } from "../../src/controllers/recommendation_controller";
import User from "../../src/models/user_model";

import { 
  recommendFromLikes, 
  buildInternalPlaylists, 
  buildExternalPlaylistFromUserLikes 
} from "../../src/recommendation/recommendation";

jest.mock("../../src/models/user_model");
jest.mock("../../src/recommendation/recommendation");

describe("recommendation controller", () => {

  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      user: { id: "123" }
    };

    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  test("devuelve estructuras vacías si el usuario no existe", async () => {

    (User.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null)
    });

    await recommendation(req, res);

    expect(res.json).toHaveBeenCalledWith({
      recommendations: [],
      playlists: [],
      externalPlaylist: null,
    });
  });

  test("devuelve recomendaciones, playlists y playlist externa", async () => {

    const mockUser = { likedSongs_: [] };

    (User.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockUser)
    });

    (recommendFromLikes as jest.Mock).mockResolvedValue(["song1", "song2"]);
    (buildInternalPlaylists as jest.Mock).mockReturnValue(["playlist1"]);
    (buildExternalPlaylistFromUserLikes as jest.Mock).mockResolvedValue("external123");

    await recommendation(req, res);

    expect(recommendFromLikes).toHaveBeenCalledWith(mockUser);
    expect(buildInternalPlaylists).toHaveBeenCalledWith(["song1", "song2"]);
    expect(buildExternalPlaylistFromUserLikes).toHaveBeenCalledWith("123");

    expect(res.json).toHaveBeenCalledWith({
      recommendations: ["song1", "song2"],
      playlists: ["playlist1"],
      externalPlaylist: "external123",
    });
  });

  test("maneja errores devolviendo 500", async () => {

    (User.findById as jest.Mock).mockImplementation(() => {
      throw new Error("DB error");
    });

    await recommendation(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Error generando recomendaciones",
    });
  });
});
