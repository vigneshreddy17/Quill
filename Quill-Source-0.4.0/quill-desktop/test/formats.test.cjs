const { test } = require("node:test");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quill-format-"));
const out = path.join(dir, "formats.cjs");
esbuild.buildSync({
  entryPoints: ["src/formats.js"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: out,
  logLevel: "silent",
});
const { writeDocx, readDocx, writeXlsx, readXlsx, csvToCells } = require(out);
test("DOCX export creates a valid Word package containing content", async () => {
  const bytes = await writeDocx(
    {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Project" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Important", marks: [{ type: "bold" }] },
          ],
        },
      ],
    },
    "Project",
  );
  const data = Buffer.from(bytes);
  assert.equal(data.subarray(0, 2).toString(), "PK");
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(data);
  const xml = await zip.file("word/document.xml").async("string");
  assert.match(xml, /Important/);
  assert.match(xml, /Heading1/);
  const html = await readDocx(bytes);
  assert.match(html, /<strong>Important<\/strong>/);
});
test("XLSX import/export preserves values and formulas; CSV handles quotes/newlines", async () => {
  const bytes = await writeXlsx(
    [
      ["Price", "Qty", "Total"],
      ["12", "3", "=A2*B2"],
    ],
    "Budget",
  );
  const result = await readXlsx(bytes);
  assert.equal(result.title, "Budget");
  assert.equal(result.cells[1][2], "=A2*B2");
  assert.equal(result.cells[1][0], "12");
  assert.deepEqual(
    csvToCells('Name,Note\r\nV,"hello, world"\r\nX,"two\nlines"'),
    [
      ["Name", "Note"],
      ["V", "hello, world"],
      ["X", "two\nlines"],
    ],
  );
});
