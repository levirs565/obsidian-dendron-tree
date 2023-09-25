import {
  App,
  ButtonComponent,
  MarkdownRenderChild,
  MarkdownRenderer,
  MarkdownRendererConstructorType,
  OpenViewState,
  TFile,
  setIcon,
} from "obsidian";
import { openFile } from "../utils";
import { MaybeNoteRef, RefRange, getRefContentRange, anchorToLinkSubpath } from "../engine/ref";
import { dendronActivityBarName } from "../icons";

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
  file: TFile;
  range: RefRange | null;
  markdown?: string;
  found = false;

  constructor(
    public readonly app: App,
    public readonly containerEl: HTMLElement,
    public readonly ref: MaybeNoteRef
  ) {
    super(containerEl);

    if (!ref.note || !ref.note.file)
      throw Error("NoteRefChild only accept ref with non-blank note and file");

    this.file = ref.note.file;

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
      const openState: OpenViewState = {};
      if (this.ref.subpath) {
        openState.eState = {
          subpath: anchorToLinkSubpath(
            this.ref.subpath.start,
            this.app.metadataCache.getFileCache(this.file)?.headings
          ),
        };
      }
      openFile(this.app, this.ref.note?.file, { openState });
    };

    this.renderer = new RefMarkdownRenderer(this, true);
    this.addChild(this.renderer);
  }

  async getContent(): Promise<string> {
    this.markdown = await this.app.vault.cachedRead(this.file);

    if (!this.ref.subpath) {
      this.found = true;
      return this.markdown;
    }

    const metadata = this.app.metadataCache.getFileCache(this.file);
    if (metadata) {
      this.range = getRefContentRange(this.ref.subpath, metadata);
      if (this.range) {
        let currentLineIndex = 0;
        while (currentLineIndex < this.range.startLineOffset) {
          if (this.markdown[this.range.start] === "\n") currentLineIndex++;
          this.range.start++;
        }

        this.found = true;
        return this.markdown.substring(this.range.start, this.range.end);
      }
    }

    this.found = false;
    return "### Unable to find section "
      .concat(this.ref.subpath.text, " in ")
      .concat(this.file.basename);
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
    this.renderer.renderer.set(content);
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
  constructor(app: App, containerEl: HTMLElement, target: MaybeNoteRef) {
    super(containerEl);

    this.containerEl.classList.add("dendron-embed", "file-embed", "mod-empty", "is-loaded");
    this.containerEl.setText("");

    const icon = this.containerEl.createDiv("dendron-icon");
    setIcon(icon, dendronActivityBarName);
    const content = this.containerEl.createDiv();

    const { vaultName, vault, path } = target;

    if (vaultName === "") {
      content.setText("Vault name are unspecified in link.");
      return;
    } else if (!vault) {
      content.setText(`Vault ${vaultName} are not found.`);
      return;
    } else if (path === "") {
      content.setText("Note path are unspecified in link.");
      return;
    }
    content.setText(`"${target.path}" is not created yet. Click to create.`);

    this.containerEl.onclick = () => {
      vault.createNote(path).then((file) => openFile(app, file));
    };
  }
}

export function createRefRenderer(target: MaybeNoteRef, app: App, container: HTMLElement) {
  if (!target.note || !target.note.file) {
    return new UnresolvedRefRenderChild(app, container, target);
  } else {
    return new NoteRefRenderChild(app, container, target);
  }
}
