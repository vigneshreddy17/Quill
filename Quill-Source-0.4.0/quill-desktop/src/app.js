import {
  typographyThemes,
  normalizeTypography,
  themeInfo,
} from "./typography.js";
import { diffWordsWithSpace } from "diff";
import { quipIcon } from "./quip-icons.js";
import { shortcutFor, shortcutHelp } from "./shortcuts.js";
import {
  writeDocx,
  readDocx,
  writeXlsx,
  readXlsx,
  htmlToMarkdown,
  markdownToHTML,
  csvToCells,
} from "./formats.js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Placeholder from "@tiptap/extension-placeholder";
import UniqueID from "@tiptap/extension-unique-id";
import {
  CommentMark,
  PullQuote,
  Columns,
  Column,
  Chip,
  FileNode,
  VideoNode,
  SheetNode,
  SectionState,
} from "./extensions.js";
import { sheetView, csv } from "./sheet.js";
import {
  createElement,
  Search,
  House,
  Bell,
  MessagesSquare,
  ListTodo,
  FileText,
  Folder,
  Star,
  Trash2,
  SquarePen,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  SquareCheck,
  Image as ImageIcon,
  Link,
  Table as TableIcon,
  Columns2,
  MessageCirclePlus,
  Maximize2,
  ChevronDown,
  Plus,
  X,
  MoreHorizontal,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  TextQuote,
  Text,
  Calendar,
  Paperclip,
  FileSpreadsheet,
  Video,
  Minus,
  Check,
  ArrowUpRight,
  Lock,
  PanelLeft,
  Download,
  Clock,
  Type,
  Eye,
  CornerDownRight,
  Sun,
  Moon,
  Monitor,
} from "lucide";
const icons = {
  Sun,
  Moon,
  Monitor,
  Search,
  House,
  Bell,
  MessagesSquare,
  ListTodo,
  FileText,
  Folder,
  Star,
  Trash2,
  SquarePen,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  SquareCheck,
  Image: ImageIcon,
  Link,
  Table: TableIcon,
  Columns2,
  MessageCirclePlus,
  Maximize2,
  ChevronDown,
  Plus,
  X,
  MoreHorizontal,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  TextQuote,
  Text,
  Calendar,
  Paperclip,
  FileSpreadsheet,
  Video,
  Minus,
  Check,
  ArrowUpRight,
  Lock,
  PanelLeft,
  Download,
  Clock,
  Type,
  Eye,
  CornerDownRight,
};
const I = (name, size = 18) =>
  quipIcon(name, size) ||
  (icons[name]
    ? createElement(icons[name], {
        width: size,
        height: size,
        "stroke-width": 1.8,
        "aria-hidden": "true",
      }).outerHTML
    : "");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const uid = () => crypto.randomUUID();
const now = () => Date.now();
const date = (t) =>
  new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const stamp = (t) => new Date(t).toLocaleString();
const textOf = (n) => n?.text || (n?.content || []).map(textOf).join(" ");
const root = document.querySelector("#app");
let db,
  editor,
  current = null,
  view = "all",
  tab = "recent",
  query = "",
  sort = "opened",
  descending = true,
  drawer = false,
  conversation = true,
  focus = false,
  popup = null,
  selection = null,
  contextPos = null,
  saveTimer,
  queue = Promise.resolve(),
  revision = 0,
  savedRevision = 0,
  error = "",
  activeThread = null,
  findState = null;
const doc = () => db?.documents.find((d) => d.id === current);
const prefs = () => db.settings;
const status = () =>
  error
    ? "Save failed — retry"
    : savedRevision === revision
      ? "Saved locally"
      : "Saving…";
function dirty() {
  revision++;
  error = "";
  setStatus();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => flush().catch(() => {}), 200);
}
function flush() {
  clearTimeout(saveTimer);
  const rev = revision,
    snapshot = structuredClone(db);
  queue = queue
    .catch(() => {})
    .then(() => window.desktop.save(snapshot))
    .then(() => {
      savedRevision = Math.max(savedRevision, rev);
      error = "";
      setStatus();
    })
    .catch((e) => {
      error = e.message;
      setStatus();
      throw e;
    });
  return queue;
}
function setStatus() {
  const el = document.querySelector("#save");
  if (el) {
    el.textContent = status();
    el.title = error || "Saved on this computer";
  }
}
function checkpoint(d, manual = false) {
  if (!d) return;
  const data = JSON.stringify(d.kind === "sheet" ? d.cells : d.content);
  const last = d.history.at(-1);
  if (
    last &&
    JSON.stringify(d.kind === "sheet" ? last.cells : last.content) === data &&
    last.title === d.title &&
    (!last.typography || last.typography === d.typography) &&
    (!last.layout || last.layout === d.layout) &&
    !manual
  )
    return;
  d.history.push({
    id: uid(),
    at: now(),
    title: d.title,
    content: structuredClone(d.content),
    cells: d.kind === "sheet" ? structuredClone(d.cells) : undefined,
    typography: d.typography,
    layout: d.layout,
    manual,
  });
  const autos = d.history.filter((x) => !x.manual);
  if (autos.length > 100)
    d.history = d.history.filter((x) => x.manual || x !== autos[0]);
}
function changed() {
  const d = doc();
  if (!d || !editor) return;
  if (!d.lastCheckpoint || now() - d.lastCheckpoint > 30000) {
    checkpoint(d);
    d.lastCheckpoint = now();
  }
  d.content = editor.getJSON();
  d.title = editor.state.doc.firstChild?.textContent.trim() || "Untitled";
  const head = document.querySelector(".headtitle");
  if (head) head.textContent = d.title;
  d.text = editor.getText();
  d.updated = now();
  dirty();
  updateOutline();
  updateStats();
}
function newDoc(kind = "doc", template) {
  const d = {
    id: uid(),
    kind,
    title: "Untitled",
    integratedTitle: true,
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 } },
        { type: "paragraph" },
      ],
    },
    text: "",
    cells: Array.from({ length: 20 }, () => Array(8).fill("")),
    created: now(),
    updated: now(),
    opened: now(),
    visits: 0,
    favorite: false,
    folder: view.startsWith("folder:") ? view.slice(7) : null,
    trash: false,
    messages: [],
    comments: [],
    history: [],
    locked: false,
    typography: normalizeTypography(prefs().defaultTypography),
    layout: "standard",
    outlineMode: "peek",
  };
  if (template) {
    d.typography = normalizeTypography(
      template.typography || prefs().defaultTypography,
    );
    d.layout = template.layout || "standard";
    d.content = regenerateIds(template.content);
    d.title = textOf(d.content.content[0]) || template.title;
    d.text = textOf(d.content);
  }
  db.documents.push(d);
  dirty();
  open(d.id);
}
function regenerateIds(node) {
  const n = structuredClone(node);
  function walk(x) {
    if (x.attrs?.id) x.attrs.id = uid();
    if (x.marks) x.marks = x.marks.filter((m) => m.type !== "comment");
    for (const c of x.content || []) walk(c);
  }
  walk(n);
  return n;
}
function dispose() {
  if (doc() && editor) {
    checkpoint(doc());
    dirty();
  }
  editor?.destroy();
  editor = null;
  closePopup();
}
function open(id, anchor) {
  if (!prefs().sidebarPinned) drawer = false;
  dispose();
  current = id;
  const d = doc();
  if (!d || d.trash) {
    current = null;
    render();
    return;
  }
  d.opened = now();
  d.visits++;
  dirty();
  location.hash = id + (anchor ? "~" + anchor : "");
  render();
  if (anchor)
    setTimeout(
      () =>
        document
          .querySelector('[data-id="' + CSS.escape(anchor) + '"]')
          ?.scrollIntoView({ block: "center" }),
      10,
    );
}
function home(v = "all") {
  dispose();
  current = null;
  view = v;
  focus = false;
  drawer = false;
  location.hash = "";
  render();
}
const B = (label, action, cls = "", title = "") =>
  `<button type="button" class="${cls}" data-action="${esc(action)}"${title ? ` title="${esc(title)}" aria-label="${esc(title)}"` : ""}>${label}</button>`;
const IB = (icon, action, title, cls = "") =>
  B(I(icon), action, "icon " + cls, title);
