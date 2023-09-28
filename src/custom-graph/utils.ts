import { GraphView, LocalGraphView, View } from "obsidian";

export function isGraphView(view: View): view is GraphView {
  return view.getViewType() === "graph";
}

export function isLocalGraphView(view: View): view is LocalGraphView {
  return view.getViewType() === "localgraph";
}
