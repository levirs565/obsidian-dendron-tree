import { Component, GraphView, Plugin, View } from "obsidian";
import { DendronWorkspace } from "src/engine/workspace";
import { createDataEngineRender } from "./data-engine-render";

export class CustomGraph extends Component {
  constructor(public plugin: Plugin, public workspace: DendronWorkspace) {
    super();
  }

  isGraphView(view: View): view is GraphView {
    return view.getViewType() === "graph";
  }

  onload(): void {
    this.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", (leaf) => {
        const view = leaf?.view;
        if (view && this.isGraphView(view)) {
          view.dataEngine.render = createDataEngineRender(this.plugin.app, this.workspace, view);
        }
      })
    );
  }
}