function sidebar() {
  return `<aside class="sidebar"><h3>Home</h3>${B(I("FileText") + "All Files", "home", view === "all" ? "active" : "")}${B(I("Folder") + "Folders", "folders", view === "folders" ? "active" : "")}${B(I("Clock") + "Updates", "updates", view === "updates" ? "active" : "")}<h3 class="favoritesTitle">Favorites ${IB("MoreHorizontal", "favorites", "Show favorites")}</h3><label class="sideSearch">${I("Search", 14)}<input id="favoriteSearch" placeholder="Search Favorites…" aria-label="Search favorites"></label><div id="favorites">${
    db.documents
      .filter((x) => x.favorite && !x.trash)
      .map((x) =>
        B(
          I(x.kind === "sheet" ? "FileSpreadsheet" : "FileText") + esc(x.title),
          "open:" + x.id,
        ),
      )
      .join("") ||
    '<p class="empty dashed">Click the star on any file or folder<br>to add it to your favorites</p>'
  }</div><h3 class="sideHistoryTitle">History</h3><div class="sideHistory">${
    db.documents
      .filter((x) => !x.trash && x.visits > 0)
      .sort((a, b) => b.opened - a.opened)
      .slice(0, 15)
      .map((x) =>
        B(
          I(x.kind === "sheet" ? "FileSpreadsheet" : "FileText", 14) +
            esc(x.title),
          "open:" + x.id,
        ),
      )
      .join("") || '<p class="empty">Recently opened files appear here.</p>'
  }</div><footer>${B(I("Trash2") + "Trash", "trash")}<small>Quill · Offline workspace</small></footer></aside>`;
}
function render() {
  applyTheme();
  root.classList.toggle("focusmode", focus);
  closePopup();
  const d = doc();
  root.innerHTML = `<nav class="rail">${IB("Search", "search", "Search… Ctrl+J")}${IB("House", d ? "drawer" : "home", "Home", !d || drawer ? "active" : "")}${IB("Bell", "notifications", "Notifications")}${IB("Chat", "notes", "Document conversations")}${IB("ListTodo", "tasks", "Tasks")}<span></span>${IB(prefs().theme === "light" ? "Sun" : prefs().theme === "system" ? "Monitor" : "Moon", "thememenu", "Appearance: light, dark or system")}${B("V", "settings", "avatar", "Workspace settings")}</nav>${(!d || drawer || prefs().sidebarPinned) && !focus ? sidebar() : ""}<main>${d ? editorShell(d) : listShell()}</main><dialog id="modal"></dialog>`;
  root.onclick = handle;
  root.oncontextmenu = (e) => {
    const row = e.target.closest("[data-doc]");
    if (row) {
      e.preventDefault();
      documentMenu(row.dataset.doc, { left: e.clientX, bottom: e.clientY });
    }
  };
  const fav = document.querySelector("#favoriteSearch");
  if (fav)
    fav.oninput = (e) =>
      document
        .querySelectorAll("#favorites button")
        .forEach(
          (b) =>
            (b.hidden = !b.textContent
              .toLowerCase()
              .includes(e.target.value.toLowerCase())),
        );
  if (d) mount(d);
  else {
    document.querySelector("#search")?.addEventListener("input", (e) => {
      query = e.target.value;
      rows();
    });
    rows();
  }
}
function listShell() {
  const title =
    {
      all: "All Files",
      folders: "Folders",
      favorites: "Favorites",
      trash: "Trash",
      tasks: "Tasks",
      updates: "Updates",
    }[view] ||
    db.folders.find((f) => f.id === view.slice(7))?.name ||
    "Files";
  return `<header class="homeHeader"><div><h3>${esc(title)}</h3>${view === "all" ? `<div class="tabs">${["recent", "frequent"].map((t) => B(t[0].toUpperCase() + t.slice(1), "tab:" + t, tab === t ? "selected" : "")).join("")}</div>` : ""}</div><div class="right">${B("View " + I("ChevronDown", 12), "viewmenu", "border")}${IB("SquarePen", "compose", "Compose", "border")}</div></header><div class="listbody"><div class="listtools"><label class="listSearch">${I("Search", 16)}<input id="search" placeholder="Search documents…" value="${esc(query)}" aria-label="Search documents"></label>${view === "folders" || view.startsWith("folder:") ? B(I("Plus") + "New Folder", "newfolder") : ""}</div><div id="results"></div></div>`;
}
function rows() {
  const el = document.querySelector("#results");
  if (!el) return;
  if (view === "folders") {
    el.innerHTML = folderTree();
    return;
  }
  if (view === "tasks") {
    el.innerHTML =
      "<h4>Checklist tasks</h4>" +
      db.documents
        .filter((d) => !d.trash)
        .flatMap((d) =>
          tasks(d.content).map(
            (t) =>
              `<div class="taskrow"><input type="checkbox" aria-label="${esc(t.text)}" ${t.checked ? "checked" : ""} data-task-doc="${d.id}" data-task-id="${t.id}">${B(esc(t.text), "taskopen:" + d.id + ":" + t.id)}<span>${esc(d.title)}</span></div>`,
          ),
        )
        .join("");
    if (!el.querySelector(".taskrow"))
      el.innerHTML +=
        '<p class="empty">No checklist items yet. Insert a Checklist in a document.</p>';
    el.querySelectorAll("[data-task-doc]").forEach(
      (b) =>
        (b.onchange = () => {
          const d = db.documents.find((d) => d.id === b.dataset.taskDoc);
          walk(d.content, (n) => {
            if (n.type === "taskItem" && n.attrs?.id === b.dataset.taskId)
              n.attrs.checked = b.checked;
          });
          d.updated = now();
          dirty();
        }),
    );
    return;
  }
  let docs = db.documents.filter(
    (d) =>
      Boolean(d.trash) === (view === "trash") &&
      (view !== "favorites" || d.favorite) &&
      (!view.startsWith("folder:") || d.folder === view.slice(7)) &&
      `${d.title} ${d.text}`.toLowerCase().includes(query.toLowerCase()),
  );
  const key = tab === "frequent" && view === "all" ? "visits" : sort;
  docs.sort((a, b) => {
    const v =
      key === "title"
        ? a.title.localeCompare(b.title)
        : (a[key] || 0) - (b[key] || 0);
    return descending ? -v : v;
  });
  let groups = "";
  let previous = "";
  for (const d of docs) {
    const group =
      view === "all"
        ? new Date(d.opened).toDateString() === new Date().toDateString()
          ? "Today"
          : date(d.opened)
        : "";
    if (group && group !== previous) {
      groups += `<h3 class="dategroup">${esc(group)}</h3>`;
      previous = group;
    }
    groups += `<div class="row ${prefs().compact ? "compact" : ""}" data-doc="${d.id}">${B(I(d.kind === "sheet" ? "FileSpreadsheet" : "FileText") + esc(d.title) + (d.favorite ? I("Star", 13) : ""), "open:" + d.id, "file")}<span>Private</span><span>${date(d.updated)}</span>${view === "trash" ? B("Restore", "restore:" + d.id) : `<span class="rowActions">${IB("Trash2", "quicktrash:" + d.id, "Move " + d.title + " to Trash", "quicktrash")}${IB("MoreHorizontal", "docmenu:" + d.id, "Document options")}</span>`}</div>`;
  }
  el.innerHTML =
    (view.startsWith("folder:")
      ? `<div class="folderrows">${db.folders
          .filter((f) => (f.parent || null) === view.slice(7))
          .map(
            (f) =>
              `<div class="folderrow">${B(I("Folder") + esc(f.name), "folder:" + f.id)}<span>${db.documents.filter((d) => d.folder === f.id && !d.trash).length} files</span>${IB("MoreHorizontal", "foldermenu:" + f.id, "Folder options")}</div>`,
          )
          .join("")}</div>`
      : "") +
    `<div class="columns">${B("Title", "sort:title")}<span>Members</span>${B("Updated", "sort:updated")}<span></span></div>` +
    groups +
    (docs.length ? "" : '<p class="empty">No files in this view.</p>');
}
function folderTree() {
  const expanded = prefs().expanded || ["private"];
  let html =
    '<div class="columns"><span>Title</span><span>Members</span><span>Updated</span></div>';
  const folder = (id, name, depth) => {
    const open = expanded.includes(id) || Boolean(query);
    html += `<div class="treeRow" style="--depth:${depth}">${B(I("ChevronDown", 14) + I("Folder") + esc(name), "tree:" + id, open ? "expanded" : "")}<span>Private</span>${id !== "private" ? IB("MoreHorizontal", "foldermenu:" + id, "Folder options") : ""}</div>`;
    if (open) {
      for (const f of db.folders.filter(
        (f) => (f.parent || null) === (id === "private" ? null : id),
      ))
        folder(f.id, f.name, depth + 1);
      for (const d of db.documents.filter(
        (d) =>
          !d.trash &&
          (d.folder || null) === (id === "private" ? null : id) &&
          d.title.toLowerCase().includes(query.toLowerCase()),
      ))
        html += `<div class="treeRow treeFile" style="--depth:${depth + 1}" data-doc="${d.id}">${B(I(d.kind === "sheet" ? "FileSpreadsheet" : "FileText") + esc(d.title), "open:" + d.id)}<span>${date(d.updated)}</span>${`<span class="rowActions">${IB("Trash2", "quicktrash:" + d.id, "Move " + d.title + " to Trash", "quicktrash")}${IB("MoreHorizontal", "docmenu:" + d.id, "Document options")}</span>`}</div>`;
    }
  };
  folder("private", "Private", 0);
  html += `<div class="treeRow" style="--depth:0">${B(I("Trash2") + "Trash", "trash")}<span>Private</span></div>`;
  return html;
}
function walk(node, fn) {
  fn(node);
  for (const child of node?.content || []) walk(child, fn);
}
function tasks(content) {
  const all = [];
  walk(content, (n) => {
    if (n.type === "taskItem")
      all.push({ checked: n.attrs?.checked, text: textOf(n), id: n.attrs?.id });
  });
  return all;
}
const styles = [
  ["Paragraph", "paragraph", "Text", "Ctrl+Alt+0"],
  ["Heading 1", "h1", "Heading1", "Ctrl+Alt+1"],
  ["Heading 2", "h2", "Heading2", "Ctrl+Alt+2"],
  ["Heading 3", "h3", "Heading3", "Ctrl+Alt+3"],
  ["Heading 4", "h4", "Heading4", "Ctrl+Alt+4"],
  ["Bulleted List", "bullet", "List", "Ctrl+Shift+L"],
  ["Numbered List", "number", "ListOrdered", "Ctrl+Shift+7"],
  ["Checklist", "task", "SquareCheck", "Ctrl+Shift+9"],
  ["Pull Quote", "pullquote", "Quote", ""],
  ["Block Quote", "quote", "TextQuote", ""],
  ["Code Block", "codeblock", "Code", "Ctrl+Alt+K"],
];
function styleState() {
  if (!editor) return styles[0];
  for (let i = 1; i <= 6; i++)
    if (editor.isActive("heading", { level: i }))
      return styles[i]?.[1] === `h${i}`
        ? styles[i]
        : [`Heading ${i}`, `h${i}`, "Heading4", `Ctrl+Alt+${i}`];
  for (const [name, cmd, icon, shortcut] of styles.slice(5))
    if (
      editor.isActive(
        {
          bullet: "bulletList",
          number: "orderedList",
          task: "taskList",
          pullquote: "pullQuote",
          quote: "blockquote",
          codeblock: "codeBlock",
        }[cmd],
      )
    )
      return [name, cmd, icon, shortcut];
  return styles[0];
}
function editorShell(d) {
  const isSheet = d.kind === "sheet";
  return `<header class="editorHeader"><div class="docidentity"><div class="titlebar">${B(esc(d.title), "rename", "headtitle")}${B(I("CornerDownRight", 12) + " References", "references", "references")}</div><div class="menus">${["Document", "Edit", "View", "Insert", "Format"].map((x) => B(x, "menu:" + x, x === "Document" ? "strong" : "")).join("")}<button id="save" data-action="retry">${status()}</button></div></div><div class="right">${IB(d.locked ? "Lock" : "Eye", "readonly", d.locked ? "Unlock editing" : "View-only mode")}${IB("Star", "star", "Add to Favorites", d.favorite ? "active" : "")}${IB("MessagesSquare", "conversation", "Show Conversation", conversation ? "active" : "")}${IB("Maximize2", "focus", "Focus Mode")}${IB("SquarePen", "compose", "Compose")}</div></header>${!isSheet ? `<div class="ribbon" role="toolbar" aria-label="Formatting ribbon">${tool("Undo2", "undo", "Undo")}${tool("Redo2", "redo", "Redo")}<i></i><button id="style" data-action="stylemenu" aria-label="Paragraph style">${I("Text")}<span>Paragraph</span>${I("ChevronDown", 13)}</button><i></i>${tool("Bold", "bold", "Bold")}${tool("Italic", "italic", "Italic")}${tool("Underline", "underline", "Underline")}${tool("Strikethrough", "strike", "Strikethrough")}<button class="colorIcon" data-action="colors" title="Text Color" aria-label="Text Color">${I("TextColor", 16)}</button>${tool("Highlighter", "highlightmenu", "Highlight")}${tool("Code", "code", "Code")}<i></i>${tool("AlignLeft", "alignmentmenu", "Alignment")}<i></i><span class="insertLabel">Insert:</span>${tool("SquareCheck", "task", "Checklist")}${tool("Image", "image", "Image")}${tool("Link", "link", "Link")}${tool("LiveApp", "insertmenu", "Insert")}${tool("Columns2", "columns", "Column")}${tool("Table", "tablemenu", "Table")}<i></i><button data-command="comment" class="commentButton">${I("MessageCirclePlus", 21)}Comment</button></div>` : ""}<div class="workspace ${focus ? "focus" : ""} ${prefs().lineNumbers ? "lineNumbers" : ""}"><article data-typography="${normalizeTypography(d.typography)}" class="typ-${normalizeTypography(d.typography)} layout-${d.layout || "standard"} ${prefs().pageBreaks ? "pageBreaks" : ""}"><div class="paper">${isSheet ? `<div class="documentTitle"><input id="title" aria-label="Document title" value="${esc(d.title)}" ${d.locked ? "readonly" : ""}></div><div id="standaloneSheet"></div>` : `<div class="editorWrap">${IB("MessageCirclePlus", "comment", "Comment on selection", "gutterComment")}<div id="editor"></div><button class="sectionStyle" id="sectionStyle" data-action="sectionmenu">¶ ${I("ChevronDown", 10)}</button></div>`}</div></article>${!isSheet ? outlineShell(d) : ""}${conversation && !focus ? conversationShell(d) : ""}</div><div class="statusbar"><span id="stats"></span><span>${d.locked ? "View only · " : ""}Local workspace</span></div>`;
}
function tool(icon, cmd, title) {
  return `<button type="button" class="icon" data-command="${cmd}" title="${title}" aria-label="${title}">${I(icon)}</button>`;
}
function conversationShell(d) {
  return `<aside class="conversation"><h4>${activeThread ? "Comments" : "Conversation"}<div>${IB("ListTodo", "threadlist", "Show comment threads")}${IB("X", "conversation", "Close conversation")}</div></h4><div class="messages" id="messages">${activeThread ? threadHTML(d.comments.find((t) => t.id === activeThread)) : d.messages.map((m) => `<div class="message"><div><b>You</b><time>${stamp(m.at)}</time></div><p>${esc(m.text)}</p>${m.file ? B(I("Paperclip") + esc(m.file.name), "messagefile:" + m.id) : ""}${B("Delete", "deletemessage:" + m.id, "small muted")}</div>`).join("") || '<p class="empty">Send a message to start the conversation</p>'}</div><form id="messageForm"><textarea id="message" placeholder="${activeThread ? "Reply…" : "Type a message…"}" aria-label="${activeThread ? "Comment reply" : "Message"}"></textarea><div>${IB("Paperclip", "messageattach", "Attach a file")}${B("Send", "send", "primary")}</div></form></aside>`;
}
function threadHTML(t) {
  if (!t) return "";
  return `<div class="thread ${t.resolved ? "resolved" : ""}" data-thread="${t.id}"><p class="quoteText">${esc(t.quote || "Section comment")}</p><span>${t.resolved ? "Resolved" : "Open"}</span>${B(t.resolved ? "Reopen" : "Resolve", "resolve:" + t.id, "small")}<p>${esc(t.text)}</p><small>${stamp(t.at)} · You</small>${B("Delete", "deletecomment:" + t.id, "small muted")}${t.replies.map((r) => `<div class="reply"><b>You</b><p>${esc(r.text)}</p><small>${stamp(r.at)}</small></div>`).join("")}</div>`;
}
function mount(d) {
  const title = document.querySelector("#title");
  if (title)
    title.oninput = (e) => {
      d.title = e.target.value || "Untitled";
      d.updated = now();
      document.querySelector(".headtitle").textContent = d.title;
      dirty();
    };
  if (d.kind === "sheet") {
    const sheetElement = document.querySelector("#standaloneSheet");
    sheetElement.append(
      sheetView(
        structuredClone(d.cells),
        (cells) => {
          if (!d.lastCheckpoint || now() - d.lastCheckpoint > 30000) {
            checkpoint(d);
            d.lastCheckpoint = now();
          }
          d.cells = cells;
          d.updated = now();
          d.text = cells.flat().join(" ");
          dirty();
        },
        (text) => exportText(d.title, "csv", text),
      ),
    );
    sheetElement
      .querySelectorAll("input,button")
      .forEach((el) => (el.disabled = d.locked));
    title.disabled = d.locked;
    bindConversation();
    return;
  }
  editor = new Editor({
    element: document.querySelector("#editor"),
    editable: !d.locked,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Image.configure({ allowBase64: true }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
      Placeholder.configure({
        placeholder: ({ node, pos }) =>
          pos === 0 ? "Untitled" : "Type @ to insert",
        showOnlyCurrent: false,
      }),
      UniqueID.configure({
        types: [
          "heading",
          "paragraph",
          "taskItem",
          "blockquote",
          "pullQuote",
          "codeBlock",
          "table",
          "spreadsheet",
          "image",
        ],
      }),
      CommentMark,
      PullQuote,
      Columns,
      Column,
      Chip,
      FileNode,
      VideoNode,
      SheetNode,
      SectionState,
    ],
    content: d.content,
    onUpdate: changed,
    onSelectionUpdate: () => {
      selection = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      };
      toolbar();
      positionSection();
      updateStats();
      updateOutlineActive();
    },
    onTransaction: toolbar,
    editorProps: {
      attributes: { "aria-label": "Document content", spellcheck: "true" },
      handleClick(view, pos, event) {
        const link = event.target.closest("a[href]");
        if (link) {
          const p = editor.view.posAtDOM(link, 0);
          editor.commands.setTextSelection(p);
          selection = { from: p, to: p };
          if (event.ctrlKey) window.desktop.openExternal(link.href);
          else
            showMenu(link, [
              {
                label: "Open Link",
                icon: "ArrowUpRight",
                run: () => window.desktop.openExternal(link.href),
              },
              { label: "Edit Link", icon: "Link", run: () => linkDialog() },
              {
                label: "Remove Link",
                run: () => {
                  restoreSelection();
                  editor.chain().extendMarkRange("link").unsetLink().run();
                },
              },
            ]);
          return true;
        }
        const comment = event.target.closest("[data-thread]");
        if (comment) {
          activeThread = comment.dataset.thread;
          refreshConversation();
          return true;
        }
        const chip = event.target.closest(
          '[data-chip="document"], [data-chip="folder"]',
        );
        if (chip) {
          chip.dataset.chip === "document"
            ? open(chip.dataset.target)
            : home("folder:" + chip.dataset.target);
          return true;
        }
        return false;
      },
      handleTextInput(view, from, to, text) {
        if (text === " " && !d.locked && from === to) {
          const $from = view.state.doc.resolve(from),
            before = $from.parent.textBetween(0, $from.parentOffset);
          if (["[]", "[ ]", "[x]", "[X]"].includes(before)) {
            editor
              .chain()
              .focus()
              .deleteRange({ from: from - before.length, to: from })
              .toggleTaskList()
              .run();
            if (before.toLowerCase() === "[x]")
              editor.commands.updateAttributes("taskItem", { checked: true });
            return true;
          }
          if (before === "   ") {
            editor
              .chain()
              .focus()
              .deleteRange({ from: from - 3, to: from })
              .setCodeBlock()
              .run();
            return true;
          }
          if (before.endsWith("//")) {
            editor
              .chain()
              .focus()
              .deleteRange({ from: from - 2, to: from })
              .run();
            selection = {
              from: editor.state.selection.from,
              to: editor.state.selection.to,
            };
            setTimeout(commentDialog, 0);
            return true;
          }
        }

        if (text === "@" && !d.locked) {
          selection = { from, to };
          setTimeout(
            () =>
              insertPicker(
                document.querySelector('[data-command="insertmenu"]'),
              ),
            0,
          );
          return true;
        }
        return false;
      },
    },
  });
  selection = {
    from: editor.state.selection.from,
    to: editor.state.selection.to,
  };
  document.querySelectorAll("[data-command]").forEach((b) => {
    b.onmousedown = (e) => e.preventDefault();
    b.onclick = () => command(b.dataset.command, b);
  });
  document.querySelector("#style").onmousedown = (e) => e.preventDefault();
  document.querySelector("#style").onclick = (e) => styleMenu(e.currentTarget);
  document.querySelector("#editor").oncontextmenu = (e) => {
    e.preventDefault();
    sectionMenu({ left: e.clientX, bottom: e.clientY });
  };
  bindConversation();
  updateOutline();
  updateStats();
  toolbar();
  positionSection();
}
function bindConversation() {
  const f = document.querySelector("#messageForm");
  if (f)
    f.onsubmit = (e) => {
      e.preventDefault();
      sendMessage();
    };
  const el = document.querySelector("#message");
  if (el)
    el.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };
}
function refreshConversation() {
  const pane = document.querySelector(".conversation");
  if (pane) pane.outerHTML = conversationShell(doc());
  else {
    conversation = true;
    rerender();
  }
  bindConversation();
  const m = document.querySelector("#messages");
  if (m) m.scrollTop = m.scrollHeight;
}
function rerender() {
  const saved = editor
    ? { from: editor.state.selection.from, to: editor.state.selection.to }
    : selection;
  const scroll = document.querySelector("article")?.scrollTop || 0;
  editor?.destroy();
  editor = null;
  render();
  if (editor && saved) {
    const max = editor.state.doc.content.size;
    editor.commands.setTextSelection({
      from: Math.min(saved.from, max),
      to: Math.min(saved.to, max),
    });
    document.querySelector("article").scrollTop = scroll;
  }
}
function toolbar() {
  if (!editor) return;
  const st = styleState(),
    s = document.querySelector("#style");
  if (s) {
    s.innerHTML = I(st[2]) + `<span>${st[0]}</span>` + I("ChevronDown", 13);
    s.classList.toggle("active", st[1] !== "paragraph");
  }
  const names = {
    bold: "bold",
    italic: "italic",
    underline: "underline",
    strike: "strike",
    code: "code",
    task: "taskList",
  };
  document.querySelectorAll("[data-command]").forEach((b) => {
    b.classList.toggle(
      "active",
      !!names[b.dataset.command] && editor.isActive(names[b.dataset.command]),
    );
    b.disabled =
      doc().locked ||
      (["undo", "redo"].includes(b.dataset.command) &&
        !editor.can()[b.dataset.command]());
  });
}
function positionSection() {
  if (!editor) return;
  const btn = document.querySelector("#sectionStyle");
  if (!btn) return;
  const { $from } = editor.state.selection;
  const st = styleState();
  btn.innerHTML =
    (st[1].startsWith("h")
      ? st[1].toUpperCase()
      : st[1] === "paragraph"
        ? "¶"
        : I(st[2], 14)) + I("ChevronDown", 10);
  try {
    const coords = editor.view.coordsAtPos($from.pos),
      wrap = document.querySelector(".editorWrap").getBoundingClientRect();
    btn.style.top = Math.max(0, coords.top - wrap.top) + "px";
  } catch {}
}
function updateStats() {
  const d = doc(),
    el = document.querySelector("#stats");
  if (!el || !editor) return;
  const { from, to } = editor.state.selection,
    text =
      from === to
        ? editor.getText()
        : editor.state.doc.textBetween(from, to, " ");
  el.textContent = `${text.trim() ? text.trim().split(/\s+/).length : 0} words · ${text.length} characters${from !== to ? " selected" : ""}`;
}
function updateOutline() {
  const el = document.querySelector("#outline");
  if (!el || !editor) return;
  const entries = [];
  editor.state.doc.descendants((n, pos) => {
    if (n.type.name === "heading" && n.textContent.trim())
      entries.push({
        text: n.textContent,
        pos,
        level: n.attrs.level,
        task: false,
      });
    if (n.type.name === "taskItem") {
      const resolved = editor.state.doc.resolve(pos);
      let nested = false;
      for (let i = 0; i <= resolved.depth; i++)
        if (resolved.node(i).type.name === "taskItem") nested = true;
      if (!nested)
        entries.push({
          text: n.textContent,
          pos,
          level: 2,
          task: true,
          checked: n.attrs.checked,
        });
    }
  });
  el.innerHTML =
    "<h4>Outline</h4>" +
    entries
      .map(
        (h) =>
          `<button type="button" data-action="outline:${h.pos}" data-outline-pos="${h.pos}" class="level${h.level} ${h.task ? "outlineTask" : ""}">${h.task ? (h.checked ? "☑" : "☐") : ""}${esc(h.text)}</button>`,
      )
      .join("");
  const peek = document.querySelector(".outlinePeek");
  if (peek) peek.hidden = !entries.length;
  updateOutlineActive();
}
function restoreSelection() {
  if (!editor) return;
  try {
    if (selection) editor.commands.setTextSelection(selection);
  } catch {}
  editor.commands.focus();
}
function command(c, anchor) {
  if (!editor || doc().locked) return;
  const e = editor,
    chain = () => e.chain().focus();
  if (
    ![
      "insertmenu",
      "tablemenu",
      "alignmentmenu",
      "highlightmenu",
      "comment",
      "link",
    ].includes(c)
  )
    restoreSelection();
  const commands = {
    indent: () =>
      chain()
        .sinkListItem(editor.isActive("taskItem") ? "taskItem" : "listItem")
        .run(),
    outdent: () =>
      chain()
        .liftListItem(editor.isActive("taskItem") ? "taskItem" : "listItem")
        .run(),
    moveup: () => moveListItem(-1),
    movedown: () => moveListItem(1),
    undo: () => chain().undo().run(),
    redo: () => chain().redo().run(),
    bold: () => chain().toggleBold().run(),
    italic: () => chain().toggleItalic().run(),
    underline: () => chain().toggleUnderline().run(),
    strike: () => chain().toggleStrike().run(),
    code: () => chain().toggleCode().run(),
    sub: () => chain().toggleSubscript().run(),
    sup: () => chain().toggleSuperscript().run(),
    bullet: () => chain().toggleBulletList().run(),
    number: () => chain().toggleOrderedList().run(),
    task: () => chain().toggleTaskList().run(),
    quote: () => chain().toggleBlockquote().run(),
    pullquote: () => chain().toggleWrap("pullQuote").run(),
    codeblock: () => chain().toggleCodeBlock().run(),
    paragraph: () => chain().setParagraph().run(),
    rule: () => chain().setHorizontalRule().run(),
    columns: () =>
      chain()
        .insertContent({
          type: "columns",
          content: [
            { type: "column", content: [{ type: "paragraph" }] },
            { type: "column", content: [{ type: "paragraph" }] },
          ],
        })
        .run(),
    table: () =>
      chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    sheet: () => chain().insertContent({ type: "spreadsheet" }).run(),
    clear: () => chain().unsetAllMarks().clearNodes().run(),
    addrow: () => chain().addRowAfter().run(),
    addcol: () => chain().addColumnAfter().run(),
    delrow: () => chain().deleteRow().run(),
    delcol: () => chain().deleteColumn().run(),
    deltable: () => chain().deleteTable().run(),
    merge: () => chain().mergeCells().run(),
    split: () => chain().splitCell().run(),
    header: () => chain().toggleHeaderRow().run(),
    left: () => chain().setTextAlign("left").run(),
    center: () => chain().setTextAlign("center").run(),
    right: () => chain().setTextAlign("right").run(),
    justify: () => chain().setTextAlign("justify").run(),
    image: () => upload("image"),
    video: () => upload("video"),
    file: () => upload("file"),
    link: () => linkDialog(),
    date: () =>
      ask(
        "Insert Date",
        new Date().toISOString().slice(0, 10),
        (v) => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v))
            return alertBox("Enter a date as YYYY-MM-DD.");
          restoreSelection();
          chain()
            .insertContent({
              type: "chip",
              attrs: {
                kind: "date",
                label: new Date(v + "T12:00").toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
                target: v,
              },
            })
            .run();
        },
        "date",
      ),
    person: () =>
      ask("Mention a person", prefs().name, (v) => {
        restoreSelection();
        chain()
          .insertContent({
            type: "chip",
            attrs: { kind: "person", label: "@" + v, target: v },
          })
          .run();
      }),
    documentref: () => referenceDialog("document"),
    folderref: () => referenceDialog("folder"),
    comment: () => commentDialog(),
    tablemenu: () => tableMenu(anchor),
    alignmentmenu: () => alignmentMenu(anchor),
    highlightmenu: () => colorMenu(anchor, true),
    insertmenu: () => insertPicker(anchor),
  };
  if (/^h[1-6]$/.test(c))
    chain()
      .setHeading({ level: Number(c[1]) })
      .run();
  else commands[c]?.();
  selection = editor
    ? { from: editor.state.selection.from, to: editor.state.selection.to }
    : null;
  toolbar();
}
function styleMenu(anchor) {
  const entries = styles.map(([label, cmd, icon, shortcut]) => ({
    label,
    icon,
    shortcut,
    active: styleState()[1] === cmd,
    run: () => command(cmd),
  }));
  showMenu(anchor, entries, "style-popup");
}
function alignmentMenu(anchor) {
  showMenu(
    anchor,
    [
      ["Left", "left", "AlignLeft"],
      ["Center", "center", "AlignCenter"],
      ["Right", "right", "AlignRight"],
      ["Justify", "justify", "AlignJustify"],
    ].map(([label, cmd, icon]) => ({ label, icon, run: () => command(cmd) })),
  );
}
function tableMenu(anchor) {
  const entries = [
    {
      label: "Insert Table…",
      icon: "Table",
      run: () => {
        const m = dialog(
          `<h2>Insert Table</h2><label>Rows<input id="rows" type="number" min="1" max="100" value="3"></label><label>Columns<input id="cols" type="number" min="1" max="30" value="3"></label><div class="dialogActions">${B("Cancel", "cancel")}${B("Insert", "submit", "primary")}</div>`,
        );
        m.querySelector('[data-action="submit"]').onclick = () => {
          const rows = Math.max(
              1,
              Math.min(100, Number(m.querySelector("#rows").value) || 3),
            ),
            cols = Math.max(
              1,
              Math.min(30, Number(m.querySelector("#cols").value) || 3),
            );
          m.close();
          restoreSelection();
          editor
            .chain()
            .focus()
            .insertTable({ rows, cols, withHeaderRow: true })
            .run();
        };
      },
    },
  ];
  if (editor.isActive("table"))
    for (const [label, cmd] of [
      ["Insert Row Below", "addrow"],
      ["Insert Column Right", "addcol"],
      ["Delete Row", "delrow"],
      ["Delete Column", "delcol"],
      ["Merge Cells", "merge"],
      ["Split Cell", "split"],
      ["Toggle Header Row", "header"],
      ["Delete Table", "deltable"],
    ])
      entries.push({ label, run: () => command(cmd) });
  showMenu(anchor, entries);
}
function colorMenu(anchor, highlight = false) {
  const colors = [
    "#eeeeee",
    "#8993a4",
    "#e66161",
    "#f5a55a",
    "#e0cc66",
    "#71bf80",
    "#61bdb8",
    "#639ce4",
    "#b18ee6",
    "#df8fbb",
  ];
  const el = popupAt(anchor, "color-popup");
  el.innerHTML =
    "<h4>" +
    (highlight ? "Highlight" : "Text Color") +
    '</h4><div class="swatches">' +
    colors
      .map(
        (c) =>
          `<button title="${c}" style="background:${c}" data-color="${c}"></button>`,
      )
      .join("") +
    '</div><label>Custom<input type="color" value="#639ce4"></label><button id="clearColor">Clear</button>';
  const apply = (c) => {
    closePopup();
    restoreSelection();
    const ch = editor.chain().focus();
    highlight ? ch.setHighlight({ color: c }).run() : ch.setColor(c).run();
  };
  el.querySelectorAll("[data-color]").forEach(
    (b) => (b.onclick = () => apply(b.dataset.color)),
  );
  el.querySelector("input").onchange = (e) => apply(e.target.value);
  el.querySelector("#clearColor").onclick = () => {
    closePopup();
    restoreSelection();
    highlight
      ? editor.chain().focus().unsetHighlight().run()
      : editor.chain().focus().unsetColor().run();
  };
}
function sectionMenu(anchor) {
  if (editor) {
    contextPos = editor.state.selection.$from.depth
      ? editor.state.selection.$from.before(1)
      : editor.state.selection.from;
    selection = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
  }
  showMenu(anchor, [
    {
      label: "Comment",
      icon: "MessageCirclePlus",
      shortcut: "Ctrl+Shift+C",
      run: () => commentDialog(),
    },
    {
      label: "Copy Link",
      icon: "Link",
      shortcut: "Ctrl+Shift+A",
      run: () => copyAnchor(),
    },
    { label: "Paragraph Style", icon: "Text", run: () => styleMenu(anchor) },
    { label: "Alignment", icon: "AlignLeft", run: () => alignmentMenu(anchor) },
    {
      label: "Lock / Unlock Section",
      icon: "Lock",
      run: () => sectionAttribute("locked"),
    },
    {
      label: "Collapse / Expand Section",
      icon: "List",
      run: () => sectionAttribute("collapsed"),
    },
    { label: "Show Edit History", icon: "Clock", run: () => historyDialog() },
    {
      label: "Delete Section",
      icon: "Trash2",
      run: () => {
        if (editor && typeof contextPos === "number") {
          const n = editor.state.doc.nodeAt(contextPos);
          editor
            .chain()
            .focus()
            .deleteRange({ from: contextPos, to: contextPos + n.nodeSize })
            .run();
        }
      },
    },
  ]);
}
const insertItems = [
  ["Image", "Image", "image", "Media"],
  ["Video", "Video", "video", "Media"],
  ["File", "Paperclip", "file", "Media"],
  ["Spreadsheet", "FileSpreadsheet", "sheet", "Data"],
  ["Table", "Table", "table", "Data"],
  ["Checklist", "SquareCheck", "task", "Popular"],
  ["Person", "Type", "person", "Mention"],
  ["Document", "FileText", "documentref", "Mention"],
  ["Folder", "Folder", "folderref", "Mention"],
  ["Date", "Calendar", "date", "Mention"],
  ["Horizontal Rule", "Minus", "rule", "Structure"],
  ["Columns", "Columns2", "columns", "Structure"],
  ...styles
    .filter((s) => s[1] !== "paragraph")
    .map(([label, cmd, icon]) => [label, icon, cmd, "Style"]),
];
function insertPicker(anchor) {
  const el = popupAt(anchor, "insert-picker");
  el.innerHTML =
    '<label class="pickerSearch">' +
    I("Search") +
    '<input placeholder="Search to insert…" aria-label="Search insert options"></label><div class="insertResults"></div>';
  const results = el.querySelector(".insertResults");
  const draw = (q) => {
    let category = "";
    results.innerHTML = insertItems
      .filter((x) => x[0].toLowerCase().includes(q.toLowerCase()))
      .map(([label, icon, cmd, group]) => {
        const h = category === group ? "" : `<h5>${group}</h5>`;
        category = group;
        return h + B(I(icon) + label, "cmd:" + cmd);
      })
      .join("");
    results.querySelectorAll("button").forEach(
      (b) =>
        (b.onclick = () => {
          const c = b.dataset.action.slice(4);
          closePopup();
          command(c);
        }),
    );
  };
  draw("");
  el.querySelector("input").oninput = (e) => draw(e.target.value);
  el.querySelector("input").focus();
}
function linkDialog() {
  const href = editor.getAttributes("link").href || "";
  const m = dialog(
    `<h2>Link</h2><label>URL<input id="url" value="${esc(href)}" placeholder="https://…"></label><div class="dialogActions">${B("Remove Link", "remove")}${B("Cancel", "cancel")}${B("Save", "submit", "primary")}</div>`,
  );
  m.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      m.querySelector('[data-action="submit"]').click();
    }
  };
  m.querySelector('[data-action="remove"]').onclick = () => {
    m.close();
    restoreSelection();
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  };
  m.querySelector('[data-action="submit"]').onclick = () => {
    const v = m.querySelector("#url").value;
    try {
      if (!["https:", "http:", "mailto:"].includes(new URL(v).protocol))
        throw Error();
    } catch {
      return showDialogError(m, "Enter an HTTP, HTTPS or mailto URL.");
    }
    m.close();
    restoreSelection();
    editor.chain().focus().extendMarkRange("link").setLink({ href: v }).run();
  };
}
async function readFile(accept, max = 20e6) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.oncancel = () => resolve(null);
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return resolve(null);
      if (f.size > max) {
        alertBox(
          "This file exceeds the " +
            Math.round(max / 1e6) +
            " MB local attachment limit.",
        );
        return resolve(null);
      }
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, mime: f.type, data: r.result });
      r.onerror = () => {
        alertBox("The file could not be read.");
        resolve(null);
      };
      r.readAsDataURL(f);
    };
    input.click();
  });
}
async function upload(kind) {
  const f = await readFile(
    kind === "image"
      ? "image/png,image/jpeg,image/webp,image/gif"
      : kind === "video"
        ? "video/mp4,video/webm"
        : "*/*",
    kind === "image" ? 5e6 : 20e6,
  );
  if (!f) return;
  restoreSelection();
  const c = editor.chain().focus();
  if (kind === "image")
    c.setImage({ src: f.data, alt: f.name, title: f.name }).run();
  else if (kind === "video")
    c.insertContent({
      type: "videoAttachment",
      attrs: { src: f.data, name: f.name },
    }).run();
  else c.insertContent({ type: "fileAttachment", attrs: f }).run();
}
function referenceDialog(kind) {
  const candidates =
    kind === "document"
      ? db.documents.filter((d) => !d.trash && d.id !== current)
      : db.folders;
  const m = dialog(
    `<h2>Insert ${kind} reference</h2><input id="refsearch" placeholder="Search…"><div class="refresults"></div>${B("Cancel", "cancel")}`,
  );
  const draw = (q) => {
    const result = m.querySelector(".refresults");
    result.innerHTML =
      candidates
        .filter((c) =>
          (c.title || c.name).toLowerCase().includes(q.toLowerCase()),
        )
        .map((c) =>
          B(
            I(kind === "document" ? "FileText" : "Folder") +
              esc(c.title || c.name),
            "ref:" + c.id,
          ),
        )
        .join("") || '<p class="muted">No matching items.</p>';
    result.querySelectorAll("button").forEach(
      (b) =>
        (b.onclick = () => {
          const ref = candidates.find(
            (c) => c.id === b.dataset.action.slice(4),
          );
          m.close();
          restoreSelection();
          editor
            .chain()
            .focus()
            .insertContent({
              type: "chip",
              attrs: { kind, label: ref.title || ref.name, target: ref.id },
            })
            .run();
        }),
    );
  };
  draw("");
  m.querySelector("input").oninput = (e) => draw(e.target.value);
}
function commentDialog() {
  if (!editor || doc().locked) return;
  const saved = selection || {
    from: editor.state.selection.from,
    to: editor.state.selection.to,
  };
  const from = saved.from,
    to = saved.to,
    quote =
      editor.state.doc.textBetween(from, to, " ") ||
      editor.state.selection.$from.parent.textContent;
  const m = dialog(
    `<h2>New Comment</h2><p class="quoteText">${esc(quote || "Document")}</p><textarea id="commentText" placeholder="Add your comment…" aria-label="Comment"></textarea><div class="dialogActions">${B("Cancel", "cancel")}${B("Comment", "submit", "primary")}</div>`,
  );
  m.querySelector('[data-action="submit"]').onclick = () => {
    const text = m.querySelector("textarea").value.trim();
    if (!text) return;
    const thread = {
      id: uid(),
      text,
      quote,
      at: now(),
      replies: [],
      resolved: false,
    };
    doc().comments.push(thread);
    m.close();
    restoreSelection();
    let range = { from, to };
    if (from === to) {
      const { $from } = editor.state.selection;
      range = { from: $from.start(), to: $from.end() };
    }
    if (range.to > range.from)
      editor
        .chain()
        .setTextSelection(range)
        .setMark("comment", { thread: thread.id })
        .run();
    activeThread = thread.id;
    conversation = true;
    dirty();
    rerender();
  };
}
function sendMessage() {
  const el = document.querySelector("#message");
  if (!el?.value.trim()) return;
  const text = el.value.trim(),
    d = doc();
  if (activeThread) {
    const t = d.comments.find((t) => t.id === activeThread);
    t?.replies.push({ id: uid(), text, at: now() });
  } else d.messages.push({ id: uid(), text, at: now() });
  dirty();
  refreshConversation();
}
function threadList() {
  const m = dialog(
    `<h2>Comments</h2>${
      doc()
        .comments.map((t) =>
          B(
            (t.resolved ? "✓ " : "") + esc(t.quote || t.text.slice(0, 50)),
            "thread:" + t.id,
          ),
        )
        .join("") || "<p>No comments yet. Select text and choose Comment.</p>"
    }${B("Close", "cancel")}`,
  );
  m.querySelectorAll('[data-action^="thread:"]').forEach(
    (b) =>
      (b.onclick = () => {
        activeThread = b.dataset.action.slice(7);
        m.close();
        conversation = true;
        rerender();
        const target = document.querySelector(
          '[data-thread="' + activeThread + '"]',
        );
        target?.scrollIntoView({ block: "center" });
      }),
  );
}
function sectionAttribute(key) {
  const n = editor.state.doc.nodeAt(contextPos);
  if (!n) return;
  editor.commands.command(({ tr }) => {
    tr.setMeta("allowLocked", true);
    tr.setNodeMarkup(contextPos, undefined, {
      ...n.attrs,
      [key]: !n.attrs[key],
    });
    return true;
  });
}
function copyAnchor() {
  const id = editor?.state.selection.$from.parent.attrs.id;
  const link = "quill://document/" + current + (id ? "#" + id : "");
  navigator.clipboard
    .writeText(link)
    .catch(() => ask("Copy this document reference", link, () => {}));
}
function closePopup() {
  popup?.remove();
  popup = null;
}
function popupAt(anchor, cls = "") {
  closePopup();
  const el = document.createElement("div");
  el.className = "popup " + cls;
  el.setAttribute("role", "menu");
  const rect = anchor?.getBoundingClientRect
    ? anchor.getBoundingClientRect()
    : anchor || { left: 120, bottom: 100 };
  el.style.left =
    Math.min(
      rect.left,
      innerWidth - (cls === "insert-picker" ? 360 : 260) - 8,
    ) + "px";
  el.style.top = Math.min(rect.bottom + 3, innerHeight - 100) + "px";
  document.body.append(el);
  popup = el;
  el.onmousedown = (e) => {
    if (!e.target.closest("input")) e.preventDefault();
  };
  el.onkeydown = (e) => {
    const bs = [...el.querySelectorAll("button:not(:disabled)")];
    const at = bs.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      bs[
        (at + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length
      ]?.focus();
    }
    if (e.key === "Escape") {
      closePopup();
      anchor?.focus?.();
    }
  };
  return el;
}
function showMenu(anchor, entries, cls = "") {
  const el = popupAt(anchor, cls);
  el.innerHTML = entries
    .map((e, i) =>
      e.separator
        ? "<hr>"
        : `<button type="button" role="menuitem" data-entry="${i}" ${e.disabled ? "disabled" : ""} class="${e.active ? "selected" : ""}">${e.icon ? I(e.icon) : '<span class="iconSpace"></span>'}<span>${esc(e.label)}</span><kbd>${esc(e.shortcut || "")}</kbd>${e.active ? I("Check", 12) : ""}</button>`,
    )
    .join("");
  el.querySelectorAll("[data-entry]").forEach(
    (b) =>
      (b.onclick = () => {
        const e = entries[Number(b.dataset.entry)];
        closePopup();
        try {
          const result = e.run?.();
          result?.catch?.((error) =>
            alertBox("Action failed: " + error.message),
          );
        } catch (error) {
          alertBox("Action failed: " + error.message);
        }
      }),
  );
  el.querySelector("button:not(:disabled)")?.focus();
}
function dialog(html) {
  closePopup();
  const m = document.querySelector("#modal");
  m.onkeydown = null;
  m.classList.remove("shortcutDialog", "typeDialog", "versionDialog");
  m.oncancel = null;
  m.innerHTML = html;
  m.showModal();
  m.querySelector('[data-action="cancel"]')?.addEventListener("click", () =>
    m.close(),
  );
  m.querySelector("input,textarea,button")?.focus();
  return m;
}
function showDialogError(m, message) {
  let el = m.querySelector(".formError");
  if (!el) {
    el = document.createElement("p");
    el.className = "formError";
    m.append(el);
  }
  el.textContent = message;
}
function ask(title, value, cb, type = "text") {
  const m = dialog(
    `<form><h2>${esc(title)}</h2><input type="${type}" value="${esc(value)}" aria-label="${esc(title)}"><div class="dialogActions">${B("Cancel", "cancel")}<button type="submit" class="primary">Save</button></div></form>`,
  );
  m.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    const v = m.querySelector("input").value;
    m.close();
    cb(v);
  };
}
function alertBox(message) {
  return dialog(`<h2>Quill</h2><p>${esc(message)}</p>${B("Close", "cancel")}`);
}
function confirmDialog(title, message, callback) {
  const m = dialog(
    `<h2>${esc(title)}</h2><p>${esc(message)}</p><div class="dialogActions">${B("Cancel", "cancel")}${B("Continue", "submit", "primary")}</div>`,
  );
  m.querySelector('[data-action="submit"]').onclick = () => {
    m.close();
    callback();
  };
}
function menu(name, anchor) {
  const d = doc();
  const item = (label, action, icon, shortcut) => ({
    label,
    icon,
    shortcut,
    run: () => act(action),
  });
  const sets = {
    Document: [
      item("New Document", "new", "FileText", "Ctrl+Alt+N"),
      item("New Spreadsheet", "newsheet", "FileSpreadsheet"),
      item("Open Local Link…", "openlink", "Link"),
      item("Copy Link", "copylink", "Link"),
      item("Move to Folder", "move", "Folder"),
      item(
        d.favorite ? "Remove from Favorites" : "Add to Favorites",
        "star",
        "Star",
      ),
      item("Copy Document…", "duplicate", "FileText"),
      { separator: true },
      item("Export", "exportmenu", "Download"),
      item("Mark as Template…", "template", "FileText"),
      item("Print…", "print", "FileText", "Ctrl+P"),
      item("Print and PDF Options…", "printoptions", "FileText"),
      item("Document History…", "history", "Clock"),
      item("Document Details…", "details", "FileText"),
      item("Save Checkpoint", "checkpoint", "Clock"),
      { separator: true },
      item("Rename Document…", "rename", "Type"),
      item("Delete Document…", "delete", "Trash2"),
    ],
    Edit: [
      item("Undo", "cmd:undo", "Undo2", "Ctrl+Z"),
      item("Redo", "cmd:redo", "Redo2", "Ctrl+Shift+Z"),
      item("Find", "find", "Search", "Ctrl+F"),
      item("Find and Replace", "replace", "Search", "Ctrl+Shift+H"),
      item("Copy Anchor Link", "copyanchor", "Link", "Ctrl+Shift+A"),
    ],
    View: [
      {
        label: "Keyboard Shortcuts…",
        icon: "Type",
        shortcut: "Ctrl+/",
        run: () => shortcutDialog(),
      },
      item("Show Conversation", "conversation", "MessagesSquare", "Ctrl+Alt+C"),
      item("Show Comments", "threadlist", "MessageCirclePlus"),
      item("Show Line Numbers", "linenumbers", "ListOrdered"),
      item("Focus Mode", "focus", "Maximize2", "Ctrl+Shift+M"),
      item("Show Outline", "showoutline", "List"),
      item("Keep Outline Expanded", "outline", "List", "Ctrl+Shift+O"),
      item("Always Show Sidebar", "pinsidebar", "PanelLeft"),
      item("Toggle Standard / Wide Layout", "layout", "Maximize2"),
      item("View Only", "readonly", "Eye"),
    ],
    Format: [
      item("Show Page Breaks", "pagebreaks", "FileText"),
      item("Typography", "typography", "Type"),
      ...styles.slice(0, 5).map(([label, cmd, icon, shortcut]) => ({
        label,
        icon,
        shortcut,
        run: () => command(cmd),
      })),
      { separator: true },
      ...[
        ["Bold", "bold", "Bold", "Ctrl+B"],
        ["Italic", "italic", "Italic", "Ctrl+I"],
        ["Underline", "underline", "Underline", "Ctrl+U"],
        ["Strikethrough", "strike", "Strikethrough", "Ctrl+Shift+X"],
        ["Text Color", "colors", "Type", ""],
        ["Highlight", "highlight", "Highlighter", ""],
        ["Code", "code", "Code", "Ctrl+Shift+K"],
        ["Subscript", "sub", "Type", "Ctrl+,"],
        ["Superscript", "sup", "Type", "Ctrl+."],
        ["Clear Formatting", "clear", "Text", "Ctrl+\\"],
      ].map(([label, cmd, icon, shortcut]) => ({
        label,
        icon,
        shortcut,
        run: () =>
          cmd === "colors"
            ? colorMenu(anchor)
            : cmd === "highlight"
              ? colorMenu(anchor, true)
              : command(cmd),
      })),
      item("Lock Edits", "readonly", "Lock"),
    ],
  };
  if (d.kind === "sheet" && name !== "Document")
    return showMenu(anchor, [
      {
        label: "Use the spreadsheet formula bar and row/column controls",
        disabled: true,
      },
    ]);
  if (name === "Insert") return insertPicker(anchor);
  showMenu(anchor, sets[name]);
}
function documentMenu(id, anchor) {
  showMenu(anchor, [
    { label: "Open", icon: "FileText", run: () => open(id) },
    {
      label: "Rename…",
      icon: "Type",
      run: () => rename(db.documents.find((d) => d.id === id)),
    },
    {
      label: "Add / Remove Favorite",
      icon: "Star",
      run: () => {
        const d = db.documents.find((d) => d.id === id);
        d.favorite = !d.favorite;
        dirty();
        render();
      },
    },
    {
      label: "Move to Folder…",
      icon: "Folder",
      run: () => moveDialog(db.documents.find((d) => d.id === id)),
    },
    {
      label: "Copy Document…",
      icon: "FileText",
      run: () => duplicate(db.documents.find((d) => d.id === id)),
    },
    {
      label: "Move to Trash",
      icon: "Trash2",
      run: () => trash(db.documents.find((d) => d.id === id)),
    },
  ]);
}
function rename(d) {
  ask("Rename Document", d.title, (v) => {
    d.title = v.trim() || "Untitled";
    if (d.kind !== "sheet") {
      const first = d.content.content[0];
      if (first && ["heading", "paragraph"].includes(first.type))
        first.content =
          d.title === "Untitled" ? [] : [{ type: "text", text: d.title }];
      else
        d.content.content.unshift({
          type: "heading",
          attrs: { level: 1, id: uid() },
          content: [{ type: "text", text: d.title }],
        });
    }
    d.updated = now();
    dirty();
    current ? rerender() : render();
  });
}
function duplicate(d) {
  const copy = structuredClone(d);
  copy.id = uid();
  copy.title += " (copy)";
  copy.content = regenerateIds(copy.content);
  if (copy.kind !== "sheet" && copy.content.content[0])
    copy.content.content[0].content = [{ type: "text", text: copy.title }];
  copy.comments = [];
  copy.history = [];
  copy.messages = [];
  copy.opened = copy.updated = copy.created = now();
  copy.visits = 0;
  db.documents.push(copy);
  dirty();
  open(copy.id);
}
function trash(d) {
  confirmDialog(
    "Move to Trash?",
    "This document can be restored from Trash.",
    () => {
      d.trash = true;
      dirty();
      home();
    },
  );
}
function moveDialog(d) {
  const m = dialog(
    `<h2>Move to Folder</h2><select id="folder"><option value="">Private</option>${db.folders.map((f) => `<option value="${f.id}" ${d.folder === f.id ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select><div class="dialogActions">${B("Cancel", "cancel")}${B("Move", "submit", "primary")}</div>`,
  );
  m.querySelector('[data-action="submit"]').onclick = () => {
    d.folder = m.querySelector("select").value || null;
    dirty();
    m.close();
    if (!current) render();
  };
}
function applyDocumentTypography(id) {
  const article = document.querySelector("article");
  if (!article) return;
  for (const theme of typographyThemes)
    article.classList.remove("typ-" + theme.id);
  article.classList.add("typ-" + normalizeTypography(id));
  article.dataset.typography = normalizeTypography(id);
}
function typographyDialog() {
  const d = doc();
  if (!d || d.kind === "sheet") return;
  let selected = normalizeTypography(d.typography),
    applied = false;
  const original = selected;
  const m = dialog(
    `<h2>Typography</h2><div class="typeCards" role="radiogroup" aria-label="Document typography">${typographyThemes.map((t) => `<button class="typeCard typ-${t.id}" role="radio" aria-checked="${t.id === selected}" data-type="${t.id}"><span class="sample">Aa</span><strong>${t.name}</strong><small>${esc(t.description)}</small></button>`).join("")}</div><div id="typePreview" class="typePreview"><h3>A clear idea, beautifully written.</h3><p>Good documents make room for the words. Use headings, lists and a comfortable reading rhythm to shape your next idea.</p></div><p id="fontNote" class="fontNote"></p><label class="checkboxLabel"><input id="makeDefaultType" type="checkbox">Set as default for new documents</label><div class="dialogActions">${B("Cancel", "cancel")}${B("Apply Theme", "applytype", "primary")}</div>`,
  );
  m.classList.add("typeDialog");
  const preview = () => {
    m.querySelector("#typePreview").className = "typePreview typ-" + selected;
    m.querySelectorAll("[data-type]").forEach((b) =>
      b.setAttribute("aria-checked", String(b.dataset.type === selected)),
    );
    const info = themeInfo(selected);
    m.querySelector("#fontNote").textContent =
      `Reference fonts: ${info.heading === info.body ? info.body : info.heading + " / " + info.body}. ${selected === "manuscript" ? "Courier Prime is bundled." : "Original faces are used when installed; bundled fallback: " + info.fallback + "."}`;
    applyDocumentTypography(selected);
  };
  m.querySelectorAll("[data-type]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = b.dataset.type;
        preview();
      }),
  );
  const cancel = () => {
    applyDocumentTypography(original);
    m.classList.remove("typeDialog");
    m.close();
  };
  m.querySelector('[data-action="cancel"]').onclick = cancel;
  m.oncancel = () => applyDocumentTypography(original);
  m.querySelector('[data-action="applytype"]').disabled = d.locked;
  m.querySelector('[data-action="applytype"]').onclick = () => {
    if (d.locked) return;
    checkpoint(d, true);
    d.typography = selected;
    d.updated = now();
    if (m.querySelector("#makeDefaultType").checked)
      prefs().defaultTypography = selected;
    applied = true;
    dirty();
    m.classList.remove("typeDialog");
    m.close();
    applyDocumentTypography(selected);
  };
  m.addEventListener(
    "close",
    () => {
      if (!applied) applyDocumentTypography(original);
      m.classList.remove("typeDialog");
    },
    { once: true },
  );
  preview();
}
function outlineShell(d) {
  if (d.outlineMode === "hidden") return "";
  if (d.outlineMode === "expanded")
    return '<aside id="outline" class="outline" aria-label="Document outline"></aside>';
  return `<div class="outlinePeek" style="--outline-right:${conversation && !focus ? 308 : 12}px;--outline-right-small:${conversation && !focus ? 273 : 12}px">${B("", "outline", "outlineDot", "Expand document outline")}<div class="outlinePanel"><aside id="outline" class="outline" aria-label="Document outline"></aside></div></div>`;
}
function updateOutlineActive() {
  if (!editor) return;
  const pos = editor.state.selection.from;
  const all = [...document.querySelectorAll("[data-outline-pos]")];
  let active = null;
  for (const b of all) {
    if (Number(b.dataset.outlinePos) <= pos) active = b;
    b.classList.remove("selected");
  }
  active?.classList.add("selected");
}
function revealOutline(pos) {
  let expand = [];
  editor.state.doc.forEach((node, p) => {
    if (p > pos || node.type.name !== "heading") return;
    expand = expand.filter((x) => x.node.attrs.level < node.attrs.level);
    if (node.attrs.collapsed && p < pos) expand.push({ p, node });
  });
  if (expand.length)
    editor.commands.command(({ tr }) => {
      tr.setMeta("allowLocked", true);
      for (const { p, node } of expand)
        tr.setNodeMarkup(p, undefined, { ...node.attrs, collapsed: false });
      return true;
    });
  editor
    .chain()
    .focus()
    .setTextSelection(
      Math.min(
        pos + (editor.state.doc.nodeAt(pos)?.type.name === "taskItem" ? 2 : 1),
        editor.state.doc.content.size,
      ),
    )
    .scrollIntoView()
    .run();
  updateOutlineActive();
}
function versionText(node) {
  if (!node) return "";
  if (node.type === "text") return node.text;
  if (node.type === "chip") return node.attrs?.label || "";
  if (node.type === "image")
    return "[Image: " + (node.attrs?.alt || "") + "]\n";
  if (node.type === "fileAttachment")
    return "[File: " + node.attrs?.name + "]\n";
  const content = (node.content || []).map(versionText).join("");
  return (
    content +
    (["paragraph", "heading", "codeBlock"].includes(node.type) ? "\n\n" : "")
  );
}
function changePreview(oldText, newText) {
  const old = oldText.slice(0, 80000),
    current = newText.slice(0, 80000);
  if (old === current)
    return '<p class="muted">Text is unchanged. Formatting, layout or embedded content may differ.</p>';
  const parts = diffWordsWithSpace(old, current, {
    timeout: 250,
    maxEditLength: 5000,
  });
  if (!parts)
    return (
      "<h4>Earlier text</h4><pre>" +
      esc(old) +
      "</pre><h4>Current text</h4><pre>" +
      esc(current) +
      "</pre>"
    );
  return (
    parts
      .map((p) =>
        p.added
          ? "<ins>" + esc(p.value) + "</ins>"
          : p.removed
            ? "<del>" + esc(p.value) + "</del>"
            : esc(p.value),
      )
      .join("") +
    (oldText.length > 80000 || newText.length > 80000
      ? "<p>Preview limited to the first 80,000 characters.</p>"
      : "")
  );
}
function versionPreview(d, h) {
  const old =
      d.kind === "sheet"
        ? (h.cells || []).map((r) => r.join("\t")).join("\n")
        : versionText(h.content),
    current =
      d.kind === "sheet"
        ? d.cells.map((r) => r.join("\t")).join("\n")
        : versionText(d.content);
  const m = dialog(
    `<h2>Changes since ${esc(stamp(h.at))}</h2><p class="diffLegend"><span class="removed">Removed text</span> · <span class="added">Added text</span> · comparing this snapshot with the current document</p><div class="versionMeta">Snapshot typography: ${h.typography ? themeInfo(h.typography).name : "Not recorded"} · Current: ${themeInfo(d.typography).name}<br>Snapshot layout: ${esc(h.layout || "Not recorded")} · Current: ${esc(d.layout || "standard")}</div><div class="diffPreview">${changePreview(old, current)}</div><div class="dialogActions">${B("Back to History", "backhistory")}${B("Close", "cancel")}${B("Restore Snapshot", "restoreversion", "primary")}</div>`,
  );
  m.classList.add("versionDialog");
  m.querySelector('[data-action="backhistory"]').onclick = () =>
    historyDialog();
  m.querySelector('[data-action="restoreversion"]').disabled = d.locked;
  m.querySelector('[data-action="restoreversion"]').onclick = () => {
    if (d.locked) return;
    confirmDialog(
      "Restore this snapshot?",
      "The current document will be preserved as a checkpoint.",
      () => {
        checkpoint(d, true);
        d.title = h.title;
        d.content = structuredClone(h.content);
        if (h.cells) d.cells = structuredClone(h.cells);
        if (h.typography) d.typography = normalizeTypography(h.typography);
        if (h.layout) d.layout = h.layout;
        d.text =
          d.kind === "sheet"
            ? d.cells.flat().join(" ")
            : versionText(d.content);
        d.updated = now();
        dirty();
        rerender();
      },
    );
  };
}

function historyDialog() {
  const d = doc();
  checkpoint(d);
  dirty();
  const m = dialog(
    `<h2>Document History</h2><p>Automatic snapshots are captured during editing and when leaving a document. Restoring first preserves the current version.</p><div class="historylist">${
      [...d.history]
        .reverse()
        .map((h) =>
          B(
            I("Clock") + stamp(h.at) + (h.manual ? " · Checkpoint" : ""),
            "version:" + h.id,
          ),
        )
        .join("") || "<p>No earlier versions yet.</p>"
    }</div>${B("Close", "cancel")}`,
  );
  m.querySelectorAll('[data-action^="version:"]').forEach(
    (b) =>
      (b.onclick = () => {
        const h = d.history.find((h) => h.id === b.dataset.action.slice(8));
        versionPreview(d, h);
      }),
  );
}
async function exportBytes(name, extension, bytes) {
  try {
    const blob = new Blob([bytes]);
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return await window.desktop.exportBinary({
      name: name + "." + extension,
      data,
    });
  } catch (e) {
    alertBox("Export failed: " + e.message);
  }
}
async function exportText(name, extension, text) {
  try {
    return await window.desktop.export({ name, extension, text });
  } catch (e) {
    alertBox("Export failed: " + e.message);
  }
}
function exportMenu(anchor) {
  const d = doc();
  if (d.kind === "sheet")
    return showMenu(anchor, [
      {
        label: "Excel (.xlsx)",
        run: async () =>
          exportBytes(d.title, "xlsx", await writeXlsx(d.cells, d.title)),
      },
      { label: "CSV", run: () => exportText(d.title, "csv", csv(d.cells)) },
      {
        label: "Document JSON (lossless)",
        run: () =>
          exportText(
            d.title,
            "json",
            JSON.stringify({ quillDocument: 2, document: d }, null, 2),
          ),
      },
      {
        label: "Workspace Backup",
        run: () =>
          exportText("Quill-backup", "json", JSON.stringify(db, null, 2)),
      },
      { label: "Import…", run: () => importFile() },
      { label: "PDF…", run: () => window.desktop.printPDF() },
    ]);
  showMenu(anchor, [
    {
      label: "Word (.docx)",
      run: async () =>
        exportBytes(d.title, "docx", await writeDocx(d.content, d.title)),
    },
    {
      label: "Markdown",
      run: () => exportText(d.title, "md", htmlToMarkdown(editor.getHTML())),
    },
    {
      label: "HTML",
      run: () =>
        exportText(
          d.title,
          "html",
          '<!doctype html><meta charset="UTF-8"><title>' +
            esc(d.title) +
            "</title><h1>" +
            esc(d.title) +
            "</h1>" +
            editor.getHTML(),
        ),
    },
    {
      label: "Plain Text",
      run: () => exportText(d.title, "txt", editor?.getText() || d.text),
    },
    {
      label: "Document JSON (lossless)",
      run: () =>
        exportText(
          d.title,
          "json",
          JSON.stringify({ quillDocument: 2, document: d }, null, 2),
        ),
    },
    {
      label: "Workspace Backup",
      run: () =>
        exportText("Quill-backup", "json", JSON.stringify(db, null, 2)),
    },
    { label: "Import Backup / JSON / Text / HTML…", run: () => importFile() },
    { label: "PDF…", run: () => window.desktop.printPDF() },
  ]);
}
async function importFile() {
  const f = await readFile(".json,.txt,.html,.htm,.md,.docx,.xlsx,.csv", 30e6);
  if (!f) return;
  try {
    const bytes = Uint8Array.from(atob(f.data.split(",")[1]), (c) =>
        c.charCodeAt(0),
      ),
      text = new TextDecoder().decode(bytes);
    if (/\.xlsx$/i.test(f.name)) {
      const sheet = await readXlsx(bytes.buffer);
      newDoc("sheet");
      doc().title = f.name.replace(/\.[^.]+$/, "");
      doc().cells = sheet.cells;
      doc().text = sheet.cells.flat().join(" ");
      dirty();
      rerender();
      return;
    }
    if (/\.csv$/i.test(f.name)) {
      newDoc("sheet");
      doc().cells = csvToCells(text);
      doc().title = f.name.replace(/\.[^.]+$/, "");
      dirty();
      rerender();
      return;
    }
    if (/\.docx$/i.test(f.name)) {
      const html = await readDocx(bytes.buffer);
      newDoc();
      editor.commands.setContent(
        "<h1>" + esc(f.name.replace(/\.[^.]+$/, "")) + "</h1>" + html,
      );
      changed();
      return;
    }
    if (f.name.toLowerCase().endsWith(".json")) {
      const other = JSON.parse(text),
        documents = other.quillDocument ? [other.document] : other.documents;
      if (
        !Array.isArray(documents) ||
        documents.some((d) => !d.title || d.content?.type !== "doc")
      )
        throw Error("Unrecognized workspace/document");
      const folderMap = new Map();
      for (const f of other.folders || []) {
        const id = uid();
        folderMap.set(f.id, id);
        db.folders.push({ id, name: String(f.name) });
      }
      for (const d of documents) {
        const copy = normalize({
          ...d,
          id: uid(),
          content: regenerateIds(d.content),
          typography: d.typography,
          layout: d.layout,
          folder: folderMap.get(d.folder) || null,
        });
        copy.comments = [];
        copy.history = [];
        db.documents.push(copy);
      }
      dirty();
      home();
    } else {
      newDoc();
      if (/\.html?$/i.test(f.name))
        editor.commands.setContent(
          "<h1>" + esc(f.name.replace(/\.[^.]+$/, "")) + "</h1>" + text,
        );
      else if (/\.md$/i.test(f.name))
        editor.commands.setContent(
          "<h1>" +
            esc(f.name.replace(/\.[^.]+$/, "")) +
            "</h1>" +
            markdownToHTML(text),
        );
      else
        editor.commands.setContent({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: f.name.replace(/\.[^.]+$/, "") }],
            },
            ...text.split(/\r?\n/).map((line) => ({
              type: "paragraph",
              content: line ? [{ type: "text", text: line }] : [],
            })),
          ],
        });
      changed();
      rerender();
    }
  } catch (e) {
    alertBox("Import failed: " + e.message);
  }
}
function findDialog(replace = false) {
  const m = dialog(
    `<h2>${replace ? "Find and Replace" : "Find"}</h2><label>Find<input id="findText" value="${esc(findState?.term || "")}" aria-label="Find text"></label>${replace ? '<label>Replace with<input id="replaceText" aria-label="Replace with"></label>' : ""}<label class="checkboxLabel"><input id="matchCase" type="checkbox">Match case</label><p id="findCount"></p><div class="dialogActions">${B("Close", "cancel")}${B("Find Next", "next")}${replace ? B("Replace All", "replaceall", "primary") : ""}</div>`,
  );
  let index = 0;
  const matches = () => {
    const q = m.querySelector("#findText").value;
    const cs = m.querySelector("#matchCase").checked,
      all = [];
    if (!q) return all;
    editor.state.doc.descendants((n, pos) => {
      if (!n.isText) return;
      let start = 0,
        text = cs ? n.text : n.text.toLowerCase(),
        term = cs ? q : q.toLowerCase(),
        i;
      while ((i = text.indexOf(term, start)) >= 0) {
        all.push({ from: pos + i, to: pos + i + q.length });
        start = i + q.length;
      }
    });
    findState = { term: q };
    m.querySelector("#findCount").textContent = all.length + " matches";
    return all;
  };
  m.querySelector("#findText").oninput = () => {
    index = 0;
    matches();
  };
  m.querySelector('[data-action="next"]').onclick = () => {
    const all = matches();
    if (!all.length) return;
    editor
      .chain()
      .setTextSelection(all[index++ % all.length])
      .scrollIntoView()
      .run();
  };
  m.querySelector('[data-action="replaceall"]')?.addEventListener(
    "click",
    () => {
      const all = matches(),
        replacement = m.querySelector("#replaceText").value;
      editor.commands.command(({ tr }) => {
        for (const a of all.reverse()) tr.insertText(replacement, a.from, a.to);
        return true;
      });
      matches();
    },
  );
  matches();
}
function globalSearch() {
  const m = dialog(
    `<h2>Quick Search</h2><input id="globalQuery" placeholder="Search titles and document content…" aria-label="Quick Search"><div class="searchfilters"><label>Recently opened<select id="recentFilter"><option value="0">Any time</option><option value="1">Past day</option><option value="7">Past week</option><option value="30">Past month</option></select></label><label>Type<select id="typeFilter"><option value="all">All files</option><option value="doc">Documents</option><option value="sheet">Spreadsheets</option></select></label></div><div id="globalResults"></div>${B("Close", "cancel")}`,
  );
  function draw() {
    const q = m.querySelector("#globalQuery").value.toLowerCase(),
      days = Number(m.querySelector("#recentFilter").value),
      type = m.querySelector("#typeFilter").value;
    const docs = db.documents.filter(
      (d) =>
        !d.trash &&
        (!days || now() - d.opened <= days * 86400000) &&
        (type === "all" || d.kind === type) &&
        `${d.title} ${d.text}`.toLowerCase().includes(q),
    );
    const el = m.querySelector("#globalResults");
    el.innerHTML =
      docs
        .map((d) =>
          B(
            I(d.kind === "sheet" ? "FileSpreadsheet" : "FileText") +
              `<span>${esc(d.title)}<small>${esc(d.text.slice(0, 90))}</small></span>`,
            "result:" + d.id,
          ),
        )
        .join("") || '<p class="empty">No matching files.</p>';
    el.querySelectorAll("button").forEach(
      (b) =>
        (b.onclick = () => {
          m.close();
          open(b.dataset.action.slice(7));
        }),
    );
  }
  m.querySelector("input").oninput = draw;
  m.querySelectorAll("select").forEach((s) => (s.onchange = draw));
  draw();
}
function normalize(d) {
  if (d.typography) d.typography = normalizeTypography(d.typography);
  if (d.kind !== "sheet" && !d.integratedTitle && d.content) {
    d.content.content.unshift({
      type: "heading",
      attrs: { level: 1, id: uid() },
      content:
        d.title && d.title !== "Untitled"
          ? [{ type: "text", text: d.title }]
          : [],
    });
    d.integratedTitle = true;
  }
  if (d.content)
    walk(d.content, (n) => {
      if (
        [
          "heading",
          "paragraph",
          "taskItem",
          "blockquote",
          "pullQuote",
          "codeBlock",
          "table",
          "spreadsheet",
          "image",
        ].includes(n.type)
      ) {
        n.attrs ||= {};
        n.attrs.id ||= uid();
      }
    });
  return {
    kind: "doc",
    created: now(),
    updated: now(),
    opened: now(),
    visits: 0,
    favorite: false,
    trash: false,
    folder: null,
    text: "",
    messages: [],
    comments: [],
    locked: false,
    cells: Array.from({ length: 20 }, () => Array(8).fill("")),
    ...d,
    history: (d.history || []).map((h) => ({ id: uid(), ...h })),
  };
}
function handle(event) {
  const b = event.target.closest("[data-action]");
  if (!b) return;
  try {
    const result = act(b.dataset.action, b);
    result?.catch?.((e) => alertBox("Action failed: " + e.message));
  } catch (e) {
    alertBox("Action failed: " + e.message);
  }
}
function act(a, anchor) {
  const d = doc();
  if (a.startsWith("quicktrash:")) return quickTrash(a.slice(11));
  if (a.startsWith("undotrash:")) {
    const id = a.slice(10);
    const item = db.documents.find((x) => x.id === id);
    if (item) {
      item.trash = false;
      dirty();
      rows();
    }
    document.querySelector("#trashNotice")?.remove();
    return;
  }
  if (a.startsWith("tree:")) {
    const id = a.slice(5);
    prefs().expanded ||= ["private"];
    const e = prefs().expanded;
    const i = e.indexOf(id);
    i < 0 ? e.push(id) : e.splice(i, 1);
    dirty();
    rows();
    return;
  }
  if (a.startsWith("open:")) return open(a.slice(5));
  if (a.startsWith("cmd:")) return command(a.slice(4), anchor);
  if (a.startsWith("menu:")) return menu(a.slice(5), anchor);
  if (a.startsWith("tab:")) {
    tab = a.slice(4);
    render();
    return;
  }
  if (a.startsWith("sort:")) {
    sort = a.slice(5);
    descending = !descending;
    rows();
    return;
  }
  if (a.startsWith("folder:")) return home(a);
  if (a.startsWith("docmenu:")) return documentMenu(a.slice(8), anchor);
  if (a.startsWith("restore:")) {
    db.documents.find((x) => x.id === a.slice(8)).trash = false;
    dirty();
    rows();
    return;
  }
  if (a.startsWith("outline:")) {
    revealOutline(Number(a.slice(8)));
    return;
  }
  if (a.startsWith("taskopen:")) {
    const [, id, block] = a.split(":");
    return open(id, block);
  }
  if (a.startsWith("foldermenu:")) {
    const f = db.folders.find((f) => f.id === a.slice(11));
    return showMenu(anchor, [
      {
        label: "Open Folder",
        icon: "Folder",
        run: () => home("folder:" + f.id),
      },
      {
        label: "New Subfolder",
        icon: "Plus",
        run: () =>
          ask("New Subfolder", "", (name) => {
            if (name.trim()) {
              db.folders.push({ id: uid(), name: name.trim(), parent: f.id });
              dirty();
              rows();
            }
          }),
      },
      {
        label: "Rename Folder",
        run: () =>
          ask("Folder name", f.name, (name) => {
            f.name = name;
            dirty();
            render();
          }),
      },
      {
        label: "Remove Folder",
        run: () =>
          confirmDialog(
            "Remove folder?",
            "Files will be moved to Private.",
            () => {
              db.documents.forEach((d) => {
                if (d.folder === f.id) d.folder = f.parent || null;
              });
              db.folders.forEach((child) => {
                if (child.parent === f.id) child.parent = f.parent || null;
              });
              db.folders = db.folders.filter((x) => x !== f);
              dirty();
              render();
            },
          ),
      },
    ]);
  }
  if (a.startsWith("resolve:")) {
    const t = d.comments.find((t) => t.id === a.slice(8));
    t.resolved = !t.resolved;
    dirty();
    refreshConversation();
    return;
  }
  if (a.startsWith("deletecomment:"))
    return confirmDialog(
      "Delete comment?",
      "The thread and replies will be removed.",
      () => {
        const id = a.slice(14);
        d.comments = d.comments.filter((t) => t.id !== id);
        editor.commands.command(({ tr, state }) => {
          state.doc.descendants((n, pos) => {
            if (
              n.isText &&
              n.marks.some(
                (m) => m.type.name === "comment" && m.attrs.thread === id,
              )
            )
              tr.removeMark(pos, pos + n.nodeSize, state.schema.marks.comment);
          });
          return true;
        });
        activeThread = null;
        dirty();
        refreshConversation();
      },
    );
  if (a.startsWith("deletemessage:"))
    return confirmDialog(
      "Delete message?",
      "This local message will be removed.",
      () => {
        d.messages = d.messages.filter((m) => m.id !== a.slice(14));
        dirty();
        refreshConversation();
      },
    );
  if (a.startsWith("messagefile:")) {
    const f = d.messages.find((m) => m.id === a.slice(12))?.file;
    return f && window.desktop.exportBinary(f);
  }
  const actions = {
    openlink: () =>
      ask("Open Local Link", "quill://document/", (link) => {
        try {
          const u = new URL(link);
          if (u.protocol !== "quill:" || u.hostname !== "document")
            throw Error();
          const id = u.pathname.slice(1);
          if (!db.documents.some((d) => d.id === id && !d.trash)) throw Error();
          open(id, u.hash.slice(1));
        } catch {
          alertBox("This link does not match a document in this workspace.");
        }
      }),
    new: () => newDoc(),
    newsheet: () => newDoc("sheet"),
    home: () => home(),
    folders: () => home("folders"),
    updates: () => {
      sort = "updated";
      home("updates");
    },
    favorites: () => home("favorites"),
    trash: () => home("trash"),
    tasks: () => home("tasks"),
    drawer: () => {
      drawer = !drawer;
      rerender();
    },
    search: globalSearch,
    retry: () => flush().catch(() => {}),
    star: () => {
      d.favorite = !d.favorite;
      dirty();
      rerender();
    },
    conversation: () => {
      conversation = !conversation;
      activeThread = null;
      rerender();
    },
    focus: () => {
      focus = !focus;
      rerender();
    },
    readonly: () => {
      d.locked = !d.locked;
      dirty();
      rerender();
    },
    newfolder: () =>
      ask("New Folder", "", (name) => {
        if (name.trim()) {
          db.folders.push({
            id: uid(),
            name: name.trim(),
            parent: view.startsWith("folder:") ? view.slice(7) : null,
          });
          dirty();
          render();
        }
      }),
    rename: () => rename(d),
    duplicate: () => duplicate(d),
    delete: () => trash(d),
    move: () => moveDialog(d),
    checkpoint: () => {
      checkpoint(d, true);
      dirty();
      historyDialog();
    },
    history: historyDialog,
    stylemenu: () => styleMenu(anchor),
    sectionmenu: () => sectionMenu(anchor),
    titlesection: () =>
      showMenu(anchor, [
        { label: "Rename Document", run: () => rename(d) },
        { label: "Copy Link", run: () => copyAnchor() },
      ]),
    colors: () => colorMenu(anchor),
    comment: commentDialog,
    threadlist: threadList,
    send: sendMessage,
    copyanchor: copyAnchor,
    copylink: () =>
      navigator.clipboard.writeText("quill://document/" + current),
    outline: () => {
      d.outlineMode = d.outlineMode === "expanded" ? "peek" : "expanded";
      dirty();
      rerender();
    },
    showoutline: () => {
      d.outlineMode = d.outlineMode === "hidden" ? "peek" : "hidden";
      dirty();
      rerender();
    },
    pinsidebar: () => {
      prefs().sidebarPinned = !prefs().sidebarPinned;
      drawer = prefs().sidebarPinned;
      dirty();
      rerender();
    },
    layout: () => {
      d.layout = d.layout === "wide" ? "standard" : "wide";
      d.updated = now();
      dirty();
      rerender();
    },
    linenumbers: () => {
      prefs().lineNumbers = !prefs().lineNumbers;
      dirty();
      rerender();
    },
    pagebreaks: () => {
      prefs().pageBreaks = !prefs().pageBreaks;
      dirty();
      rerender();
    },
    typography: () => typographyDialog(),
    find: () => findDialog(),
    replace: () => findDialog(true),
    exportmenu: () => exportMenu(anchor),
    print: () => window.desktop.print(),
    printoptions: () => window.desktop.printPDF(),
    import: importFile,
    details: () =>
      alertBox(
        `Created: ${stamp(d.created)}\nUpdated: ${stamp(d.updated)}\nOpened: ${stamp(d.opened)}\nDocument ID: ${d.id}\nStorage: local, private to this computer`,
      ),
    compose: () =>
      showMenu(anchor, [
        {
          label: "New Document",
          icon: "FileText",
          shortcut: "Ctrl+Alt+N",
          run: () => newDoc(),
        },
        {
          label: "New Spreadsheet",
          icon: "FileSpreadsheet",
          run: () => newDoc("sheet"),
        },
        { label: "New Folder", icon: "Folder", run: () => act("newfolder") },
        {
          label: "Template Library",
          icon: "FileText",
          run: () => templateLibrary(),
        },
        { label: "Import…", icon: "Download", run: () => importFile() },
        { label: "Open Local Link…", icon: "Link", run: () => act("openlink") },
      ]),
    viewmenu: () =>
      showMenu(anchor, [
        {
          label: "Regular List",
          active: !prefs().compact,
          run: () => {
            prefs().compact = false;
            dirty();
            render();
          },
        },
        {
          label: "Small List",
          active: prefs().compact,
          run: () => {
            prefs().compact = true;
            dirty();
            render();
          },
        },
      ]),
    references: () => {
      const refs = db.documents.filter(
        (x) =>
          !x.trash &&
          x.id !== current &&
          JSON.stringify(x.content).includes(current),
      );
      const m = dialog(
        `<h2>References</h2><p>Documents that link here</p>${refs.map((x) => B(esc(x.title), "reference:" + x.id)).join("") || '<p class="empty">No document references.</p>'}${B("Close", "cancel")}`,
      );
      m.querySelectorAll('[data-action^="reference:"]').forEach(
        (b) =>
          (b.onclick = () => {
            m.close();
            open(b.dataset.action.slice(10));
          }),
      );
    },
    messageattach: async () => {
      const f = await readFile("*/*");
      if (f) {
        d.messages.push({
          id: uid(),
          text: "Attached a file",
          file: f,
          at: now(),
        });
        dirty();
        refreshConversation();
      }
    },
    notes: () => {
      if (d) {
        conversation = true;
        activeThread = null;
        rerender();
      } else alertBox("Open a document to view its conversation.");
    },
    notifications: () => {
      const all = db.documents.flatMap((x) =>
        x.comments
          .filter((t) => !t.resolved)
          .map((t) => ({ doc: x, thread: t })),
      );
      const m = dialog(
        `<h2>Open Comments</h2>${all.map((x) => B(esc(x.doc.title) + " — " + esc(x.thread.text.slice(0, 60)), "notification:" + x.doc.id + ":" + x.thread.id)).join("") || "<p>No open comments.</p>"}${B("Close", "cancel")}`,
      );
      m.querySelectorAll('[data-action^="notification:"]').forEach(
        (b) =>
          (b.onclick = () => {
            const [, id, thread] = b.dataset.action.split(":");
            m.close();
            activeThread = thread;
            conversation = true;
            open(id);
          }),
      );
    },
    thememenu: () =>
      showMenu(
        anchor,
        ["system", "light", "dark"].map((theme) => ({
          label: {
            system: "Use System Setting",
            light: "Light Mode",
            dark: "Dark Mode",
          }[theme],
          icon: { system: "Monitor", light: "Sun", dark: "Moon" }[theme],
          active: prefs().theme === theme,
          run: () => {
            prefs().theme = theme;
            dirty();
            applyTheme();
            rerender();
          },
        })),
      ),
    settings: () => {
      const m = dialog(
        `<h2>Local Workspace</h2><label>Appearance<select id="theme"><option value="system">Use System Setting</option><option value="light">Light Mode</option><option value="dark">Dark Mode</option></select></label><label>Default document typography<select id="defaultTypography">${typographyThemes.map((t) => `<option value="${t.id}">${t.name}</option>`).join("")}</select></label>${B("Keyboard Shortcuts", "shortcutsettings")}<label>Your display name<input id="displayName" value="${esc(prefs().name)}"></label><div class="settingsActions">${B("Export Workspace Backup", "backup")}${B("Import Files / Backup", "importer")}</div><p>This app works offline. Cloud login, synchronization and shared accounts are excluded.</p><div class="dialogActions">${B("Close", "cancel")}${B("Save", "submit", "primary")}</div>`,
      );
      m.querySelector("#defaultTypography").value = normalizeTypography(
        prefs().defaultTypography,
      );
      m.querySelector("#defaultTypography").onchange = (e) => {
        prefs().defaultTypography = e.target.value;
        dirty();
      };
      m.querySelector("#theme").value = prefs().theme;
      m.querySelector("#theme").onchange = (e) => {
        prefs().theme = e.target.value;
        dirty();
        applyTheme();
      };
      m.querySelector('[data-action="shortcutsettings"]').onclick = () => {
        m.close();
        shortcutDialog();
      };
      m.querySelector('[data-action="submit"]').onclick = () => {
        prefs().name = m.querySelector("input").value.trim() || "You";
        dirty();
        m.close();
      };
      m.querySelector('[data-action="backup"]').onclick = () =>
        exportText("Quill-backup", "json", JSON.stringify(db, null, 2));
      m.querySelector('[data-action="importer"]').onclick = () => {
        m.close();
        importFile();
      };
    },
    template: () =>
      ask("Template name", d.title, (name) => {
        db.templates.push({
          id: uid(),
          title: name,
          content: regenerateIds(d.content),
          typography: d.typography,
          layout: d.layout,
        });
        dirty();
      }),
    cancel: () => document.querySelector("#modal").close(),
  };
  actions[a]?.();
}
function templateLibrary() {
  const m = dialog(
    `<h2>Template Library</h2>${db.templates.map((t) => B(esc(t.title), "template:" + t.id)).join("") || "<p>Mark a document as a template from the Document menu.</p>"}${B("Close", "cancel")}`,
  );
  m.querySelectorAll('[data-action^="template:"]').forEach(
    (b) =>
      (b.onclick = () => {
        const t = db.templates.find((t) => t.id === b.dataset.action.slice(9));
        m.close();
        newDoc("doc", t);
      }),
  );
}
const themeMedia = window.matchMedia?.("(prefers-color-scheme: dark)");
function applyTheme() {
  if (!db?.settings) return;
  const choice = prefs().theme || "system";
  const resolved =
    choice === "system"
      ? themeMedia
        ? themeMedia.matches
          ? "dark"
          : "light"
        : "dark"
      : choice;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeChoice = choice;
  document.documentElement.style.colorScheme = resolved;
  window.desktop.setTheme?.(choice).catch?.(() => {});
  const button = document.querySelector('[data-action="thememenu"]');
  if (button)
    button.innerHTML = I(
      choice === "system" ? "Monitor" : choice === "light" ? "Sun" : "Moon",
    );
}
themeMedia?.addEventListener?.("change", () => {
  if (db?.settings.theme === "system") applyTheme();
});
function quickTrash(id) {
  const item = db.documents.find((d) => d.id === id && !d.trash);
  if (!item) return;
  item.trash = true;
  dirty();
  rows();
  document.querySelector("#trashNotice")?.remove();
  root.insertAdjacentHTML(
    "beforeend",
    `<div id="trashNotice" class="toast" role="status">${I("Trash2", 16)}<span>${esc(item.title)} moved to Trash</span>${B("Undo", "undotrash:" + id)}</div>`,
  );
}
function runShortcut(action) {
  if (action.startsWith("cmd:")) return command(action.slice(4));
  if (action === "save") return flush().catch(() => {});
  if (action === "shortcuts") return shortcutDialog();
  if (action === "commands") return commandLibrary();
  if (action === "newmessage") {
    if (!doc())
      return alertBox("Open a document to add a local conversation message.");
    conversation = true;
    activeThread = null;
    rerender();
    document.querySelector("#message")?.focus();
    return;
  }
  if (action === "sectionmenu")
    return sectionMenu(document.querySelector("#sectionStyle"));
  if (action === "collapsesection") {
    contextPos = editor.state.selection.$from.depth
      ? editor.state.selection.$from.before(1)
      : editor.state.selection.from;
    return sectionAttribute("collapsed");
  }
  if (action === "cyclestyle") {
    const options = [
      "paragraph",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "bullet",
      "number",
      "task",
      "codeblock",
    ];
    let at = options.indexOf(styleState()[1]);
    return command(options[(at + 1) % options.length]);
  }
  if (action === "primaryaction") {
    if (editor.isActive("taskItem")) {
      if (doc().locked) return;
      const checked = editor.getAttributes("taskItem").checked;
      return editor.commands.updateAttributes("taskItem", {
        checked: !checked,
      });
    }
    const href = editor.getAttributes("link").href;
    if (href) return window.desktop.openExternal?.(href);
    const { $from } = editor.state.selection,
      node = $from.nodeAfter || $from.nodeBefore;
    if (node?.type.name === "chip") {
      if (node.attrs.kind === "document") return open(node.attrs.target);
      if (node.attrs.kind === "folder")
        return home("folder:" + node.attrs.target);
    }
    return;
  }
  if (action === "nextregion" || action === "previousregion") {
    const regions = [
      document.querySelector(".rail button"),
      document.querySelector(".menus button"),
      document.querySelector(".tiptap"),
      document.querySelector("#message"),
    ].filter(Boolean);
    const focused = document.activeElement;
    let at = regions.findIndex(
      (el) => el === focused || el.parentElement?.contains(focused),
    );
    if (at < 0) at = 0;
    regions[
      (at + (action === "nextregion" ? 1 : -1) + regions.length) %
        regions.length
    ]?.focus();
    return;
  }
  return act(action);
}
function moveListItem(direction) {
  const { $from, from, to } = editor.state.selection;
  let depth = $from.depth;
  while (
    depth > 0 &&
    !["listItem", "taskItem"].includes($from.node(depth).type.name)
  )
    depth--;
  if (!depth) return;
  const parent = $from.node(depth - 1),
    index = $from.index(depth - 1),
    node = $from.node(depth),
    start = $from.before(depth);
  if (
    (direction < 0 && index === 0) ||
    (direction > 0 && index >= parent.childCount - 1)
  )
    return;
  const neighbor = parent.child(index + direction),
    target =
      direction < 0 ? start - neighbor.nodeSize : start + neighbor.nodeSize;
  const offset = from - start,
    length = to - from;
  const success = editor.commands.command(({ tr }) => {
    tr.delete(start, start + node.nodeSize);
    tr.insert(target, node);
    return true;
  });
  if (success)
    editor.commands.setTextSelection({
      from: target + offset,
      to: target + offset + length,
    });
}
function shortcutDialog() {
  const m = dialog(
    `<h2>Keyboard Shortcuts</h2><div class="shortcutTabs" role="tablist">${["General", "Editing", "Navigation"].map((c, i) => `<button role="tab" aria-selected="${i === 0}" data-category="${c}">${c}</button>`).join("")}</div><input id="shortcutSearch" placeholder="Search shortcuts…" aria-label="Search keyboard shortcuts"><div id="shortcutRows"></div><div class="dialogActions">${B("Done", "cancel")}</div>`,
  );
  m.classList.add("shortcutDialog");
  let category = "General";
  const draw = () => {
    const query = m.querySelector("#shortcutSearch").value.toLowerCase();
    const matches = shortcutHelp.filter(
      ([group, label, keys]) =>
        (query
          ? true
          : category === "General"
            ? group === "General" || group === "Style"
            : category === "Editing"
              ? group === "Editing"
              : group === "General") &&
        (!query || `${label} ${keys}`.toLowerCase().includes(query)),
    );
    m.querySelector("#shortcutRows").innerHTML =
      matches
        .map(
          ([group, label, keys]) =>
            `<div class="shortcutRow"><span>${esc(label)}</span><kbd>${esc(keys)}</kbd></div>`,
        )
        .join("") || "<p>No matching shortcuts.</p>";
    m.querySelectorAll("[data-category]").forEach((b) =>
      b.setAttribute("aria-selected", String(b.dataset.category === category)),
    );
  };
  m.querySelector("#shortcutSearch").oninput = draw;
  m.querySelectorAll("[data-category]").forEach(
    (b) =>
      (b.onclick = () => {
        category = b.dataset.category;
        draw();
      }),
  );
  draw();
  m.addEventListener("close", () => m.classList.remove("shortcutDialog"), {
    once: true,
  });
}
function commandLibrary() {
  const m = dialog(
    `<h2>Command Library</h2><input id="commandSearch" placeholder="Search commands…" aria-label="Search commands"><div id="commandResults"></div>${B("Close", "cancel")}`,
  );
  const candidates = [
    ...shortcutHelp.filter((x) => !["commands", "shortcuts"].includes(x[3])),
    ...styles.map(([label, cmd, , keys]) => [
      "Style",
      label,
      keys,
      "cmd:" + cmd,
    ]),
  ];
  const seen = new Set(),
    entries = candidates.filter((x) => {
      if (seen.has(x[3])) return false;
      seen.add(x[3]);
      return true;
    });
  let selected = 0;
  const draw = () => {
    const query = m.querySelector("input").value.toLowerCase();
    const matches = entries.filter((x) => x[1].toLowerCase().includes(query));
    const el = m.querySelector("#commandResults");
    el.innerHTML = matches
      .map(
        (x, i) =>
          `<button data-index="${i}" class="${i === selected ? "selected" : ""}"><span>${esc(x[1])}</span><kbd>${esc(x[2])}</kbd></button>`,
      )
      .join("");
    el.querySelectorAll("button").forEach(
      (b, i) =>
        (b.onclick = () => {
          m.close();
          runShortcut(matches[i][3]);
        }),
    );
    return matches;
  };
  m.querySelector("input").oninput = () => {
    selected = 0;
    draw();
  };
  m.onkeydown = (e) => {
    if (["ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const count = m.querySelectorAll("#commandResults button").length;
      if (count)
        selected =
          (selected + (e.key === "ArrowDown" ? 1 : -1) + count) % count;
      draw();
      m.querySelector(".selected")?.scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter") {
      e.preventDefault();
      m.querySelector("#commandResults .selected")?.click();
    }
  };
  draw();
  m.querySelector("input").focus();
}

document.addEventListener("mousedown", (e) => {
  if (
    popup &&
    !popup.contains(e.target) &&
    !e.target.closest("[data-action], [data-command]")
  )
    closePopup();
});
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "Escape") {
      closePopup();
      return;
    }
    if (document.querySelector("#modal")?.open) return;
    const target = e.target instanceof Element ? e.target : null;
    if (popup?.contains(target)) return;
    const typing = Boolean(
      target?.closest("input,textarea,select") ||
      target?.closest('[contenteditable="true"]:not(.tiptap)'),
    );
    const editing = Boolean(editor && !typing);
    if (e.key === "Delete" && !typing && !target?.closest(".tiptap")) {
      const row = target?.closest("[data-doc]");
      if (row) {
        e.preventDefault();
        e.stopImmediatePropagation();
        quickTrash(row.dataset.doc);
        return;
      }
    }
    const action = shortcutFor(e, {
      editing,
      typing,
      list:
        editing && (editor.isActive("listItem") || editor.isActive("taskItem")),
    });
    if (!action) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    runShortcut(action);
  },
  true,
);
window.addEventListener("hashchange", () => {
  const [id, anchor] = location.hash.slice(1).split("~");
  if (id === current) return;
  if (db.documents.some((d) => d.id === id)) open(id, anchor);
  else if (!id && current) home();
});
window.desktop.onClose?.(async () => {
  if (!db) return window.desktop.closeReady();
  if (doc()) checkpoint(doc());
  try {
    await flush();
    window.desktop.closeReady();
  } catch {
    alertBox(
      "Saving failed. Closing was cancelled. Retry saving or export a workspace backup.",
    );
  }
});
(async () => {
  try {
    db = await window.desktop.load();
    db.documents = db.documents.map(normalize);
    db.settings = {
      theme: "system",
      compact: true,
      outline: false,
      lineNumbers: false,
      pageBreaks: false,
      typography: "sans",
      name: "You",
      defaultTypography: "atlas",
      sidebarPinned: false,
      ...db.settings,
    };
    db.documents.forEach((d) => {
      d.typography = normalizeTypography(d.typography || prefs().typography);
      d.layout ||= "standard";
      d.outlineMode ||= prefs().outline ? "expanded" : "peek";
    });
    prefs().defaultTypography = normalizeTypography(prefs().defaultTypography);
    db.templates ||= [];
    const id = location.hash.slice(1).split("~")[0];
    if (db.documents.some((d) => d.id === id && !d.trash)) current = id;
    render();
  } catch (e) {
    root.innerHTML =
      '<div class="fatal"><h1>Workspace could not be loaded</h1><p>Your data has not been overwritten. Restore workspace.json from its .bak file or a backup before restarting.</p><pre>' +
      esc(e.message) +
      "</pre></div>";
  }
})();
