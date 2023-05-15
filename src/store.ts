import { get, writable } from "svelte/store";
import type ExamplePlugin from "./main";

export const plugin = writable<ExamplePlugin>();
export const getPlugin = () => get(plugin);
