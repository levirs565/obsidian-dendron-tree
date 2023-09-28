import { App, GraphView, TFile } from "obsidian";
import { Note } from "src/engine/note";
import { DendronVault } from "src/engine/vault";
import { DendronWorkspace } from "src/engine/workspace";

type DendronGraphNode = {
  file: TFile;
} & (
  | {
      type: "note";
      vault: DendronVault;
      note: Note;
    }
  | {
      type: "file";
    }
);

export function createDataEngineRender(
  app: App,
  workspace: DendronWorkspace,
  view: GraphView
): GraphView["dataEngine"]["render"] {
  return () => {
    const filterFile = (file: string, nodeType: string) => {
      if (!view.dataEngine.searchQueries) {
        return true;
      }
      if ("" === nodeType) {
        return view.dataEngine.fileFilter.hasOwnProperty(file)
          ? view.dataEngine.fileFilter[file]
          : !view.dataEngine.hasFilter;
      }
      if ("attachment" !== nodeType) return true;
      return view.dataEngine.searchQueries.every(function (query) {
        return !!query.color || !!query.query.matchFilepath(file);
      });
    };

    const nodes: Record<string, any> = {};
    let numLinks = 0;

    const dendronNodeList: DendronGraphNode[] = workspace.vaultList.flatMap((vault) =>
      vault.tree
        .flatten()
        .filter((note) => note.file)
        .map((note) => ({
          type: "note",
          vault,
          file: note.file!,
          note,
        }))
    );

    if (view.dataEngine.options.showAttachments)
      dendronNodeList.push(
        ...app.vault
          .getFiles()
          .filter((file) =>
            file.extension === "md" && file.parent
              ? !workspace.findVaultByParent(file.parent)
              : true
          )
          .map((file) => ({
            type: "file" as const,
            file,
          }))
      );

    const progression = view.dataEngine.progression;

    if (progression) {
      const map = new Map<DendronGraphNode, number>();
      for (const dendronNode of dendronNodeList) {
        if (dendronNode.type === "file") {
          map.set(dendronNode, Math.min(dendronNode.file.stat.ctime, dendronNode.file.stat.mtime));
          continue;
        } else if (dendronNode.type === "note") {
          const file = dendronNode.note.file;
          if (!file) {
            map.set(dendronNode, Infinity);
          } else {
            const metadata = app.metadataCache.getFileCache(file)?.frontmatter;

            if (!metadata) map.set(dendronNode, Infinity);
            else {
              const created = parseInt(metadata["created"]);
              map.set(dendronNode, isNaN(created) ? Infinity : created);
            }
          }
        }
      }
      dendronNodeList.sort((a, b) => map.get(a)! - map.get(b)!);
    }

    let stopFile: TFile | undefined = undefined;
    for (const dendronNode of dendronNodeList) {
      if (dendronNode.type === "note") {
        const { note, vault } = dendronNode;
        if (!filterFile(note.file?.path ?? "", "")) continue;

        const node: any = {
          type: "",
          links: {},
        };
        nodes[`dendron://${vault.config.name}/${note.getPath()}`] = node;

        if (view.dataEngine.options.showOrphans) {
          if (progression && progression === numLinks) {
            stopFile = note.file;
          }
          numLinks++;
        }

        if (!note.file) continue;
        const meta = app.metadataCache.getFileCache(note.file);
        if (!meta) continue;

        const listOfLinks = (meta.links ?? []).concat(meta.embeds ?? []);

        for (const link of listOfLinks) {
          const href = link.original.startsWith("[[")
            ? link.original.substring(2, link.original.length - 2).split("|", 2)[0]
            : link.link;
          const target = workspace.resolveRef(note.file.path, href);
          if (target?.type === "maybe-note") {
            const linkName = `dendron://${target.vaultName}/${target.path}`.toLowerCase();
            if (!progression || numLinks < progression) {
              if (!target.note?.file) {
                if (!filterFile(target.note?.file?.path ?? "", "unresolved")) continue;
                if (view.dataEngine.options.hideUnresolved) continue;
                nodes[linkName] = {
                  type: "unresolved",
                  links: {},
                };
              } else {
                if (!filterFile(target.note?.file?.path ?? "", "")) continue;
              }

              node.links[linkName] = true;
            }

            if (progression && progression === numLinks) {
              stopFile = note.file;
            }

            numLinks++;
          } else if (target && view.dataEngine.options.showAttachments) {
            if (!progression || numLinks < progression) {
              const linkName = target.file.path;
              node.links[linkName] = true;
            }

            if (progression && progression === numLinks) {
              stopFile = note.file;
            }

            numLinks++;
          }
        }
      } else if (dendronNode.type === "file") {
        const linkName = dendronNode.file.path;
        if (view.dataEngine.options.showOrphans) {
          if (progression && progression === numLinks) {
            stopFile = dendronNode.file;
          }
          numLinks++;
        }

        const node: any = {
          type: "attachment",
          links: {},
        };

        if (!filterFile(linkName, "attachment")) continue;
        nodes[linkName] = node;
      }
    }
    if (progression) {
      const index = dendronNodeList.findIndex(({ file }) => file === stopFile);

      if (index >= 0) {
        for (let i = index + 1; i < dendronNodeList.length; i++) {
          const dendronNode = dendronNodeList[i];

          const p =
            dendronNode.type === "note"
              ? `dendron://${dendronNode.vault.config.name}/${dendronNode.note.getPath()}`
              : dendronNode.file.path;
          if (!nodes[p]) {
            console.log(`Delete failed ${p}`);
          }
          delete nodes[p];
        }
      }
    }

    if (!view.dataEngine.options.showOrphans) {
      const isNodeReferenced = new Map<string, boolean>();

      for (const nodeName of Object.keys(nodes)) {
        for (const link of Object.keys(nodes[nodeName].links)) {
          if (link === nodeName) continue;
          isNodeReferenced.set(link, true);
        }
      }

      for (const nodeName of Object.keys(nodes)) {
        if (isNodeReferenced.get(nodeName)) continue;

        let canDelete = true;
        for (const link of Object.keys(nodes[nodeName].links)) {
          if (link === nodeName) continue;
          canDelete = false;
          break;
        }

        if (canDelete) delete nodes[nodeName];
      }
    }
    view.renderer.setData({
      nodes,
      numLinks,
    });
    return numLinks;
  };
}
