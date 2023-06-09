<script lang="ts">
  import NoteComponent from "./NoteComponent.svelte";
  import { dendronVaultList } from "../store";
  import { DendronVault } from "../engine/vault";
  import { Note } from "../engine/note";

  const children: Record<string, NoteComponent> = {};

  export function focusTo(vault: DendronVault, note: Note) {
    const vaultComponent = children[vault.config.name];
    if (!vaultComponent) return;

    const pathNotes = note.getPathNotes();
    pathNotes.shift();
    vaultComponent.focusNotes(pathNotes);
  }
</script>

<div>
  {#each $dendronVaultList as vault (vault.config.name)}
    <NoteComponent note={vault.tree.root} isRoot {vault} bind:this={children[vault.config.name]} />
  {/each}
</div>
