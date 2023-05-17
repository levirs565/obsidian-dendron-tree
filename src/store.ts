import { get, writable } from "svelte/store";
import type ExamplePlugin from "./main";
import { Note } from "./note";
import { TFile } from "obsidian";

export const plugin = writable<ExamplePlugin>();
export const getPlugin = () => get(plugin);

export const activeFile = writable<TFile>();

export const rootNote = writable<Note>();
export const getRootNote = () => get(rootNote);
