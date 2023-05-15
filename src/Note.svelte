<script lang="ts">
  import type { Action } from "svelte/types/runtime/action";
  import { slide } from "svelte/transition";
  import { Note } from "./note";
  import { TFile, getIcon, getIconIds } from "obsidian";
  import { plugin } from "./store";

  export let note: Note;

  let isCollapsed = true;

  const icon: Action = function (node) {
    node.appendChild(getIcon("right-triangle")!);
  };

  function openFile() {
    const file = note.file;
    if (!file || !(file instanceof TFile)) return;
    plugin.update((plugin) => {
      const leaf = plugin.app.workspace.getLeaf();
      leaf.openFile(file);
      return plugin;
    });
  }
</script>

<div class="tree-item is-clickable" class:is-collapsed={isCollapsed}>
  <div
    class="tree-item-self is-clickable mod-collapsible"
    on:click={() => {
      openFile();
      isCollapsed = false;
    }}
  >
    {#if note.children.length > 0}
      <div
        class="tree-item-icon collapse-icon"
        use:icon
        on:click|stopPropagation={() => {
          isCollapsed = !isCollapsed;
        }}
      />
    {/if}
    <div class="tree-item-inner">
      {note.name}
    </div>
  </div>
  {#if note.children.length > 0 && !isCollapsed}
    <div class="tree-item-children" transition:slide={{ duration: 100 }}>
      {#each note.children as child (child.name)}
        <svelte:self note={child} />
      {/each}
    </div>
  {/if}
</div>
