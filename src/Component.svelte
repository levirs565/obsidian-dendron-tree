<script lang="ts">
  import { onDestroy } from "svelte/internal";
  import NoteComponent from "./Note.svelte";
  import { createNoteTree, Note } from "./note";
  import { plugin } from "./store";

  let note: Note | undefined = undefined;

  const unsubscribe = plugin.subscribe((plugin) => {
    const root = plugin.app.vault.getRoot();
    note = createNoteTree(root);
  });

  onDestroy(unsubscribe);
</script>

{#if note}
  <NoteComponent {note} />
{/if}
