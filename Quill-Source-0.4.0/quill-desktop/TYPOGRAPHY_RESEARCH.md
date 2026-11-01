# Typography and related Quip improvements — 0.4.0

The linked typography article is from 2015. It is useful design guidance, not a complete description of today's product. The signed-in Format → Typography menu was also inspected: it additionally lists Lightning and Arial. No typography settings were changed in the user's Quip account.

## Implemented typography

| Preset | Original typefaces named by the post or live UI | Offline fallback in Quill |
|---|---|---|
| Atlas | Atlas Grotesk headings; Lyon Text body | Source Sans 3 headings; Literata body |
| Modern | Neue Haas Grotesk | Source Sans 3 |
| Byline | Publico | Source Serif 4 |
| Marseilles | Duplicate Sans | DM Sans |
| Manuscript | Courier Prime, centered headings | Bundled Courier Prime |
| Lightning | Salesforce Sans Web, observed live | Source Sans 3; measured 14 px/21 px body rhythm |
| Arial | Arial, observed live | System Arial; Source Sans 3 if unavailable |

Original installed fonts take priority where supported. The app does not distribute the unavailable commercial font files. The five bundled open-source font packages include their OFL licenses. Most profile font sizes and spacing are design approximations; Lightning's body metrics and first-heading metrics were measured from the rendered reference. None of this establishes pixel-identical typography on Windows.

Presets are stored on each document. A separate default affects only future documents. The picker previews the document without changing its text; Cancel restores the old appearance. Typography and layout are retained by duplication, templates, JSON backups and new history snapshots. PDF printing uses the document CSS. Word/Markdown/HTML conversion still has the format limitations documented in README.md.

## Related posts and implemented changes

- [Set a Default Theme](https://quip.com/blog/set-default-theme): inspired the saved new-document default.
- [Document Outlines](https://quip.com/blog/document-outlines): inspired right-side navigation and top-level checklist entries. Peek, pinning and collapsed-section reveal are implemented locally.
- [Sidebar and Menus](https://quip.com/blog/new-quip-sidebar-menus): inspired persistent sidebar pinning and a recent-document list. Older screenshots in this post are not treated as today's exact UI specification.
- [Diffs](https://quip.com/blog/diffs): inspired safe green/red text comparisons in snapshot history. This implementation does not claim collaborative author tracking or offline merge behavior.
- [Typography](https://quip.com/blog/typography): guided the theme family pairings and Manuscript alignment.

A Standard/Wide layout toggle was also added, informed by the current [Document Formatting Options](https://help.salesforce.com/s/articleView?id=000393276&language=en_US&type=1) help article.

## Existing features confirmed, without duplicating them

Markdown-style checklist/heading input, formatting shortcuts, focus mode, file favorites, comments, templates and native spell checking already existed in the app. They were retained. Remote integrations, online collaboration, slides and the full Quip workbook/Live App feature set remain outside this release.

## Verification

Tests cover typography preview/cancel, per-document persistence, new-document default isolation, outline checklist entries, revealing collapsed content, sidebar pin persistence, history comparisons and restore. The earlier editor, shortcut, import/export and storage tests remain in place. Bundled font assets are copied into the distribution with local CSS, so no font network service is required.

Native Windows launch and typography rendering remain unverified. The exact original fonts have not been obtained or bundled, except for the open-source Courier Prime family.
