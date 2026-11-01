import { Node, Mark, mergeAttributes } from "@tiptap/core";
import { sheetView } from "./sheet.js";
export const CommentMark = Mark.create({
  name: "comment",
  inclusive: false,
  addAttributes() {
    return { thread: { default: null } };
  },
  parseHTML() {
    return [{ tag: "span[data-thread]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      { "data-thread": HTMLAttributes.thread, class: "comment-anchor" },
      0,
    ];
  },
});
export const PullQuote = Node.create({
  name: "pullQuote",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: "blockquote[data-pull]" }];
  },
  renderHTML() {
    return ["blockquote", { "data-pull": "true", class: "pull-quote" }, 0];
  },
});
export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column column+",
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-columns]" }];
  },
  renderHTML() {
    return ["div", { "data-columns": "true", class: "doc-columns" }, 0];
  },
});
export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },
  renderHTML() {
    return ["div", { "data-column": "true" }, 0];
  },
});
export const Chip = Node.create({
  name: "chip",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      kind: { default: "date" },
      label: { default: "" },
      target: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-chip]" }];
  },
  renderHTML({ HTMLAttributes: a }) {
    return [
      "span",
      { "data-chip": a.kind, "data-target": a.target, class: "chip " + a.kind },
      a.label,
    ];
  },
});
export const FileNode = Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      name: { default: "" },
      data: { default: "" },
      mime: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-attachment]" }];
  },
  renderHTML({ HTMLAttributes: a }) {
    return ["div", { "data-attachment": a.name, class: "attachment" }, a.name];
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = "attachment";
      const b = document.createElement("button");
      b.textContent = "↓ " + node.attrs.name;
      b.onclick = () =>
        window.desktop.exportBinary({
          name: node.attrs.name,
          data: node.attrs.data,
        });
      dom.append(b);
      return { dom };
    };
  },
});
export const VideoNode = Node.create({
  name: "videoAttachment",
  group: "block",
  atom: true,
  addAttributes() {
    return { src: { default: "" }, name: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "video[src]",
        getAttrs: (e) => ({
          src: e.getAttribute("src"),
          name: e.getAttribute("title") || "",
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes: a }) {
    return [
      "video",
      { src: a.src, title: a.name, controls: "true", style: "max-width:100%" },
    ];
  },
});
export const SheetNode = Node.create({
  name: "spreadsheet",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      cells: { default: Array.from({ length: 8 }, () => Array(5).fill("")) },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-spreadsheet]" }];
  },
  renderHTML() {
    return [
      "div",
      { "data-spreadsheet": "true" },
      "Embedded spreadsheet (use workspace backup to preserve formulas)",
    ];
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = sheetView(
        structuredClone(node.attrs.cells),
        (cells) => {
          const pos = getPos();
          if (typeof pos === "number")
            editor.commands.command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, { cells });
              return true;
            });
        },
        (text) =>
          window.desktop.export({
            name: "Spreadsheet",
            extension: "csv",
            text,
          }),
      );
      return {
        dom,
        stopEvent: () => true,
        ignoreMutation: () => true,
        update: () => false,
      };
    };
  },
});

import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
export const SectionState = Extension.create({
  name: "sectionState",
  addGlobalAttributes() {
    return [
      {
        types: [
          "heading",
          "paragraph",
          "blockquote",
          "pullQuote",
          "codeBlock",
          "table",
          "spreadsheet",
          "image",
        ],
        attributes: {
          locked: {
            default: false,
            parseHTML: (e) => e.getAttribute("data-locked") === "true",
            renderHTML: (a) => (a.locked ? { "data-locked": "true" } : {}),
          },
          collapsed: {
            default: false,
            parseHTML: (e) => e.getAttribute("data-collapsed") === "true",
            renderHTML: (a) =>
              a.collapsed ? { "data-collapsed": "true" } : {},
          },
        },
      },
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const hidden = [];
            let level = 0;
            state.doc.forEach((node, pos) => {
              if (
                node.type.name === "heading" &&
                level &&
                node.attrs.level <= level
              )
                level = 0;
              if (level)
                hidden.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: "collapsed-hidden",
                  }),
                );
              if (
                !level &&
                node.type.name === "heading" &&
                node.attrs.collapsed
              )
                level = node.attrs.level;
            });
            return DecorationSet.create(state.doc, hidden);
          },
        },
        filterTransaction(tr, state) {
          if (!tr.docChanged || tr.getMeta("allowLocked")) return true;
          const locked = [];
          state.doc.descendants((n) => {
            if (n.attrs.locked && n.attrs.id)
              locked.push([n.attrs.id, JSON.stringify(n.toJSON())]);
          });
          if (!locked.length) return true;
          const after = new Map();
          tr.doc.descendants((n) => {
            if (n.attrs.id) after.set(n.attrs.id, JSON.stringify(n.toJSON()));
          });
          return locked.every(([id, value]) => after.get(id) === value);
        },
      }),
    ];
  },
});
