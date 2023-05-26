import { derived, get, writable } from "svelte/store";
import type ExamplePlugin from "./main";
import { Note } from "./note";
import { TFile } from "obsidian";
import { DendronVault } from "./dendron-vault";

export const plugin = writable<ExamplePlugin>();
export const getPlugin = () => get(plugin);

export const activeFile = writable<TFile>();

export const rootNote = writable<Note>();
export const getRootNote = () => get(rootNote);

export const dendronVaultList = writable<DendronVault[]>([]);
export const getDendronVaultList = () => get(dendronVaultList);

export const showVaultPath = derived(dendronVaultList, ($list) => $list.length > 1);
