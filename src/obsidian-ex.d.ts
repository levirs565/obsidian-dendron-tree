import "obsidian";

declare module "obsidian" {
  interface MarkdownRenderer {
    renderer: {
      set(markdown: string): void;
    };
  }
  interface MarkdownRendererConstructorType {
    new (app: App, container: HTMLElement, queed: boolean): MarkdownRenderer;
  }
}
