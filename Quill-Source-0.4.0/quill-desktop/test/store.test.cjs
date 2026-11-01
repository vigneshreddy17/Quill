const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Store } = require("../store.cjs");
test("atomic save roundtrip, previous backup and rejected schema preserve data", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quill-"));
  try {
    const file = path.join(dir, "workspace.json"),
      store = new Store(file);
    assert.deepEqual(store.load(), { documents: [], folders: [], version: 1 });
    const a = {
      documents: [
        { id: "a", title: "A", content: { type: "doc", content: [] } },
      ],
      folders: [],
      version: 1,
    };
    store.save(a);
    assert.deepEqual(new Store(file).load(), a);
    const b = {
      ...a,
      documents: [
        { id: "b", title: "B", content: { type: "doc", content: [] } },
      ],
    };
    store.save(b);
    assert.deepEqual(JSON.parse(fs.readFileSync(file + ".bak")), a);
    assert.deepEqual(store.load(), b);
    assert.throws(() => store.save({}));
    assert.deepEqual(store.load(), b);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("corrupt workspace is reported without overwriting", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quill-"));
  try {
    const file = path.join(dir, "workspace.json");
    fs.writeFileSync(file, "bad");
    assert.throws(() => new Store(file).load());
    assert.equal(fs.readFileSync(file, "utf8"), "bad");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
