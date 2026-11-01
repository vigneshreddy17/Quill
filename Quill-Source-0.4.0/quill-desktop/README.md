# Quill for Windows — 0.4.0

A substantially rebuilt offline document workspace based on the inspected Quip desktop UI and the supplied paragraph-menu screenshot. Independent software, not affiliated with Quip or Salesforce. This release replaces the basic 0.1 editor; it is not certified as an exact or complete Quip replica.

## Changes in 0.4.0

- Quip-inspired typography profiles: Atlas, Modern, Byline, Marseilles and Manuscript, plus Lightning and Arial observed in the live menu. Typography is now saved per document, separately from the light/dark app appearance.
- Format → Typography offers previews, Apply/Cancel and Set as default for new documents. Settings also has the default. Templates and duplication retain their typography; history records it.
- Atlas pairs sans-serif headings with serif body copy. Manuscript centers headings and uses bundled Courier Prime. Other original typefaces are used when installed; OFL-licensed offline alternatives are bundled. This is not a claim of exact commercial-font reproduction.
- Right-side document outline with a hover/focus peek affordance, pinning through Keep Outline Expanded, active-location indication, and top-level checklist links. Navigating to a hidden task expands the relevant collapsed heading.
- Always Show Sidebar, a recent history list, and Standard/Wide document layouts in View.
- History entries now open a safe text comparison with green additions, red deletions, typography/layout metadata and explicit snapshot restore. This remains local snapshot history, not multi-user change merging.
- See TYPOGRAPHY_RESEARCH.md for the source posts, font mappings and limitations.

## Changes in 0.3.0

- Repaired repeated formatting selection and centralized shortcuts in a capture-phase, context-aware handler. Removed the hidden Electron default menu that could own conflicting accelerators.
- Added Quip's Ctrl+/ shortcut reference and Ctrl+Shift+J Command Library, physical-key handling for Ctrl+Alt headings/shifted digits, aliases, style cycling, checklist completion, list movement and keyboard link submission.
- Added persistent System, Light and Dark appearance modes. Use the appearance icon above the avatar, or Settings → Appearance.
- Added a visible trash icon to home rows and folder-tree files, with Undo and normal Trash restore; no need to open a document. Delete also works on a focused file row.
- Replaced the inspected screenshot controls with reference SVG geometry and measured Quip icon sizes. Other icons retain the fallback set.
- Added QUIP_RESEARCH.md with evidence, source links, shortcut conflicts and exact-parity limits.

## Open the Windows app

Extract the entire Windows x64 ZIP, then run **Quill.exe** in its extracted folder. Keep all included runtime files together. Node.js is not required for the packaged app. The build is an unsigned development release and has not been launched on Windows in this environment.

The workspace remains in the same per-user location used by 0.1. Existing documents migrate to the new integrated rich-text title automatically. Export a workspace backup before upgrading if you have important documents in 0.1.

## What changed from 0.1

### Interface and editing

- Reference SVG geometry is used for inspected controls; compact 61 px document header and 54 px ribbon, dark surface colors, a References pill and a custom paragraph popup follow the reference.
- The title is part of the structured editor, rather than an isolated plain-text field. It supports heading formatting, selection, undo and keyboard navigation along with the body.
- Paragraph, Heading 1–4, bulleted list, numbered list, checklist, pull quote, block quote and code block appear in the paragraph menu with shortcuts.
- Bold, italic, underline, strikethrough, inline code, subscript/superscript, text colors, custom colors, multicolor highlight, alignment and clear formatting.
- Formatting preserves the text selection across controls and dialogs. Standard rich-text paste and Markdown-style input shortcuts are supplied by Tiptap/ProseMirror.
- Categorized, searchable insertion picker through Insert or typing @. Local person labels, date chips, document references and folder references are structured inline nodes.
- Images, local video, downloadable file attachments, horizontal rules, editable columns, tables and embedded spreadsheets.
- Table row/column insertion and deletion, merge/split cells, header row toggle, resizing and keyboard cell navigation.
- Section controls support styles, alignment, comments, local anchor links, locking, collapse/expand and history. Locked sections reject content changes. Collapsed headings hide the following section until the next heading at the same or higher level.
- Generated outline, block numbers, focus mode, sans/serif/monospace document typography, page-break guides and word/character counts.
- Find Next and Replace All preserve the document structure and participate in undo.

### Documents, files and persistence

- Document creation, rename, duplicate, move, favorite, trash and restore; nested folder browsing with collapsible Private tree; folder rename, creation and removal.
- Real title/body search, recent/frequent ordering, compact/regular list density, sorting, updates view and favorites filtering.
- Workspace search supports file-type and recently-opened filters. Only local files exist, so cloud member/author access filters are omitted.
- Local references navigate to the target document/folder. Copy Anchor Link generates a quill:// reference. Use Compose → Open Local Link or Document → Open Local Link to open a copied reference; this release does not register an operating-system URL handler.
- Automatic snapshots during editing and when leaving a document, manual checkpoints and history restore. Restoring first keeps a checkpoint of the current content.
- Debounced, ordered saves; atomic file replacement, fsync, previous-version .bak, visible save failures and retry. Normal window close waits for a save and cancels closing on failure. A single-instance guard reduces conflicting writers.

### Local comments and conversation

- Anchored comment threads attached to document text, with replies, resolve/reopen and deletion.
- Anchors move with text edits through editor marks. Removing all anchored text leaves the thread available in the comment list.
- Persistent per-document conversation messages and file attachments; message deletion, comment list and open-comment view.
- Checklist task aggregation with completion checkboxes that update the source document. Source links navigate back to the checklist block.
- These are local annotations and messages on one computer. They do not simulate other users or deliver notifications remotely.

