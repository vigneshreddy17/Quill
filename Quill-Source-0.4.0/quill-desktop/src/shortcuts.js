// Context-sensitive shortcuts from the live Quip Windows shortcut panel.
export function eventKey(e) {
  const codes = {
    Backquote: "`",
    Slash: "/",
    Backslash: "\\",
    Minus: "-",
    Comma: ",",
    Period: ".",
  };
  if (/^Digit[0-9]$/.test(e.code)) return e.code.slice(-1);
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(-1).toLowerCase();
  if (codes[e.code]) return codes[e.code];
  const shifted = {
    "&": "7",
    "*": "8",
    "(": "9",
    ")": "0",
    _: "-",
    "?": "/",
    "~": "`",
    "<": ",",
    ">": ".",
  };
  return shifted[e.key] || String(e.key).toLowerCase();
}
export function shortcutFor(
  e,
  { editing = false, typing = false, list = false } = {},
) {
  if (e.isComposing || e.keyCode === 229 || e.getModifierState?.("AltGraph"))
    return null;
  const key = eventKey(e),
    mod = e.ctrlKey || e.metaKey;
  if (!mod) {
    if (editing && !typing && key === "tab" && list)
      return e.shiftKey ? "cmd:outdent" : "cmd:indent";
    if (editing && !typing && e.altKey && e.shiftKey && key === "c")
      return "sectionmenu";
    if (e.altKey && key === "f6")
      return e.shiftKey ? "previousregion" : "nextregion";
    return null;
  }
  if (typing) return null;
  if (!e.altKey && !e.shiftKey && key === "/") return "shortcuts";
  if (e.altKey && !e.shiftKey) {
    const global = { n: "new", m: "newmessage", v: "home" };
    if (global[key]) return global[key];
    if (editing)
      return (
        {
          0: "cmd:paragraph",
          1: "cmd:h1",
          2: "cmd:h2",
          3: "cmd:h3",
          4: "cmd:h4",
          5: "cmd:h5",
          6: "cmd:h6",
          k: "cmd:codeblock",
          c: "conversation",
          arrowup: "cmd:moveup",
          arrowdown: "cmd:movedown",
        }[key] || null
      );
    return null;
  }
  if (e.altKey) return null;
  if (e.shiftKey) {
    const global = {
      j: "commands",
      i: "updates",
      e: "notifications",
      y: "home",
      u: "tasks",
      s: "notes",
    };
    if (global[key]) return global[key];
    if (editing)
      return (
        {
          b: "cmd:bold",
          l: "cmd:bullet",
          8: "cmd:bullet",
          7: "cmd:number",
          9: "cmd:task",
          x: "cmd:strike",
          k: "cmd:code",
          c: "comment",
          h: "replace",
          m: "focus",
          o: "outline",
          a: "copyanchor",
          z: "cmd:redo",
          "-": "collapsesection",
        }[key] || null
      );
    if (key === "a") return "folders";
    return null;
  }
  if (key === "n") return "new";
  if (key === "j") return "search";
  if (key === "s") return "save";
  if (editing)
    return (
      {
        b: "cmd:bold",
        i: "cmd:italic",
        u: "cmd:underline",
        z: "cmd:undo",
        y: "cmd:redo",
        k: "cmd:link",
        f: "find",
        p: "print",
        ",": "cmd:sub",
        ".": "cmd:sup",
        "\\": "cmd:clear",
        "`": "cyclestyle",
        enter: "primaryaction",
      }[key] || null
    );
  if (key === "k") return "search";
  return null;
}
export const shortcutHelp = [
  ["General", "New document", "Ctrl+Alt+N (also Ctrl+N)", "new"],
  ["General", "Quick Search", "Ctrl+J", "search"],
  ["General", "Command Library", "Ctrl+Shift+J", "commands"],
  ["General", "Keyboard Shortcuts", "Ctrl+/", "shortcuts"],
  ["General", "Home", "Ctrl+Alt+V", "home"],
  ["General", "Updates", "Ctrl+Shift+I", "updates"],
  ["General", "Folders (outside editor)", "Ctrl+Shift+A", "folders"],
  ["General", "Tasks", "Ctrl+Shift+U", "tasks"],
  ["General", "Save / retry save", "Ctrl+S", "save"],
  [
    "Style",
    "Bold / Italic / Underline",
    "Ctrl+B / Ctrl+I / Ctrl+U",
    "cmd:bold",
  ],
  ["Style", "Strikethrough", "Ctrl+Shift+X", "cmd:strike"],
  ["Style", "Inline code", "Ctrl+Shift+K", "cmd:code"],
  ["Style", "Paragraph", "Ctrl+Alt+0", "cmd:paragraph"],
  ["Style", "Heading 1–6", "Ctrl+Alt+1–6", "cmd:h1"],
  ["Style", "Bulleted list", "Ctrl+Shift+L or Ctrl+Shift+8", "cmd:bullet"],
  ["Style", "Numbered list", "Ctrl+Shift+7", "cmd:number"],
  ["Style", "Checklist", "Ctrl+Shift+9", "cmd:task"],
  ["Style", "Code block", "Ctrl+Alt+K", "cmd:codeblock"],
  ["Style", "Cycle heading / list styles", "Ctrl+`", "cyclestyle"],
  ["Style", "Subscript / Superscript", "Ctrl+, / Ctrl+.", "cmd:sub"],
  ["Editing", "Undo / Redo", "Ctrl+Z / Ctrl+Shift+Z (also Ctrl+Y)", "cmd:undo"],
  ["Editing", "Link", "Ctrl+K", "cmd:link"],
  ["Editing", "Comments", "Ctrl+Shift+C", "comment"],
  [
    "Editing",
    "Collapse / expand section",
    "Ctrl+Shift+Minus",
    "collapsesection",
  ],
  ["Editing", "Focus mode", "Ctrl+Shift+M", "focus"],
  ["Editing", "Conversation", "Ctrl+Alt+C", "conversation"],
  ["Editing", "Outline", "Ctrl+Shift+O", "outline"],
  ["Editing", "Find / Find and Replace", "Ctrl+F / Ctrl+Shift+H", "find"],
  ["Editing", "Copy anchor link", "Ctrl+Shift+A", "copyanchor"],
  ["Editing", "Clear formatting", "Ctrl+Backslash", "cmd:clear"],
  [
    "Editing",
    "Toggle checklist item / follow link",
    "Ctrl+Enter",
    "primaryaction",
  ],
  ["Editing", "Indent / Outdent list item", "Tab / Shift+Tab", "cmd:indent"],
  ["Editing", "Move list item", "Ctrl+Alt+Up / Down", "cmd:moveup"],
  ["Editing", "Open section menu", "Alt+Shift+C", "sectionmenu"],
  [
    "Editing",
    "Move focus between regions",
    "Alt+F6 / Alt+Shift+F6",
    "nextregion",
  ],
  ["Editing", "Print", "Ctrl+P", "print"],
];
