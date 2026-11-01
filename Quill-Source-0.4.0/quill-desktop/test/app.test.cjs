const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("jsdom");
async function harness(initial) {
  let saved;
  const dom = new JSDOM('<div id="app"></div>', {
    url: "https://quill.test",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  w.structuredClone = structuredClone;
  w.Range.prototype.getBoundingClientRect = () => ({
    top: 0,
    bottom: 20,
    left: 0,
    right: 10,
    width: 10,
    height: 20,
  });
  w.Range.prototype.getClientRects = () => [];
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.desktop = {
    load: async () => initial || { version: 1, folders: [], documents: [] },
    save: async (d) => {
      saved = structuredClone(d);
    },
    export: async () => true,
    exportBinary: async () => true,
    print: async () => true,
    printPDF: async () => true,
  };
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.eval(fs.readFileSync("dist/app.js", "utf8"));
  const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
  await tick();
  const click = (selector) => {
    const el = w.document.querySelector(selector);
    assert.ok(el, "missing " + selector);
    el.click();
  };
  const input = (selector, value) => {
    const el = w.document.querySelector(selector);
    el.value = value;
    el.dispatchEvent(new w.Event("input", { bubbles: true }));
  };
  const create = async () => {
    w.document.dispatchEvent(
      new w.KeyboardEvent("keydown", { key: "n", ctrlKey: true, altKey: true }),
    );
    await tick();
  };
  const flush = async () => {
    w.document.dispatchEvent(
      new w.KeyboardEvent("keydown", { key: "s", ctrlKey: true }),
    );
    await tick();
  };
  return {
    w,
    tick,
    click,
    input,
    create,
    flush,
    get editor() {
      return w.document.querySelector(".tiptap")?.editor;
    },
    get saved() {
      return saved;
    },
    close: () => {
      w.close();
    },
  };
}
test("document CRUD, selection-aware paragraph styles, table persistence, search and reopen", async () => {
  const h = await harness();
  try {
    await h.create();
    h.editor.commands.setContent("<h1>My project</h1><p>Alpha beta gamma</p>");
    let start;
    h.editor.state.doc.descendants((n, p) => {
      if (n.isText && n.text.includes("beta"))
        start = p + n.text.indexOf("beta");
    });
    h.editor.commands.setTextSelection({ from: start, to: start + 4 });
    h.click('[data-command="bold"]');
    assert.ok(
      h.editor.getHTML().includes("<strong>beta</strong>"),
      h.editor.getHTML(),
    );
    h.editor.commands.setTextSelection(start);
    h.click("#style");
    const heading = [...h.w.document.querySelectorAll(".popup button")].find(
      (b) => b.textContent.includes("Heading 2"),
    );
    heading.click();
    assert.ok(h.editor.isActive("heading", { level: 2 }));
    h.editor.commands.setTextSelection(h.editor.state.doc.content.size - 1);
    h.editor.commands.insertContent({ type: "paragraph" });
    h.editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
    await h.flush();
    assert.equal(h.saved.documents[0].title, "My project");
    assert.match(JSON.stringify(h.saved.documents[0].content), /table/);
    h.click('[data-action="drawer"]');
    h.click('[data-action="home"]');
    await h.tick();
    assert.match(
      h.w.document.querySelector("#results").textContent,
      /My project/,
    );
    h.input("#search", "missing");
    assert.equal(h.w.document.querySelectorAll(".file").length, 0);
    h.input("#search", "My project");
    h.click(".file");
    await h.tick();
    assert.equal(h.w.document.querySelectorAll(".tiptap table").length, 1);
    assert.ok(
      h.editor.getHTML().includes("<strong>beta</strong>"),
      h.editor.getHTML(),
    );
  } finally {
    h.close();
  }
});
test("anchored comment, reply, resolve and persistent marks follow edits", async () => {
  const h = await harness();
  try {
    await h.create();
    h.editor.commands.setContent("<p>Discuss this sentence.</p>");
    h.editor.commands.setTextSelection({ from: 1, to: 8 });
    h.click('[data-command="comment"]');
    h.input("#commentText", "Review wording");
    h.click('#modal [data-action="submit"]');
    await h.tick();
    assert.match(h.editor.getHTML(), /data-thread/);
    h.input("#message", "Looks good");
    h.click('[data-action="send"]');
    h.click('[data-action^="resolve:"]');
    await h.flush();
    const d = h.saved.documents[0];
    assert.equal(d.comments[0].text, "Review wording");
    assert.equal(d.comments[0].quote, "Discuss");
    assert.equal(d.comments[0].replies[0].text, "Looks good");
    assert.equal(d.comments[0].resolved, true);
    const thread = d.comments[0].id;
    h.editor.commands.insertContentAt(1, "Before ");
    await h.flush();
    assert.ok(JSON.stringify(h.saved.documents[0].content).includes(thread));
  } finally {
    h.close();
  }
});
test("find/replace stays structured, history and lock edit mode work", async () => {
  const h = await harness();
  try {
    await h.create();
    h.editor.commands.setContent("<p>red red</p><h2>red</h2>");
    h.w.document.dispatchEvent(
      new h.w.KeyboardEvent("keydown", {
        key: "h",
        ctrlKey: true,
        shiftKey: true,
      }),
    );
    h.input("#findText", "red");
    h.input("#replaceText", "blue");
    h.click('[data-action="replaceall"]');
    assert.equal(h.editor.getText().trim(), "blue blue\n\nblue");
    assert.ok(h.editor.getHTML().includes("<h2"));
    h.click('#modal [data-action="cancel"]');
    h.click('[data-action="readonly"]');
    assert.equal(h.editor.isEditable, false);
    h.click('[data-action="readonly"]');
    assert.equal(h.editor.isEditable, true);
    await h.flush();
    assert.ok(h.saved.documents[0].history.length > 0);
  } finally {
    h.close();
  }
});
test("existing 0.1 workspace migrates without losing document content", async () => {
  const h = await harness({
    version: 1,
    folders: [],
    documents: [
      {
        id: "old",
        title: "Old note",
        content: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Keep me" }] },
          ],
        },
        text: "Keep me",
        opened: 1,
        updated: 1,
        visits: 0,
        history: [
          {
            at: 1,
            title: "Old",
            content: { type: "doc", content: [{ type: "paragraph" }] },
          },
        ],
      },
    ],
  });
  try {
    h.click(".file");
    await h.tick();
    assert.equal(h.editor.getText(), "Old note\n\nKeep me");
    await h.flush();
    assert.equal(h.saved.documents[0].id, "old");
    assert.deepEqual(h.saved.documents[0].comments, []);
    assert.ok(h.saved.documents[0].history[0].id);
  } finally {
    h.close();
  }
});
test("locked sections reject edits, collapsed headings hide body, failed saves recover", async () => {
  const h = await harness();
  try {
    await h.create();
    h.editor.commands.setContent(
      "<h1>Title</h1><h2>Section</h2><p>Protected body</p><h2>Next</h2>",
    );
    let pos;
    h.editor.state.doc.descendants((n, p) => {
      if (n.type.name === "paragraph" && n.textContent === "Protected body")
        pos = p;
    });
    h.editor.commands.setTextSelection(pos + 1);
    h.click("#sectionStyle");
    [...h.w.document.querySelectorAll(".popup button")]
      .find((b) => b.textContent.includes("Lock / Unlock"))
      .click();
    const before = h.editor.getText();
    h.editor.commands.insertContentAt(pos + 1, "No");
    assert.equal(h.editor.getText(), before);
    h.click("#sectionStyle");
    [...h.w.document.querySelectorAll(".popup button")]
      .find((b) => b.textContent.includes("Lock / Unlock"))
      .click();
    h.editor.commands.insertContentAt(pos + 1, "Yes ");
    assert.match(h.editor.getText(), /Yes Protected/);
    let section;
    h.editor.state.doc.descendants((n, p) => {
      if (n.type.name === "heading" && n.textContent === "Section") section = p;
    });
    h.editor.commands.setTextSelection(section + 1);
    h.click("#sectionStyle");
    [...h.w.document.querySelectorAll(".popup button")]
      .find((b) => b.textContent.includes("Collapse / Expand"))
      .click();
    assert.equal(h.w.document.querySelectorAll(".collapsed-hidden").length, 1);
    const save = h.w.desktop.save;
    h.w.desktop.save = async () => {
      throw Error("Disk full");
    };
    await h.flush();
    assert.match(
      h.w.document.querySelector("#save").textContent,
      /Save failed/,
    );
    h.w.desktop.save = save;
    h.click("#save");
    await h.tick();
    assert.match(
      h.w.document.querySelector("#save").textContent,
      /Saved locally/,
    );
  } finally {
    h.close();
  }
});

