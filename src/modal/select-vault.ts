import { SuggestModal } from "obsidian";
import { DendronVault } from "src/dendron-vault";
import DendronTreePlugin from "src/main";

export class SelectVaultModal extends SuggestModal<DendronVault> {
  constructor(private plugin: DendronTreePlugin, private onSelected: (item: DendronVault) => void) {
    super(plugin.app);
  }

  getSuggestions(query: string): DendronVault[] | Promise<DendronVault[]> {
    const queryLowercase = query.toLowerCase();
    return this.plugin.vaultList.filter((value) =>
      value.path.toLowerCase().includes(queryLowercase)
    );
  }
  renderSuggestion(value: DendronVault, el: HTMLElement) {
    el.createEl("div", { text: value.path === "" ? "/" : value.path });
  }
  onChooseSuggestion(item: DendronVault, evt: MouseEvent | KeyboardEvent) {
    this.onSelected(item);
  }
}
