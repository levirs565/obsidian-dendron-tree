import { writable } from "svelte/store";
import type ExamplePlugin from "./main";

export const plugin = writable<ExamplePlugin>();
