import { Component, MarkdownPreviewRenderer, PagePreviewPlugin, Plugin, Workspace } from "obsidian";
import { DendronWorkspace } from "../engine/workspace";
import { createLinkHoverHandler } from "./link-hover";
import { ViewPlugin } from "@codemirror/view";
import { RefLivePlugin } from "./ref-live";
import { createRefMarkdownProcessor } from "./ref-markdown-processor";
import { createLinkOpenHandler } from "./link-open";

export class CustomResolver extends Component {
  pagePreviewPlugin?: PagePreviewPlugin;
  originalLinkHover: PagePreviewPlugin["onLinkHover"];
  originalOpenLinkText: Workspace["openLinkText"];
  markdownPostProcessor = createRefMarkdownProcessor(this.plugin.app, this.workspace);
  editorExtenstion = ViewPlugin.define((v) => {
    return new RefLivePlugin(this.plugin.app, this.workspace);
  });

  constructor(public plugin: Plugin, public workspace: DendronWorkspace) {
    super();
  }

  onload(): void {
    this.plugin.app.workspace.onLayoutReady(() => {
      this.plugin.app.workspace.registerEditorExtension(this.editorExtenstion);

      this.pagePreviewPlugin = this.plugin.app.internalPlugins.getEnabledPluginById("page-preview");
      if (!this.pagePreviewPlugin) return;

      this.originalLinkHover = this.pagePreviewPlugin.onLinkHover;
      this.pagePreviewPlugin.onLinkHover = createLinkHoverHandler(
        this.plugin.app,
        this.workspace,
        this.originalLinkHover.bind(this.pagePreviewPlugin)
      );
    });

    MarkdownPreviewRenderer.registerPostProcessor(this.markdownPostProcessor);

    this.originalOpenLinkText = this.plugin.app.workspace.openLinkText;
    this.plugin.app.workspace.openLinkText = createLinkOpenHandler(
      this.workspace,
      this.originalOpenLinkText.bind(this.plugin.app.workspace)
    );
  }

  onunload(): void {
    this.plugin.app.workspace.openLinkText = this.originalOpenLinkText;
    MarkdownPreviewRenderer.unregisterPostProcessor(this.markdownPostProcessor);
    this.plugin.app.workspace.unregisterEditorExtension(this.editorExtenstion);

    if (!this.pagePreviewPlugin) return;
    this.pagePreviewPlugin.onLinkHover = this.originalLinkHover;
  }
}
