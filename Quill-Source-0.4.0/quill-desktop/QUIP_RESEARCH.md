# Quip compatibility research — 0.3.0

Research performed against the signed-in Quip web interface, the user-supplied screenshot, and official Quip/Salesforce documentation on November 1, 2026. No private document contents were copied into the application.

## Findings used in this release

1. The live Windows Keyboard Shortcuts panel was inspected through Ctrl+/. Its General and Editing tabs identify the context-sensitive bindings used in this build. These differ from some public help entries: the live panel maps Ctrl+Shift+C to comments and Ctrl+Shift+M to focus mode; a public help table instead assigns Ctrl+Shift+M to comments. The live reference was prioritized for that conflict.
2. Quip supports Ctrl+Shift+J for its Command Library, Ctrl+backtick for style cycling, Ctrl+Enter for checklist completion, and Ctrl+Shift+8 as a bulleted-list alias. These were missing from the prior build. The local shortcut resolver now handles physical key codes and shifted symbols, excludes composing text and ordinary form inputs, and runs before editor keymaps to avoid duplicate execution.
3. A second bug stored ProseMirror's serialized anchor/head selection after a formatting action, then passed it to a command expecting from/to. Repeated actions could reset the caret. The selection representation is now consistent.
4. Electron's hidden application menu can still own accelerators. This build removes that default menu so its bindings do not override app navigation. Native Windows shortcut handling still needs testing on Windows.
5. Quip's public accessibility guide describes both operating-system theme following and a manual appearance override. The local app now offers System, Light and Dark from the rail and Settings, with persistent preferences and native window theme updates.
6. Quip's shown icons are inline SVGs. The inspected navigation icons use a 20×20 display area inside 56×48 buttons; ribbon icons use 16×16 inside 32×28 controls. The available path geometry for shown controls was reproduced directly in src/quip-icons.js, with currentColor for both themes. Remaining, uninspected icons use the existing fallback set. This is not a claim that every icon in the entire Quip product has been extracted or matched.
7. A visible trash action on each home document row is a requested usability addition. It soft-deletes without opening the file, offers Undo, and remains recoverable from Trash. The folder tree also exposes it. Delete works when a document row button is focused; ordinary document text deletion is not intercepted.

## Can this become an exact clone?

The observable local interface and documented editor behaviors can be reproduced and verified feature by feature. Exact whole-product parity is not established by matching a screenshot or reading an inspection-tool repository. It requires a complete behavior inventory, visual comparison at matching viewport/zoom, and native Windows tests. The current research has not recovered Quip's original application source or its complete local spreadsheet/Live App implementation.

Cloud accounts and synchronization remain excluded at the user's request. Remaining known differences include advanced workbook/chart behavior, slides/Live Apps, image annotation, task due/pin/hide views, some context menus and drag-and-drop, and unverified pixel-level and accessibility behavior. These are recorded in README.md; they are not presented as completed features.

REA was reviewed previously, not installed or used to recover source. Its setup registers a server and workflow instructions and requires restarting the agent. Direct browser inspection provides the evidence used here.

## Primary sources

- [Quip accessibility guidance](https://quip.com/intl/es/training/accessibility-for-quip): appearance settings, command library, keyboard navigation, checklist and comment interaction.
- [Quip keyboard shortcuts](https://help.salesforce.com/s/articleView?id=000389937&language=en_US&type=1): public Windows/Mac table; conflicts with the inspected live panel are noted above.
- [Using Markdown in Quip](https://quip.com/blog/markdown): checklist, heading, code-block and comment input syntax.
- [REA repository](https://github.com/morluto/rea): inspection toolkit and setup description, not a source-code export for Quip.
- Signed-in live reference: https://quip.com/all, Keyboard Shortcuts → General / Editing, visible SVG controls and measured dimensions.

## Verification limits

Automated tests dispatch keyboard events at the actual bundled editor DOM and check resulting document structure, repeated formatting, context routing, link submission, theme save/reopen, and trash/undo/restore. They do not replace a native Windows runtime test, a browser-engine visual test or pixel comparison.