### Local spreadsheets

- Standalone spreadsheets and embedded spreadsheet blocks.
- Formula bar, editable cells, row/column headers, add/delete row/column, tab-separated paste and CSV export.
- Formula parsing through the MIT-licensed hot-formula-parser library, including arithmetic, references/ranges, logical comparisons, SUM, AVERAGE, COUNTIF, IF and other supported library functions.
- Circular references, invalid references and parse errors are visible. Calculation is bounded and memoized; no formula text is executed as JavaScript.
- This is a single-sheet grid per spreadsheet block, not Quip's full workbook/chart engine. Formula reference adjustment after row/column insertion/deletion, multiple workbook tabs, pivot tables, charts, cell-formatting tools and exact Quip formula compatibility are not implemented.

### File formats

| Format | Import | Export | Boundaries |
|---|---|---|---|
| Workspace/document JSON | Yes | Yes | Best option for preserving editor nodes, attachments, comments and history. Imports create copies. |
| HTML | Yes | Yes | Supported rich-text schema; unsupported markup is discarded. |
| Plain text | Yes | Yes | Paragraph text. |
| Markdown | Yes | Yes | Standard Markdown/GFM text and tables; app-specific nodes are flattened. |
| Word .docx | Yes | Yes | Paragraphs, headings, inline marks, lists, tables, hyperlinks and common embedded image types. Columns and app-specific embeds are simplified; comments/history are not Word review markup. Complex Word layouts are not round-trip exact. |
| Excel .xlsx | First worksheet | Yes | Values/formulas; formatting, additional worksheets and charts are not preserved. |
| CSV | Yes | Yes | Quoted values and multiline fields. |
| PDF | No | Yes | Native Electron print-to-PDF using print styles; native Windows dialog still requires Windows testing. |

Use Document → Export for formats and Compose → Import for imports. Local images are limited to 5 MB; other attachments/video to 20 MB; imports to 30 MB. Binary attachments are stored in the workspace as embedded data. JSON backup is the lossless exchange format for app-specific information.

## Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+Alt+N | New document |
| Ctrl+J | Quick Search |
| Ctrl+S | Flush/retry local save |
| Ctrl+Alt+0 / 1 / 2 / 3 / 4 | Paragraph / Heading 1–4 |
| Ctrl+B / I / U | Bold / Italic / Underline |
| Ctrl+Shift+L / 7 / 9 | Bulleted / Numbered / Checklist |
| Ctrl+Alt+K | Code block |
| Ctrl+Shift+K | Inline code |
| Ctrl+Shift+C | Comment |
| Ctrl+Alt+C | Toggle conversation |
| Ctrl+Shift+M | Focus mode |
| Ctrl+Shift+O | Toggle outline |
| Ctrl+F / Ctrl+Shift+H | Find / Find and Replace |
| Ctrl+Shift+A | Copy local section link |
| Ctrl+P | Print |

## Data and recovery

Normally `%APPDATA%\quill-desktop\workspace.json` on Windows, plus `workspace.json.bak`. The actual folder follows Electron's user-data convention for the package name. The app does not encrypt workspace data. Export JSON backups regularly.

A corrupt or invalid workspace produces an error without overwriting it. With the app closed, copy the original and backup somewhere safe, then restore a known-good backup as workspace.json. Keep the original file for further recovery.

## Exact-parity boundaries

Cloud login, syncing, online invitations and multi-user presence/permissions are excluded as requested. External Salesforce integrations and remotely hosted Live Apps are also absent. Remaining local differences include the full Quip spreadsheet/chart engine, slides, advanced print layout controls, complete folder drag-and-drop/reordering, task pin/hide/due-date views, rich mention/date editing popovers, image annotation/cropping, floating rich-text selection UI, automatic section-level diff display, full accessibility parity and the complete set of Quip menu/submenu behaviors. Some labels/layouts are approximations.

The original Quip service is not bundled and no private Quip document content has been copied. REA's public documentation was reviewed; REA itself was not installed or run. Its agent setup requires adding a server and restarting the agent. Direct UI inspection and the supplied screenshot guided this implementation.

## Build and maintain

Install Node.js 22+ on Windows, extract the source, then:

```
npm ci
npm test
npm start
```

Build the Windows x64 ZIP:

```
npm run package:win
```

Source is organized in src/app.js, src/extensions.js, src/sheet.js, src/formats.js, src/shortcuts.js, src/quip-icons.js, src/style.css, src/themes.css, src/typography.js and src/typography.css. Main-process storage is in store.cjs. The sandboxed renderer receives narrow context-isolated desktop APIs through preload.cjs. Remote navigation and unrequested browser permissions are blocked; external links open only after a user action and URL scheme validation. CSP prohibits remote scripts and connections. Open-source notices are included in dist/THIRD_PARTY_NOTICES.txt and the Electron distribution.

## Verification

Tests execute the actual bundled renderer in jsdom and cover selection-aware formatting, tables and reopening, title/content persistence, search/navigation, anchored comments/replies/resolution, find/replace, migration from 0.1, section locks, heading collapse and failed-save recovery. Other tests cover formula evaluation/errors, DOCX export/import, XLSX value/formula round-trip, CSV parsing and atomic storage/backup/corruption handling.

The Windows artifact is cross-built on Linux and its ZIP is verified. Windows launch, native dialogs/printing, exact pixel comparison, clipboard/IME edge cases, accessibility review and full real-world workbook/Word compatibility remain unverified. Test results do not establish complete Quip parity.
