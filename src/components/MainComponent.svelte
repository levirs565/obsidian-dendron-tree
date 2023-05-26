<script lang="ts">
  import NoteComponent from "./NoteComponent.svelte";
  import { dendronVaultList } from "../store";
</script>

<div>
  {#each $dendronVaultList as vault (vault.path)}
    <NoteComponent note={vault.tree.root} isRoot {vault} />
  {/each}
</div>
