<script lang="ts">
  import Note from "./Note.svelte";
  import DendronTreePlugin from "./main";
  import { createNoteTree } from "./note";

  export let plugin: DendronTreePlugin;

  const root = plugin.app.vault.getRoot();
  const note = createNoteTree(root);
</script>

<Note {note} />
