import { App, GraphEngine, TFile } from "obsidian";
import { Note } from "src/engine/note";
import { DendronVault } from "src/engine/vault";
import { DendronWorkspace } from "src/engine/workspace";
import { isLocalGraphView } from "./utils";

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

function getGlobalNodes(
  app: App,
  workspace: DendronWorkspace,
  options: GraphEngine["options"],
  filterFile: (file: string, type: string) => boolean,
  progression: number
) {
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

  if (options.showAttachments)
    dendronNodeList.push(
      ...app.vault
        .getFiles()
        .filter((file) =>
          file.extension === "md" && file.parent ? !workspace.findVaultByParent(file.parent) : true
        )
        .map((file) => ({
          type: "file" as const,
          file,
        }))
    );

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

      if (options.showOrphans) {
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
              if (options.hideUnresolved) continue;
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
        } else if (target && options.showAttachments) {
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
      if (options.showOrphans) {
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

  return {
    nodes,
    numLinks,
  };
}

function getLocalNodes(
  app: App,
  workspace: DendronWorkspace,
  options: GraphEngine["options"],
  globalNodes: ReturnType<typeof getGlobalNodes>["nodes"]
) {
  const localNodes: Record<string, any> = {};
  const localWeights: Record<string, number> = {};
  const result = {
    nodes: localNodes,
    weights: localWeights,
  };

  const file = app.vault.getAbstractFileByPath(options.localFile);

  if (!(file instanceof TFile) || !file.parent) {
    console.log("error");
    return result;
  }

  const vault = workspace.findVaultByParent(file.parent);

  if (!vault) {
    console.log("error vault not found");
    return result;
  }

  const localFileDPath = `dendron://${vault.config.name}/${file.basename}`;

  localWeights[localFileDPath] = 30;
  if (!globalNodes[localFileDPath]) {
    localNodes[localFileDPath] = {
      links: {},
      type: "",
    };
    return result;
  }

  localNodes[localFileDPath] = {
    links: {},
    type: globalNodes[localFileDPath].type,
  };
  console.log(options);

  const build = (weight: number) => {
    const t: Record<string, any> = {};
    for (const nodeName of Object.keys(globalNodes)) {
      const node = globalNodes[nodeName];
      if ("tag" === node.type) continue;

      for (const linkName of Object.keys(node.links)) {
        if (options.localForelinks && localNodes[nodeName] && !localNodes[linkName]) {
          if (!t[linkName]) {
            t[linkName] = {
              links: {},
              type: globalNodes[linkName].type,
            };
          }
          localNodes[nodeName].links[linkName] = true;
        }
        if (options.localBacklinks && localNodes[linkName] && !localNodes[nodeName]) {
          if (!t[nodeName]) {
            t[nodeName] = {
              links: {},
              type: globalNodes[nodeName].type,
            };
          }
          t[nodeName].links[linkName] = true;
        }
      }
    }

    for (const p in t) {
      localNodes[p] = t[p];
      localWeights[p] = weight;
    }
  };

  const h = 30 / options.localJumps;
  for (let p = 0; p < options.localJumps; p++) {
    build(30 - h * (p + 1));
  }

  if (options.localInterlinks) {
    for (const nodeName in localNodes) {
      if (globalNodes[nodeName]) {
        localNodes[nodeName] = globalNodes[nodeName];
      }
    }
  }

  return result;
}

export function createDataEngineRender(
  app: App,
  workspace: DendronWorkspace
): GraphEngine["render"] {
  return function (this: GraphEngine) {
    const isLocalGraph = isLocalGraphView(this.view);
    if (isLocalGraph && !this.options.localFile) {
      this.renderer.setData({
        nodes: {},
        numLinks: 0,
      });
      return 0;
    }

    const filterFile = (file: string, nodeType: string) => {
      if (!this.searchQueries) {
        return true;
      }
      if ("" === nodeType) {
        return this.fileFilter.hasOwnProperty(file) ? this.fileFilter[file] : !this.hasFilter;
      }
      if ("attachment" !== nodeType) return true;
      return this.searchQueries.every(function (query) {
        return !!query.color || !!query.query.matchFilepath(file);
      });
    };

    if (isLocalGraph) {
      this.progression = 0;
    }

    let data: any = getGlobalNodes(app, workspace, this.options, filterFile, this.progression);
    const { nodes, numLinks } = data;

    if (this.options.localFile) {
      data = getLocalNodes(app, workspace, this.options, nodes);
    }

    if (!this.options.showOrphans) {
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
    this.renderer.setData(data);
    return numLinks;
  };
}
