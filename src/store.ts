import { get, writable } from "svelte/store";
import type ExamplePlugin from "./main";
import { Note } from "./note";

export const plugin = writable<ExamplePlugin>();
export const getPlugin = () => get(plugin);

export const rootNote = writable<Note>();
export const getRootNote = () => get(rootNote);