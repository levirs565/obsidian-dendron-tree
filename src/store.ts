import { derived, get, writable } from "svelte/store";
import type DendronTreePlugin from "./main";
import { TFile } from "obsidian";
import { DendronVault } from "./engine/vault";

export const plugin = writable<DendronTreePlugin>();
export const getPlugin = () => get(plugin);

export const activeFile = writable<TFile | null>();

export const dendronVaultList = writable<DendronVault[]>([]);
export const getDendronVaultList = () => get(dendronVaultList);

export const showVaultPath = derived(dendronVaultList, ($list) => $list.length > 1);
