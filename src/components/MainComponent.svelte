<script lang="ts">
  import NoteComponent from "./NoteComponent.svelte";
  import { dendronVaultList } from "../store";
  import { DendronVault } from "../engine/vault";
  import { Note } from "../engine/note";

  const children: Record<string, NoteComponent> = {};

  let pendingOpenNote: Note | null = null;

  export function focusTo(vault: DendronVault, note: Note) {
    if (pendingOpenNote === note) {
      pendingOpenNote = null;
      return;
    }
    const vaultComponent = children[vault.config.name];
    if (!vaultComponent) return;

    const pathNotes = note.getPathNotes();
    pathNotes.shift();
    vaultComponent.focusNotes(pathNotes);
  }

  function onOpenNote(e: CustomEvent<Note>) {
    pendingOpenNote = e.detail;
  }
</script>

<div>
  {#each $dendronVaultList as vault (vault.config.name)}
    <NoteComponent
      note={vault.tree.root}
      isRoot
      {vault}
      bind:this={children[vault.config.name]}
      on:openNote={onOpenNote}
    />
  {/each}
</div>