test("Windows keyboard events reach the editor once, preserve repeated formatting and support Quip aliases", async () => {
  const h = await harness();
  try {
    await h.create();
    h.editor.commands.setContent(
      "<h1>Keyboard test</h1><p>Alpha beta gamma</p>",
    );
    let start;
    h.editor.state.doc.descendants((n, p) => {
      if (n.isText && n.text.includes("beta"))
        start = p + n.text.indexOf("beta");
    });
    h.editor.commands.setTextSelection({ from: start, to: start + 4 });
    const key = (key, code, mods = {}) => {
      const e = new h.w.KeyboardEvent("keydown", {
        key,
        code,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
        ...mods,
      });
      h.editor.view.dom.dispatchEvent(e);
      assert.equal(e.defaultPrevented, true);
    };
    key("b", "KeyB");
    assert.match(h.editor.getHTML(), /<strong>beta<\/strong>/);
    key("i", "KeyI");
    assert.match(h.editor.getHTML(), /<strong><em>beta<\/em><\/strong>/);
    assert.equal(h.editor.state.selection.from, start);
    assert.equal(h.editor.state.selection.to, start + 4);
    key("&", "Digit7", { shiftKey: true });
    assert.ok(h.editor.isActive("orderedList"));
    key("9", "Digit9", { shiftKey: true });
    assert.ok(h.editor.isActive("taskList"));
    key("Enter", "Enter");
    assert.equal(h.editor.getAttributes("taskItem").checked, true);
    key("/", "Slash");
    assert.ok(h.w.document.querySelector("#modal").open);
    assert.match(
      h.w.document.querySelector("#modal").textContent,
      /Keyboard Shortcuts/,
    );
    h.input("#shortcutSearch", "Collapse");
    assert.match(
      h.w.document.querySelector("#shortcutRows").textContent,
      /Collapse/,
    );
    h.click('#modal [data-action="cancel"]');
    key("j", "KeyJ", { shiftKey: true });
    assert.match(
      h.w.document.querySelector("#modal").textContent,
      /Command Library/,
    );
  } finally {
    h.close();
  }
});

