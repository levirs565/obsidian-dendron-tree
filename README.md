# Obsidian Dendron Tree

Obsidian Dendron Tree add tree for exploring [Dendron](https://www.dendron.so/) note.

![Dendron Tree](images/dendron-tree.png)

Features:

- Dendron Tree, browse note easily using tree
- Lookup
- Automatically generate frontmatter on new file
- Multi vault support
- Custom resolver and renderer for link and ambed

## Dendron Tree

To view the Dendron Tree you can select "Open Dendron Tree" in Ribbon bar.

Note with orange circle indicator (![Note without corresponding file](images/note-without-file.png))
is note that does not have corresponding file.

To open note file you can select note name in tree. This also expand the note in tree.

To expand and collapse note you can select arrow (![Note arrow](images/arrow.png)) in left of note.

You can right click on Desktop or long press on Mobile note to open note menu. Note menu will have
following item:

- "Create Current Note". This will create file for selected note. This only show when note does not
  have corresponding file.
- "Create New Note". This will open Lookup with selected note's path as initial prompt. You can see
  lookup documentation on how to use it.
- "Delete Note". This will delete selected note file. This only show when note have corresponding
  file.

## Lookup

![Lookup note](images/lookup.png)

To lookup note you can run command "Dendron Tree: Lookup Note". With this you can open and delete
note.

![Create new](images/lookup-new.png)

You can create note by inputting Dendron path that does not exist. Then you will get "Create New"
item. Select this item to create new note.

![Create note file for file-less note](images/create-new-existing.png)

You can also select note that does not have corresponding file. Item that when is selected create
new note is indicated by `+` icon at right.

> It's reccomended to always input Dendron path in lookup modal.

## Multi Vault

You can add or remove vault in Plugin Settings. You must specify vault path and vault name.

## Custom Resolver and Renderer (Disabled by Default)

Dendron and Obsidian have different format and capability for ref/embed and wikilink. When this
feature enabled, all wikilink and embed will forced to render using Dendron format. This also
override link hover functionality.

Here are the brief differences between Dendron and Obsidian regarding WikiLink.

This is format of Obsidian WikiLink:

```
[[href|title]]
```

Whereas, this is format of Dendron WikiLink:

```
[[title|href]]
```

In Obsidian, if title for wikilink is not specified then the link will be used as the title. But, in
Dendron, note target's title will be used as the title.

In Dendron, to target note in another vault we must use special syntax like this:

```
dendron://vault_name/note_path
```

For embed/ref, Dendron format are extenstion for Obsidian format. You can see Dendron documentation
about [Note Reference](https://wiki.dendron.so/notes/f1af56bb-db27-47ae-8406-61a98de6c78c)
