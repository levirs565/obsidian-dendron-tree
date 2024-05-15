<script lang="ts">
  import type { Action } from "svelte/types/runtime/action";
  import { slide } from "svelte/transition";
  import { Note } from "../engine/note";
  import { Menu, Platform, getIcon } from "obsidian";
  import { activeFile, getPlugin, showVaultPath } from "../store";
  import { OpenFileTarget, openFile } from "../utils";
  import { LookupModal } from "../modal/lookup";
  import { DendronVault } from "src/engine/vault";
  import { createEventDispatcher, tick } from "svelte";

  export let note: Note;
  export let isRoot: boolean = false;
  export let vault: DendronVault;

  let headerElement: HTMLDivElement;
  let isCollapsed = true;
  $: isActive = note.file && $activeFile === note.file;

  const icon: Action = function (node) {
    node.appendChild(getIcon("right-triangle")!);
  };

  function openNoteFile(target: undefined | OpenFileTarget) {
    openFile(getPlugin().app, note.file, { openTarget: target });
  }

  async function createCurrentNote() {
    const path = note.getPath(true);
    const plugin = getPlugin();
    const file = await vault.createNote(path);
    openFile(plugin.app, file);
  }

  function deleteCurrentNote() {
    const plugin = getPlugin();
    if (!note.file) return;
    if (plugin.settings.deleteMethod === "moveToTrash")
      plugin.app.vault.trash(note.file, true);
    else if (plugin.settings.deleteMethod === "deletePermanently")
      plugin.app.vault.delete(note.file);
  }

  function openLookup() {
    const { app, workspace } = getPlugin();
    new LookupModal(app, workspace, note.getPath(true)).open();
  }

  function openMenu(e: MouseEvent) {
    const menu = new Menu();

    if (note.file) {
      menu.addItem((item) => {
        item
          .setTitle("Open in new tab")
          .setIcon("lucide-file-plus")
          .onClick(() => openNoteFile("new-tab"));
      });

      menu.addItem((item) => {
        item
          .setTitle("Open to the right")
          .setIcon("lucide-separator-vertical")
          .onClick(() => openNoteFile("new-leaf"));
      });

      if (Platform.isDesktopApp) {
        menu.addItem((item) => {
          item
            .setTitle("Open in new window")
            .setIcon("lucide-maximize")
            .onClick(() => openNoteFile("new-window"));
        });
      }
      menu.addSeparator();
    }

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

  let expandTransitionWaiter: Promise<void> = Promise.resolve();
  let expandTransitionEnd: (value: void) => void;
  function expandTransitionStart() {
    expandTransitionWaiter = new Promise((resolve) => {
      expandTransitionEnd = resolve;
    });
  }

  type FocusNotesFunction = (pathNotes: Note[]) => void;
  const childrenFocus: Record<string, FocusNotesFunction> = {};

  export const focusNotes: FocusNotesFunction = async (pathNotes: Note[]) => {
    const nextNote = pathNotes.shift();

    if (nextNote) {
      isCollapsed = false;
      await tick();

      const focusFN = childrenFocus[nextNote.name];
      if (!focusFN) return;

      if (pathNotes.length === 0) await expandTransitionWaiter;

      focusFN(pathNotes);
    } else
      headerElement.scrollIntoView({
        block: "center",
      });
  };

  interface $$Events {
    openNote: CustomEvent<Note>;
  }

  const dispatcher = createEventDispatcher();
</script>

<div class="tree-item is-clickable" class:is-collapsed={isCollapsed}>
  <div
    class="tree-item-self is-clickable mod-collapsible is-active"
    class:is-active={isActive}
    on:click={() => {
      dispatcher("openNote", note);
      openNoteFile(undefined);
      isCollapsed = false;
    }}
    on:contextmenu={openMenu}
    bind:this={headerElement}
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
      {note.title + (isRoot && $showVaultPath ? ` (${vault.config.name})` : "")}
    </div>
    {#if !note.file}
      <div class="dendron-tree-not-found" />
    {/if}
  </div>
  {#if note.children.length > 0 && !isCollapsed}
    <div
      class="tree-item-children"
      transition:slide={{ duration: 100 }}
      on:introstart={expandTransitionStart}
      on:introend={() => {
        // expandTransitionEnd is dyanmic listener
        expandTransitionEnd();
      }}
    >
      {#each note.children as child (child.name)}
        <svelte:self note={child} {vault} bind:focusNotes={childrenFocus[child.name]} on:openNote />
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
