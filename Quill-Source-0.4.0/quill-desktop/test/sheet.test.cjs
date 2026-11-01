const { test } = require("node:test");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const vm = require("node:vm");
const source = esbuild.buildSync({
  entryPoints: ["src/sheet.js"],
  bundle: true,
  write: false,
  format: "cjs",
}).outputFiles[0].text;
const context = { module: { exports: {} }, exports: {} };
context.exports = context.module.exports;
vm.runInNewContext(source, context);
const { calculate, columnName, csv } = context.module.exports;
test("spreadsheet references, ranges, functions and arithmetic", () => {
  const cells = [
    ["10", "20", "=SUM(A1:B1)"],
    ["5", "=AVERAGE(A1:A2)", "=C1*2+ROUND(B2,0)"],
  ];
  assert.equal(calculate(cells, "C1"), 30);
  assert.equal(calculate(cells, "B2"), 7.5);
  assert.equal(calculate(cells, "C2"), 68);
  assert.equal(columnName(26), "AA");
  assert.equal(calculate([["12", '=IF(A1>10,\"yes\",\"no\")']], "B1"), "yes");
  assert.equal(calculate([["5", "6", '=COUNTIF(A1:B1,\">5\")']], "C1"), 1);
  assert.equal(calculate([["=SUM(A1:A1)"]], "A1"), "#CYCLE!");
  assert.equal(calculate([["=1/0"]], "A1"), "#DIV/0!");
  assert.equal(calculate([["=Z99"]], "A1"), "#REF!");
  assert.equal(calculate([["=process.exit()"]], "A1"), "#NAME?");
  assert.equal(csv([['a,"b']]), '"a,""b"');
});
