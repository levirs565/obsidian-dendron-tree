import { App, ButtonComponent, MarkdownRenderChild, MarkdownRenderer, TFile } from "obsidian";
import { DendronVault } from "./dendron-vault";
import { openFile } from "./utils";
import { RefAnchor, RefRange, getRefContentRange, parseRefAnchor, refAnchorToLink } from "./ref";

interface MarkdownRenderer2 extends MarkdownRenderer {
  renderer: {
    set(markdown: string): void;
  };
}

const MarkdownRenderer2 = MarkdownRenderer as unknown as {
  new (app: App, container: HTMLElement, queed: boolean): MarkdownRenderer2;
};

class RefMarkdownRenderer extends MarkdownRenderer2 {
  constructor(public parent: RefRenderChild, queed: boolean) {
    super(parent.app, parent.previewEl, queed);
  }

  get file(): TFile {
    return this.parent.file;
  }

  edit(markdown: string) {
    this.parent.editContent(markdown);
  }
}

export class RefRenderChild extends MarkdownRenderChild {
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

    this.containerEl.classList.add("markdown-embed", "inline-embed", "is-loaded");
    this.containerEl.setText("");

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

    this.containerEl.classList.add("file-embed", "mod-empty", "is-loaded");
    this.containerEl.setText(`"${path}" is not created yet. Click to create.`);
    this.containerEl.onclick = () => {
      vault.createNote(path).then((file) => openFile(app, file));
    };
  }
}
