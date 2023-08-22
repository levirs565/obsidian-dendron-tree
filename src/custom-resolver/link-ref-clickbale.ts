import { EditorView, PluginValue } from "@codemirror/view";
import { Editor, editorInfoField } from "obsidian";

type GetClickableTokenType = Required<Editor>["getClickableTokenAt"];

export class LinkRefClickbale implements PluginValue {
  static createClickableTokenAtWrapper(original: GetClickableTokenType): GetClickableTokenType {
    return function (this: Editor, ...args) {
      const result: ReturnType<GetClickableTokenType> = original.call(this, ...args);
      if (result && result.type === "internal-link") {
        const raw = this.getRange(result.start, result.end);
        const split = raw.split("|", 2);
        if (split.length === 2) {
          result.text = split[1];
        }
      }
      return result;
    };
  }

  getClickableTokenAtOrig: Editor["getClickableTokenAt"];

  constructor(private view: EditorView) {
    const editor = view.state.field(editorInfoField).editor;
    if (editor && editor.getClickableTokenAt) {
      this.getClickableTokenAtOrig = editor.getClickableTokenAt;
      editor.getClickableTokenAt = LinkRefClickbale.createClickableTokenAtWrapper(
        this.getClickableTokenAtOrig
      );
    }
  }

  destroy(): void {
    if (this.getClickableTokenAtOrig) {
      const editor = this.view.state.field(editorInfoField).editor;
      if (editor) {
        editor.getClickableTokenAt = this.getClickableTokenAtOrig;
      }
    }
  }
}