test("Light and Dark mode apply immediately and survive reopening", async () => {
  let saved;
  const h = await harness();
  try {
    h.click('[data-action="thememenu"]');
    [...h.w.document.querySelectorAll(".popup button")]
      .find((b) => b.textContent.includes("Light Mode"))
      .click();
    assert.equal(h.w.document.documentElement.dataset.theme, "light");
    await h.flush();
    saved = h.saved;
    assert.equal(saved.settings.theme, "light");
  } finally {
    h.close();
  }
  const again = await harness(saved);
  try {
    assert.equal(again.w.document.documentElement.dataset.theme, "light");
    again.click('[data-action="settings"]');
    const select = again.w.document.querySelector("#theme");
    select.value = "dark";
    select.dispatchEvent(new again.w.Event("change"));
    assert.equal(again.w.document.documentElement.dataset.theme, "dark");
    again.click('#modal [data-action="cancel"]');
    await again.flush();
    assert.equal(again.saved.settings.theme, "dark");
  } finally {
    again.close();
  }
});

test("Home-screen trash button deletes without opening, supports Undo and restores from Trash", async () => {
  const h = await harness();
  try {
    await h.create();
    h.editor.commands.setContent(
      "<h1>Delete from home</h1><p>Keep this content</p>",
    );
    h.click('[data-action="drawer"]');
    h.click('[data-action="home"]');
    const row = h.w.document.querySelector("[data-doc]"),
      id = row.dataset.doc;
    h.click('[data-action="quicktrash:' + id + '"]');
    assert.equal(h.editor, undefined);
    assert.equal(h.w.document.querySelectorAll(".file").length, 0);
    assert.ok(h.w.document.querySelector("#trashNotice"));
    await h.flush();
    assert.equal(h.saved.documents[0].trash, true);
    h.click('[data-action="undotrash:' + id + '"]');
    assert.equal(h.w.document.querySelectorAll(".file").length, 1);
    h.click('[data-action="quicktrash:' + id + '"]');
    h.click('[data-action="trash"]');
    h.click('[data-action="restore:' + id + '"]');
    await h.flush();
    assert.equal(h.saved.documents[0].trash, false);
    assert.match(h.saved.documents[0].text, /Keep this content/);
  } finally {
    h.close();
  }
});

