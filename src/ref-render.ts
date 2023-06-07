import {
  App,
  ButtonComponent,
  MarkdownRenderChild,
  MarkdownRenderer,
  MarkdownRendererConstructorType,
  TFile,
  setIcon,
} from "obsidian";
import { DendronVault } from "./dendron-vault";
import { openFile } from "./utils";
import {
  MaybeNoteRef,
  RefAnchor,
  RefRange,
  getRefContentRange,
  parseRefAnchor,
  refAnchorToLink,
} from "./ref";
import { dendronActivityBarName } from "./icons";
import DendronTreePlugin from "./main";

const MarkdownRendererConstructor = MarkdownRenderer as unknown as MarkdownRendererConstructorType;

class RefMarkdownRenderer extends MarkdownRendererConstructor {
  constructor(public parent: NoteRefRenderChild, queed: boolean) {
    super(parent.app, parent.previewEl, queed);
  }

  get file(): TFile {
    return this.parent.file;
  }

  edit(markdown: string) {
    this.parent.editContent(markdown);
  }
}

export class NoteRefRenderChild extends MarkdownRenderChild {
  previewEl: HTMLElement;
  renderer: RefMarkdownRenderer;
  startAnchor?: RefAnchor;
  endAnchor?: RefAnchor;
  range: RefRange | null;
  markdown?: string;
  found = false;

  constructor(
    public app: App,
    public containerEl: HTMLElement,
    public file: TFile,
    public subpath: string
  ) {
    super(containerEl);

    this.containerEl.classList.add("dendron-embed", "markdown-embed", "inline-embed", "is-loaded");
    this.containerEl.setText("");

    const icon = this.containerEl.createDiv("dendron-icon");
    setIcon(icon, dendronActivityBarName);

    this.previewEl = this.containerEl.createDiv("markdown-embed-content");

    const buttonComponent = new ButtonComponent(this.containerEl);
    buttonComponent.buttonEl.remove();
    buttonComponent.buttonEl = this.containerEl.createDiv(
      "markdown-embed-link"
    ) as unknown as HTMLButtonElement;
    buttonComponent.setIcon("lucide-link").setTooltip("Open link");
    buttonComponent.buttonEl.onclick = () => {
      this.app.workspace.openLinkText(this.getLink(), "");
    };

    this.renderer = new RefMarkdownRenderer(this, true);
    this.addChild(this.renderer);
    if (this.subpath.length > 0) {
      const [startStr, endStr] = subpath.split(":#", 2);
      this.startAnchor = parseRefAnchor(startStr);
      if (endStr) this.endAnchor = parseRefAnchor(endStr);
    }
  }

  getLink() {
    let link = this.file.basename;
    if (this.startAnchor) {
      link += refAnchorToLink(this.startAnchor);
    }
    return link;
  }

  async getContent(): Promise<string | null> {
    this.markdown = await this.app.vault.cachedRead(this.file);
    if (this.subpath.length === 0) return this.markdown;

    const metadata = this.app.metadataCache.getFileCache(this.file);
    if (metadata && this.startAnchor) {
      this.range = getRefContentRange(this.startAnchor, this.endAnchor, metadata);
      if (this.range) {
        let currentLineIndex = 0;
        while (currentLineIndex < this.range.startLineOffset) {
          if (this.markdown[this.range.start] === "\n") currentLineIndex++;
          this.range.start++;
        }

        return this.markdown.substring(this.range.start, this.range.end);
      }
    }

    return null;
  }

  editContent(target: string) {
    if (!this.found || !this.markdown) return;

    let md;
    if (!this.range) {
      md = target;
    } else {
      const before = this.markdown.substring(0, this.range.start);
      md = before + target;
      if (this.range.end) {
        const after = this.markdown.substring(this.range.end);
        md += after;
      }
    }
    this.app.vault.modify(this.file, md);
  }

  async loadFile() {
    const content = await this.getContent();
    this.found = !!content;
    this.renderer.renderer.set(
      content ??
        "### Unable to find section ".concat(this.subpath, " in ").concat(this.file.basename)
    );
  }

  onload(): void {
    super.onload();
    this.registerEvent(
      this.app.metadataCache.on("changed", async (file, data) => {
        if (file === this.file) {
          this.loadFile();
        }
      })
    );
  }
}

export class UnresolvedRefRenderChild extends MarkdownRenderChild {
  constructor(app: App, containerEl: HTMLElement, vault: DendronVault, path: string) {
    super(containerEl);

    this.containerEl.classList.add("dendron-embed", "file-embed", "mod-empty", "is-loaded");
    this.containerEl.setText("");

    const icon = this.containerEl.createDiv("dendron-icon");
    setIcon(icon, dendronActivityBarName);
    const content = this.containerEl.createDiv();
    content.setText(`"${path}" is not created yet. Click to create.`);

    this.containerEl.onclick = () => {
      vault.createNote(path).then((file) => openFile(app, file));
    };
  }
}

export function createRefRenderer(
  target: MaybeNoteRef,
  plugin: DendronTreePlugin,
  container: HTMLElement
) {
  if (!target.note || !target.note.file) {
    return new UnresolvedRefRenderChild(plugin.app, container, target.vault, target.path);
  } else {
    return new NoteRefRenderChild(
      plugin.app,
      container,
      target.note.file,
      target.subpath.slice(1) ?? ""
    );
  }
}
