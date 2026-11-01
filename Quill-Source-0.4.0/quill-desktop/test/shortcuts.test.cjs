const { test } = require("node:test");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const vm = require("node:vm");
const ctx = { module: { exports: {} }, exports: {} };
ctx.exports = ctx.module.exports;
vm.runInNewContext(
  esbuild.buildSync({
    entryPoints: ["src/shortcuts.js"],
    bundle: true,
    write: false,
    format: "cjs",
  }).outputFiles[0].text,
  ctx,
);
const { shortcutFor } = ctx.module.exports;
test("physical keys resolve Windows Alt symbols, shifted digits, composition and input contexts", () => {
  assert.equal(
    shortcutFor(
      { key: "¡", code: "Digit1", ctrlKey: true, altKey: true },
      { editing: true },
    ),
    "cmd:h1",
  );
  assert.equal(
    shortcutFor(
      { key: "*", code: "Digit8", ctrlKey: true, shiftKey: true },
      { editing: true },
    ),
    "cmd:bullet",
  );
  assert.equal(
    shortcutFor(
      { key: "k", code: "KeyK", ctrlKey: true, shiftKey: true },
      { editing: true },
    ),
    "cmd:code",
  );
  assert.equal(
    shortcutFor(
      { key: "a", code: "KeyA", ctrlKey: true, shiftKey: true },
      { editing: false },
    ),
    "folders",
  );
  assert.equal(
    shortcutFor(
      { key: "a", code: "KeyA", ctrlKey: true, shiftKey: true },
      { editing: true },
    ),
    "copyanchor",
  );
  assert.equal(
    shortcutFor(
      { key: "b", ctrlKey: true, isComposing: true },
      { editing: true },
    ),
    null,
  );
  assert.equal(
    shortcutFor({ key: "b", ctrlKey: true }, { editing: true, typing: true }),
    null,
  );
  assert.equal(
    shortcutFor(
      { key: "b", ctrlKey: true, shiftKey: true, getModifierState: () => true },
      { editing: true },
    ),
    null,
  );
});
