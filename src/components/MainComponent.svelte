<script lang="ts">
  import NoteComponent from "./NoteComponent.svelte";
  import { rootNote } from "../store";
</script>

{#if $rootNote}
  <NoteComponent note={$rootNote} />
{/if}
