import { parsePath } from "./path";

describe("parse path", () => {
  it("parse path with 2 component", () => {
    expect(parsePath("abc/ll.md")).toStrictEqual({
      dir: "abc",
      name: "ll.md",
      basename: "ll",
      extension: "md",
    });
  });
  it("parse path with 1 component", () => {
    expect(parsePath("hugo.md")).toStrictEqual({
      dir: "",
      name: "hugo.md",
      basename: "hugo",
      extension: "md",
    });
  });
  it("parse path with name contain multiple dot", () => {
    expect(parsePath("baca.buku.md")).toStrictEqual({
      dir: "",
      name: "baca.buku.md",
      basename: "baca.buku",
      extension: "md",
    });
  });
  it("parse path with multiple component", () => {
    expect(parsePath("baca/buku/dirumah/pacar.md")).toStrictEqual({
      dir: "baca/buku/dirumah",
      name: "pacar.md",
      basename: "pacar",
      extension: "md",
    });
  });
  it("parse windows path", () => {
    expect(parsePath("abc\\ll.md")).toStrictEqual({
      dir: "abc",
      name: "ll.md",
      basename: "ll",
      extension: "md",
    });
  });
});
