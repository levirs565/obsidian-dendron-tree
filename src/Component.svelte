<script lang="ts">
  import Note from "./Note.svelte";
  import DendronTreePlugin from "./main";
  import { createNoteTree } from "./note";

  export let plugin: DendronTreePlugin;

  const root = plugin.app.vault.getRoot();
  const notes = createNoteTree(root);
</script>

<div class="number">
  <span>My number is {notes.length}!</span>
  {#each notes as note}
    <Note {note} />
  {/each}
</div>

<style>
  .number {
    color: red;
  }
</style>
