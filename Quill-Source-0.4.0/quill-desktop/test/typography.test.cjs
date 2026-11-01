const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
test("Offline font faces and their licenses are included in the built distribution", () => {
  const css = fs.readFileSync("dist/fonts.css", "utf8");
  for (const name of [
    "courier-prime",
    "source-sans-3",
    "source-serif-4",
    "literata",
    "dm-sans",
  ]) {
    const file = name + "-latin-400-normal.woff2";
    assert.ok(css.includes(file));
    assert.equal(
      fs.readFileSync(path.join("dist/fonts", file)).subarray(0, 4).toString(),
      "wOF2",
    );
    assert.ok(
      fs
        .readdirSync("dist/fonts")
        .some(
          (f) =>
            f.startsWith(name + "-") &&
            (f.endsWith("LICENSE") || f.endsWith("OFL.txt")),
        ),
    );
  }
});
