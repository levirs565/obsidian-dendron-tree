# Changelog

## Unreleased

Fix:

- When ref target a header that header after it have lower level, ref content start from the header
  and end in header with same level
- When open link and ref with heading subpath, document not scrolled into start heading 

## 1.2.2

Fix:

- Clicking in wikilink with alias point to note with path is wikilink's alias not wikilink's path
  (Preview mode, source mode and live mode)
- Wikilink title is swapped when there are two or more wikilink with equal path one of them is
  edited (Live mode only)
- Wikilink in give useless tooltip (Preview mode only)
- Create new note loses capitalization
- When there are note that path is match query with case insensitive "Create New Note" item show

## 1.2.1

Fix:

- Tree scrolling after open note through tree

## 1.2.0

New Features:

- Add "Reveal in Dendron Tree" menu item to context menu in file tab.
- Multi vault support.
- Automatically generate front matter when a new file created. This can disabled in setting.
- Custom resolver for renderer for link and embed/ref. This can disabled in setting.

## 1.1.1

Fix:

- Dendron icon not adapt Obsidian theme.
- File name is case sensitive. File name must case insensitive.
- Generated title not respect file name. If file name has uppercase letter then do not title case
  then do not title case title.

## 1.1.0

Fix:

- Not work on Android.

## 1.0.1

Fix:

- Remove "obsidian" from plugin id.

## 1.0.0

Initial reelase.

Features:

- Dendron tree
- Lookup note
