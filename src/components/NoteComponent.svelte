<script lang="ts">
  import type { Action } from "svelte/types/runtime/action";
  import { slide } from "svelte/transition";
  import { Note } from "../note";
  import { Menu, getIcon } from "obsidian";
  import { activeFile, getPlugin } from "../store";
  import { openFile } from "../utils";
  import { LookupModal } from "../modal/lookup";

  export let note: Note;

  let isCollapsed = true;
  $: isActive = note.file && $activeFile === note.file;

  const icon: Action = function (node) {
    node.appendChild(getIcon("right-triangle")!);
  };

  async function createCurrentNote() {
    const path = note.getPath();
    const plugin = getPlugin();
    const file = await plugin.createNote(path);
    openFile(plugin.app, file);
  }

  function deleteCurrentNote() {
    const plugin = getPlugin();
    if (!note.file) return;
    plugin.app.vault.delete(note.file);
  }

  function openLookup() {
    new LookupModal(getPlugin(), note.getPath()).open();
  }

  function openMenu(e: MouseEvent) {
    const menu = new Menu();

    if (!note.file) {
      menu.addItem((item) => {
        item.setTitle("Create Current Note").setIcon("create-new").onClick(createCurrentNote);
      });
    }

    menu.addItem((item) => {
      item.setTitle("Create New Note").setIcon("plus").onClick(openLookup);
    });

    if (note.file)
      menu.addItem((item) => {
        item.setTitle("Delete Note").setIcon("trash").onClick(deleteCurrentNote);
      });

    menu.showAtMouseEvent(e);
  }
</script>

<div class="tree-item is-clickable" class:is-collapsed={isCollapsed}>
  <div
    class="tree-item-self is-clickable mod-collapsible is-active"
    class:is-active={isActive}
    on:click={() => {
      openFile(getPlugin().app, note.file);
      isCollapsed = false;
    }}
    on:contextmenu={openMenu}
  >
    {#if note.children.length > 0}
      <div
        class="tree-item-icon collapse-icon"
        class:is-collapsed={isCollapsed}
        use:icon
        on:click|stopPropagation={() => {
          isCollapsed = !isCollapsed;
        }}
      />
    {/if}
    <div class="tree-item-inner">
      {note.title}
    </div>
    {#if !note.file}
      <div class="dendron-tree-not-found" />
    {/if}
  </div>
  {#if note.children.length > 0 && !isCollapsed}
    <div class="tree-item-children" transition:slide={{ duration: 100 }}>
      {#each note.children as child (child.name)}
        <svelte:self note={child} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .dendron-tree-not-found {
    background: rgb(var(--callout-warning));
    width: var(--size-4-2);
    height: var(--size-4-2);
    border-radius: 100%;
    flex-shrink: 0;
    margin-left: var(--size-2-3);
    align-self: center;
  }
</style>
