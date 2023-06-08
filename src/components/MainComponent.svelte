<script lang="ts">
  import NoteComponent from "./NoteComponent.svelte";
  import { dendronVaultList } from "../store";
  import { DendronVault } from "../engine/vault";
  import { Note } from "../engine/note";

  const children: Record<string, NoteComponent> = {};

  export function focusTo(vault: DendronVault, note: Note) {
    const vaultComponent = children[vault.path];
    if (!vaultComponent) return;

    const pathNotes = note.getPathNotes();
    pathNotes.shift();
    vaultComponent.focusNotes(pathNotes);
  }
</script>

<div>
  {#each $dendronVaultList as vault (vault.path)}
    <NoteComponent note={vault.tree.root} isRoot {vault} bind:this={children[vault.path]} />
  {/each}
</div>
