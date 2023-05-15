<script lang="ts">
  import type { Action } from "svelte/types/runtime/action";
  import { slide } from "svelte/transition";
  import { Note } from "./note";
  import { getIcon, getIconIds } from "obsidian";

  export let note: Note;

  let isCollapsed = true;

  function onClick(e: Event) {
    isCollapsed = !isCollapsed;
  }

  const icon: Action = function (node) {
    node.appendChild(getIcon("right-triangle")!);
  };
</script>

<div class="tree-item is-clickable" class:is-collapsed={isCollapsed}>
  <div class="tree-item-self is-clickable mod-collapsible" on:click={onClick}>
    {#if note.children.length > 0}
      <div class="tree-item-icon collapse-icon" use:icon />
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
