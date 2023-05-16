import { ItemView, WorkspaceLeaf } from "obsidian";

import Component from "./components/MainComponent.svelte";
import DendronTreePlugin from "./main";
import * as store from "./store";
import { dendronActivityBarName } from "./icons";

export const VIEW_TYPE_DENDRON = "dendron-tree-view";

export class DendronView extends ItemView {
  component: Component;
  icon = dendronActivityBarName;

  constructor(leaf: WorkspaceLeaf, private plugin: DendronTreePlugin) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_DENDRON;
  }

  getDisplayText() {
    return "Dendron Tree";
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
