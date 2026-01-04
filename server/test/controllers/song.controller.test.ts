import { createSong, getSongs, getSongById, updateSong, deleteSong } from "../../src/controllers/song_controller";
import Song from "../../src/models/song_model";

jest.mock("../../src/models/song_model");

describe("song_controller", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    jest.clearAllMocks();
  });

  test("createSong: éxito", async () => {
    const mockSong = { save: jest.fn().mockResolvedValue({ title_: "Test" }), title_: "Test" };
    (Song as any).mockImplementation(() => mockSong);

    await createSong(req, res);

    expect(mockSong.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockSong);
  });

  test("createSong: error", async () => {
    const mockSong = { save: jest.fn().mockRejectedValue(new Error("DB error")) };
    (Song as any).mockImplementation(() => mockSong);

    await createSong(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "DB error" });
  });

  test("getSongs: éxito", async () => {
    (Song.find as jest.Mock).mockResolvedValue([{ title_: "Song1" }]);

    await getSongs(req, res);

    expect(Song.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ title_: "Song1" }]);
  });

  test("getSongs: error", async () => {
    (Song.find as jest.Mock).mockRejectedValue(new Error("DB error"));

    await getSongs(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "DB error" });
  });

  test("getSongById: éxito y no encontrado", async () => {
    req.params.id = "1";
    (Song.findById as jest.Mock).mockResolvedValue({ title_: "Song1" });

    await getSongById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ title_: "Song1" });

    (Song.findById as jest.Mock).mockResolvedValue(null);
    await getSongById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Song not found" });
  });

  test("updateSong: éxito y no encontrado", async () => {
    req.params.id = "1";
    req.body = { title_: "Updated" };
    (Song.findByIdAndUpdate as jest.Mock).mockResolvedValue({ title_: "Updated" });

    await updateSong(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ title_: "Updated" });

    (Song.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
    await updateSong(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Song not found" });
  });

  test("deleteSong: éxito y no encontrado", async () => {
    req.params.id = "1";
    (Song.findByIdAndDelete as jest.Mock).mockResolvedValue({ title_: "Song1" });

    await deleteSong(req, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();

    (Song.findByIdAndDelete as jest.Mock).mockResolvedValue(null);
    await deleteSong(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Song not found" });
  });
});
