import type { Stat, TFile, Vault } from "obsidian";
import { Note, NoteTree, generateNoteTitle, isUseTitleCase } from "./note";
import { parsePath } from "../path";

describe("note title", () => {
  it("use title case when file name is lowercase", () => {
    expect(generateNoteTitle("kamu-milikku", isUseTitleCase("aku.cinta.kamu-milikku.md"))).toBe(
      "Kamu Milikku"
    );
  });
  it("use file name when note name contain uppercase", () => {
    expect(generateNoteTitle("Kamu-Milikku", isUseTitleCase("aku.cinta.Kamu-Milikku.md"))).toBe(
      "Kamu-Milikku"
    );
  });
  it("use file name when file name contain uppercase", () => {
    expect(generateNoteTitle("kamu-milikku", isUseTitleCase("Aku.cinta.kamu-milikku.md"))).toBe(
      "kamu-milikku"
    );
  });
});

describe("note class", () => {
  it("append and remove child work", () => {
    const child = new Note("lala", true);
    expect(child.parent).toBeUndefined();

    const parent = new Note("apa", true);
    expect(parent.children).toEqual([]);

    parent.appendChild(child);
    expect(child.parent).toBe(parent);
    expect(parent.children).toEqual([child]);

    parent.removeChildren(child);
    expect(child.parent).toBeUndefined();
    expect(parent.children).toEqual([]);
  });
  it("append child must throw if child already has parent", () => {
    const origParent = new Note("root", true);
    const parent = new Note("root2", true);
    const child = new Note("child", true);

    origParent.appendChild(child);

    expect(() => parent.appendChild(child)).toThrowError("has parent");
  });
  it("find children work", () => {
    const parent = new Note("parent", true);
    const child1 = new Note("child1", true);
    const child2 = new Note("child2", true);
    const child3 = new Note("child3", true);

    parent.appendChild(child1);
    parent.appendChild(child2);
    parent.appendChild(child3);

    expect(parent.findChildren("child1")).toBe(child1);
    expect(parent.findChildren("child2")).toBe(child2);
    expect(parent.findChildren("child3")).toBe(child3);
    expect(parent.findChildren("child4")).toBeUndefined();
  });
  it("non-recursive sort children work", () => {
    const parent = new Note("parent", true);
    const child1 = new Note("gajak", true);
    const child2 = new Note("lumba", true);
    const child3 = new Note("biawak", true);

    parent.appendChild(child1);
    parent.appendChild(child2);
    parent.appendChild(child3);

    expect(parent.children).toEqual([child1, child2, child3]);
    parent.sortChildren(false);
    expect(parent.children).toEqual([child3, child1, child2]);
  });
  it("recursive sort children work", () => {
    const parent = new Note("parent", true);
    const child1 = new Note("lumba", true);
    const child2 = new Note("galak", true);
    const grandchild1 = new Note("lupa", true);
    const grandchild2 = new Note("apa", true);
    const grandchild3 = new Note("abu", true);
    const grandchild4 = new Note("lagi", true);

    parent.appendChild(child1);
    child1.appendChild(grandchild1);
    child1.appendChild(grandchild2);
    parent.appendChild(child2);
    child2.appendChild(grandchild3);
    child2.appendChild(grandchild4);

    expect(parent.children).toEqual([child1, child2]);
    expect(child1.children).toEqual([grandchild1, grandchild2]);
    expect(child2.children).toEqual([grandchild3, grandchild4]);
    parent.sortChildren(true);
    expect(parent.children).toEqual([child2, child1]);
    expect(child1.children).toEqual([grandchild2, grandchild1]);
    expect(child2.children).toEqual([grandchild3, grandchild4]);
  });

  it("get path on non-root", () => {
    const root = new Note("root", true);
    const ch1 = new Note("parent", true);
    const ch2 = new Note("parent2", true);
    const ch3 = new Note("child", true);

    root.appendChild(ch1);
    ch1.appendChild(ch2);
    ch2.appendChild(ch3);

    expect(ch3.getPath()).toBe("parent.parent2.child");
    expect(ch3.getPathNotes()).toEqual([root, ch1, ch2, ch3]);
  });

  it("get path on root", () => {
    const root = new Note("root", true);
    expect(root.getPath()).toBe("root");
    expect(root.getPathNotes()).toEqual([root]);
  });

  it("use generated title when titlecase true", () => {
    const note = new Note("aku-cinta", true);
    expect(note.title).toBe("Aku Cinta");
  });

  it("use filename as title when titlecase false", () => {
    const note = new Note("aKu-ciNta", false);
    expect(note.title).toBe("aKu-ciNta");
  });

  it("use metadata title when has metadata", () => {
    const note = new Note("aKu-ciNta", false);
    note.syncMetadata({
      title: "Butuh Kamu",
    });
    expect(note.title).toBe("Butuh Kamu");
  });
});

