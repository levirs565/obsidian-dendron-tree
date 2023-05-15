import { ItemView, WorkspaceLeaf } from "obsidian";

import Component from "./Component.svelte";
import DendronTreePlugin from "./main";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {
  component: Component;

  constructor(leaf: WorkspaceLeaf, private plugin: DendronTreePlugin) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText() {
    return "Example view";
  }

  async onOpen() {
    this.component = new Component({
      target: this.contentEl,
      props: {
        plugin: this.plugin,
      },
    });
  }

  async onClose() {
    this.component.$destroy();
  }
}
