<script lang="ts">
  import { Note } from "./note";

  export let note: Note;
</script>

<div class="note">
  <div class="title">{note.name}</div>
  <div class="children">
    {#each note.children as child (child.name)}
      <svelte:self note={child} />
    {/each}
  </div>
</div>

<style>
  .children {
    padding-left: 8px;
  }
</style>