function createTFile(path: string): TFile {
  const { basename, name, extension } = parsePath(path);
  return {
    basename,
    extension,
    name,
    parent: null,
    path: path,
    stat: null as unknown as Stat,
    vault: null as unknown as Vault,
  };
}

describe("tree class", () => {
  it("add file without sort", () => {
    const tree = new NoteTree();
    tree.addFile(createTFile("abc.def.jkl.md"));
    tree.addFile(createTFile("abc.def.ghi.md"));
    expect(tree.root.children.length).toBe(1);
    expect(tree.root.children[0].name).toBe("abc");
    expect(tree.root.children[0].children.length).toBe(1);
    expect(tree.root.children[0].children[0].name).toBe("def");
    expect(tree.root.children[0].children[0].children.length).toBe(2);
    expect(tree.root.children[0].children[0].children[0].name).toBe("jkl");
    expect(tree.root.children[0].children[0].children[1].name).toBe("ghi");
  });

  it("add file with sort", () => {
    const tree = new NoteTree();
    tree.addFile(createTFile("abc.def.jkl.md"), true);
    tree.addFile(createTFile("abc.def.ghi.md"), true);
    tree.addFile(createTFile("abc.def.mno.md"), true);
    expect(tree.root.children[0].children[0].children.length).toBe(3);
    expect(tree.root.children[0].children[0].children[0].name).toBe("ghi");
    expect(tree.root.children[0].children[0].children[1].name).toBe("jkl");
    expect(tree.root.children[0].children[0].children[2].name).toBe("mno");
  });
  it("get note by file base name", () => {
    const tree = new NoteTree();
    tree.addFile(createTFile("abc.def.jkl.md"));
    tree.addFile(createTFile("abc.def.ghi.md"));
    expect(tree.getFromFileName("abc.def.jkl")?.name).toBe("jkl");
    expect(tree.getFromFileName("abc.def.ghi")?.name).toBe("ghi");
    expect(tree.getFromFileName("abc.def.mno")).toBeUndefined();
  });
  it("get note using blank path", () => {

    const tree = new NoteTree();
    tree.addFile(createTFile("abc.def.jkl.md"));
    tree.addFile(createTFile("abc.def.ghi.md"));
    expect(tree.getFromFileName("")).toBeUndefined()
  })
  it("delete note if do not have children", () => {
    const tree = new NoteTree();
    tree.addFile(createTFile("abc.md"));
    tree.deleteByFileName("abc");
    expect(tree.getFromFileName("abc")).toBeUndefined();
  });
  it("do not delete note if have children", () => {
    const tree = new NoteTree();
    tree.addFile(createTFile("abc.md"));
    tree.addFile(createTFile("abc.def.md"));
    tree.deleteByFileName("abc");
    expect(tree.getFromFileName("abc")?.name).toBe("abc");
    expect(tree.getFromFileName("abc.def")?.name).toBe("def");
  });
  it("delete note and parent if do not have children and parent file is null", () => {
    const tree = new NoteTree();
    tree.addFile(createTFile("abc"));
    tree.addFile(createTFile("abc.def.ghi.md"));
    tree.deleteByFileName("abc.def.ghi");
    expect(tree.getFromFileName("abc.def.ghi")).toBeUndefined();
    expect(tree.getFromFileName("abc.def")).toBeUndefined();
    expect(tree.getFromFileName("abc")?.name).toBe("abc");
  });
  it("sort note", () => {
    const tree = new NoteTree();
    tree.addFile(createTFile("abc.def.jkl.md"));
    tree.addFile(createTFile("abc.def.ghi.md"));
    tree.addFile(createTFile("abc.def.mno.md"));
    expect(tree.root.children[0].children[0].children.length).toBe(3);
    expect(tree.root.children[0].children[0].children[0].name).toBe("jkl");
    expect(tree.root.children[0].children[0].children[1].name).toBe("ghi");
    expect(tree.root.children[0].children[0].children[2].name).toBe("mno");
    tree.sort();
    expect(tree.root.children[0].children[0].children[0].name).toBe("ghi");
    expect(tree.root.children[0].children[0].children[1].name).toBe("jkl");
    expect(tree.root.children[0].children[0].children[2].name).toBe("mno");
  });
  it("flatten note", () => {
    const tree = new NoteTree();
    tree.addFile(createTFile("abc.def.md"));
    tree.addFile(createTFile("abc.def.ghi.md"));
    tree.addFile(createTFile("abc.jkl.mno.md"));
    expect(tree.flatten().map((note) => note.getPath())).toEqual([
      "root",
      "abc",
      "abc.def",
      "abc.def.ghi",
      "abc.jkl",
      "abc.jkl.mno",
    ]);
  });
});
