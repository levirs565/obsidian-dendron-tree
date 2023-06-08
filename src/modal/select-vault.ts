import { App, SuggestModal } from "obsidian";
import { DendronVault } from "../engine/vault";
import { DendronWorkspace } from "../engine/workspace";

export class SelectVaultModal extends SuggestModal<DendronVault> {
  constructor(
    app: App,
    private workspace: DendronWorkspace,
    private onSelected: (item: DendronVault) => void
  ) {
    super(app);
  }

  getSuggestions(query: string): DendronVault[] | Promise<DendronVault[]> {
    const queryLowercase = query.toLowerCase();
    return this.workspace.vaultList.filter((value) =>
      value.path.toLowerCase().includes(queryLowercase)
    );
  }
  renderSuggestion(value: DendronVault, el: HTMLElement) {
    el.createEl("div", { text: value.formattedPath });
  }
  onChooseSuggestion(item: DendronVault, evt: MouseEvent | KeyboardEvent) {
    this.onSelected(item);
  }
}