test("List movement, indentation, heading aliases and keyboard link dialog use live editor state", async () => {
  const h = await harness();
  try {
    await h.create();
    h.editor.commands.setContent(
      "<h1>Lists</h1><ul><li><p>First</p></li><li><p>Second</p></li></ul>",
    );
    const key = (key, code, mods = {}) =>
      h.editor.view.dom.dispatchEvent(
        new h.w.KeyboardEvent("keydown", {
          key,
          code,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
          ...mods,
        }),
      );
    let pos;
    h.editor.state.doc.descendants((n, p) => {
      if (n.isText && n.text === "Second") pos = p;
    });
    h.editor.commands.setTextSelection(pos);
    key("ArrowUp", "ArrowUp", { altKey: true });
    assert.ok(
      h.editor.getText().indexOf("Second") <
        h.editor.getText().indexOf("First"),
    );
    h.editor.commands.setTextSelection(1);
    key("¡", "Digit5", { altKey: true });
    assert.ok(h.editor.isActive("heading", { level: 5 }));
    assert.match(h.w.document.querySelector("#style").textContent, /Heading 5/);
    h.editor.commands.setContent("<h1>Links</h1><p>Example</p>");
    h.editor.state.doc.descendants((n, p) => {
      if (n.isText && n.text === "Example") pos = p;
    });
    h.editor.commands.setTextSelection({ from: pos, to: pos + 7 });
    key("k", "KeyK");
    h.input("#url", "https://quip.com/");
    h.w.document.querySelector("#url").dispatchEvent(
      new h.w.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    assert.match(h.editor.getHTML(), /href="https:\/\/quip.com\/"/);
  } finally {
    h.close();
  }
});

test("Typography previews can cancel, per-document presets persist, defaults affect only new documents", async () => {
  const h = await harness();
  let saved;
  try {
    await h.create();
    h.editor.commands.setContent(
      "<h1>First document</h1><p>Keep <strong>my content</strong>.</p>",
    );
    const initial = h.editor.getJSON();
    const typography = () => {
      h.click('[data-action="menu:Format"]');
      [...h.w.document.querySelectorAll(".popup button")]
        .find((b) => b.textContent.includes("Typography"))
        .click();
    };
    typography();
    assert.equal(h.w.document.querySelectorAll("[data-type]").length, 7);
    h.click('[data-type="manuscript"]');
    assert.ok(
      h.w.document
        .querySelector("article")
        .classList.contains("typ-manuscript"),
    );
    h.click('#modal [data-action="cancel"]');
    assert.ok(
      h.w.document.querySelector("article").classList.contains("typ-atlas"),
    );
    assert.deepEqual(h.editor.getJSON(), initial);
    typography();
    h.click('[data-type="modern"]');
    h.w.document.querySelector("#makeDefaultType").checked = true;
    h.click('[data-action="applytype"]');
    await h.flush();
    const first = h.saved.documents[0].id;
    assert.equal(h.saved.documents[0].typography, "modern");
    assert.equal(h.saved.settings.defaultTypography, "modern");
    await h.create();
    assert.ok(
      h.w.document.querySelector("article").classList.contains("typ-modern"),
    );
    typography();
    h.click('[data-type="byline"]');
    h.click('[data-action="applytype"]');
    await h.flush();
    assert.equal(
      h.saved.documents.find((d) => d.id === first).typography,
      "modern",
    );
    assert.equal(h.saved.documents[1].typography, "byline");
    saved = h.saved;
  } finally {
    h.close();
  }
  const again = await harness(saved);
  try {
    const id = saved.documents[1].id;
    again.click('[data-action="open:' + id + '"]');
    assert.ok(
      again.w.document
        .querySelector("article")
        .classList.contains("typ-byline"),
    );
    assert.equal(again.saved?.settings?.theme || "system", "system");
  } finally {
    again.close();
  }
});

test("Outline lists headings and top-level tasks, expands collapsed target sections, and sidebar pin survives navigation", async () => {
  const h = await harness();
  try {
    await h.create();
    h.editor.commands.setContent(
      '<h1>Project</h1><h2>Milestone</h2><p>Detail</p><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Top task</p><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Nested task</p></li></ul></li></ul>',
    );
    const labels = [...h.w.document.querySelectorAll("[data-outline-pos]")].map(
      (b) => b.textContent,
    );
    assert.ok(labels.includes("Milestone"));
    assert.ok(labels.some((t) => t.includes("Top task")));
    assert.ok(!labels.some((t) => t === "☐Nested task"));
    let pos;
    h.editor.state.doc.descendants((n, p) => {
      if (n.type.name === "heading" && n.textContent === "Milestone") pos = p;
    });
    h.editor.commands.setTextSelection(pos + 1);
    h.click("#sectionStyle");
    [...h.w.document.querySelectorAll(".popup button")]
      .find((b) => b.textContent.includes("Collapse / Expand"))
      .click();
    assert.ok(h.w.document.querySelector(".collapsed-hidden"));
    [...h.w.document.querySelectorAll("[data-outline-pos]")]
      .find((b) => b.textContent.includes("Top task"))
      .click();
    assert.equal(h.w.document.querySelectorAll(".collapsed-hidden").length, 0);
    h.click('[data-action="menu:View"]');
    [...h.w.document.querySelectorAll(".popup button")]
      .find((b) => b.textContent.includes("Always Show Sidebar"))
      .click();
    assert.ok(h.w.document.querySelector(".sidebar"));
    await h.create();
    assert.ok(h.w.document.querySelector(".sidebar"));
    await h.flush();
    assert.equal(h.saved.settings.sidebarPinned, true);
  } finally {
    h.close();
  }
});

test("History compares safe added/removed text and restores content and typography while retaining current checkpoint", async () => {
  const h = await harness();
  try {
    await h.create();
    h.editor.commands.setContent("<h1>History</h1><p>Earlier sentence.</p>");
    h.click('[data-action="menu:Document"]');
    [...h.w.document.querySelectorAll(".popup button")]
      .find((b) => b.textContent.includes("Save Checkpoint"))
      .click();
    h.click('#modal [data-action="cancel"]');
    await h.flush();
    const old = h.saved.documents[0].history.find(
      (v) => v.manual && JSON.stringify(v.content).includes("Earlier sentence"),
    );
    h.editor.commands.setContent("<h1>History</h1><p>Updated sentence.</p>");
    h.click('[data-action="menu:Document"]');
    [...h.w.document.querySelectorAll(".popup button")]
      .find((b) => b.textContent.includes("Document History"))
      .click();
    h.click('[data-action="version:' + old.id + '"]');
    assert.match(
      h.w.document.querySelector(".diffPreview del").textContent,
      /Earlier/,
    );
    assert.match(
      h.w.document.querySelector(".diffPreview ins").textContent,
      /Updated/,
    );
    h.click('[data-action="restoreversion"]');
    h.click('#modal [data-action="submit"]');
    assert.match(h.editor.getText(), /Earlier sentence/);
    await h.flush();
    assert.ok(
      h.saved.documents[0].history.some((v) =>
        JSON.stringify(v.content).includes("Updated sentence"),
      ),
    );
  } finally {
    h.close();
  }
});
