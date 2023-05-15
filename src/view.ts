import { ItemView, WorkspaceLeaf } from "obsidian";

import Component from "./MainComponent.svelte";
import DendronTreePlugin from "./main";
import * as store from "./store";

export const VIEW_TYPE_DENDRON = "example-view";

export class DendronView extends ItemView {
  component: Component;

  constructor(leaf: WorkspaceLeaf, private plugin: DendronTreePlugin) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_DENDRON;
  }

  getDisplayText() {
    return "Example view";
  }

  async onOpen() {
    store.plugin.set(this.plugin);
    this.component = new Component({
      target: this.contentEl,
    });
  }

  async onClose() {
    this.component.$destroy();
  }
}
