import { Component, Plugin } from "obsidian";
import { DendronWorkspace } from "src/engine/workspace";
import { createDataEngineRender } from "./data-engine-render";
import { createNodeTextHandler } from "./node-text";
import { isGraphView, isLocalGraphView } from "./utils";

export class CustomGraph extends Component {
  constructor(public plugin: Plugin, public workspace: DendronWorkspace) {
    super();
  }

  onload(): void {
    this.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", (leaf) => {
        const view = leaf?.view;
        if (!view) return;
        const isGlobal = isGraphView(view);
        const isLocal = isLocalGraphView(view);
        if (isGlobal || isLocal) {
          const renderFn = createDataEngineRender(this.plugin.app, this.workspace);
          if (isGlobal) view.dataEngine.render = renderFn;
          else view.engine.render = renderFn;

          const nodes = view.renderer.nodes;
          const replace = () => {
            if (nodes.length > 0) {
              const firstNode = nodes[0];
              console.log(firstNode);
              Object.getPrototypeOf(firstNode)["getDisplayText"] = createNodeTextHandler(
                this.workspace
              );
            } else {
              console.log("Retry replace graph node text");
              view.renderer.setData({
                nodes: {
                  Waker: {
                    links: {},
                    type: "",
                  },
                },
              });
              replace();
            }
          };
          replace();
        }
      })
    );
  }
}
