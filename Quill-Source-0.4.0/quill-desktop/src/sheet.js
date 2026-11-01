import { Parser as FormulaParser } from "hot-formula-parser";
// Small, deterministic local formula engine. No eval, scripting, or external data.
export const columnName = (n) => {
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};
export function address(ref) {
  const m = /^([A-Z]+)([1-9]\d*)$/.exec(ref.toUpperCase().replaceAll("$", ""));
  if (!m) throw Error("#REF!");
  return [
    Number(m[2]) - 1,
    [...m[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1,
  ];
}
export function calculate(
  cells,
  ref,
  trail = new Set(),
  cache = new Map(),
  budget = { remaining: 10000 },
) {
  try {
    const [r, c] = address(ref);
    ref = columnName(c) + (r + 1);
    if (r >= cells.length || c >= (cells[0]?.length || 0)) return "#REF!";
    const raw = String(cells[r][c] ?? "");
    if (!raw.startsWith("="))
      return raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : raw;
    if (trail.has(ref)) return "#CYCLE!";
    if (cache.has(ref)) return cache.get(ref);
    if (--budget.remaining < 0) return "#NUM!";
    if (trail.size > 256) return "#REF!";
    const next = new Set(trail).add(ref);
    const parser = new FormulaParser();
    let fault = null;
    const read = (row, col) => {
      const value = calculate(
        cells,
        columnName(col) + (row + 1),
        next,
        cache,
        budget,
      );
      if (typeof value === "string" && value.startsWith("#")) {
        fault = value;
        return 0;
      }
      return value === "" ? null : value;
    };
    parser.on("callCellValue", (cell, done) =>
      done(read(cell.row.index, cell.column.index)),
    );
    parser.on("callRangeValue", (start, end, done) => {
      if (
        (end.row.index - start.row.index + 1) *
          (end.column.index - start.column.index + 1) >
        100000
      ) {
        fault = "#REF!";
        return done([]);
      }
      const range = [];
      for (let r = start.row.index; r <= end.row.index; r++) {
        const row = [];
        for (let c = start.column.index; c <= end.column.index; c++)
          row.push(read(r, c));
        range.push(row);
      }
      done(range);
    });
    const result = parser.parse(raw.slice(1));
    const value = fault || result.error || result.result;
    cache.set(ref, value);
    return value;
  } catch {
    return "#ERROR!";
  }
}
export function csv(cells) {
  return cells
    .map((row, r) =>
      row
        .map(
          (_, c) =>
            '"' +
            String(calculate(cells, columnName(c) + (r + 1))).replaceAll(
              '"',
              '""',
            ) +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
}
export function sheetView(cells, onChange, onExport) {
  let selected = [0, 0];
  const dom = document.createElement("div");
  dom.className = "sheet";
  dom.contentEditable = "false";
  function draw() {
    const memo = new Map();
    dom.replaceChildren();
    const bar = document.createElement("div");
    bar.className = "sheetbar";
    const addressLabel = document.createElement("b");
    addressLabel.textContent = "A1";
    const formula = document.createElement("input");
    formula.placeholder = "Value or formula, e.g. =SUM(A1:A5)";
    formula.setAttribute("aria-label", "Formula");
    const apply = () => {
      cells[selected[0]][selected[1]] = formula.value;
      onChange(cells.map((r) => [...r]));
      draw();
    };
    formula.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        apply();
      }
    };
    formula.onchange = apply;
    bar.append(addressLabel, formula);
    for (const [label, fn] of [
      ["+ Row", () => cells.push(Array(cells[0].length).fill(""))],
      ["+ Column", () => cells.forEach((r) => r.push(""))],
      [
        "− Row",
        () => {
          if (cells.length > 1) cells.splice(selected[0], 1);
        },
      ],
      [
        "− Column",
        () => {
          if (cells[0].length > 1)
            cells.forEach((r) => r.splice(selected[1], 1));
        },
      ],
    ]) {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = () => {
        fn();
        selected = [0, 0];
        onChange(cells.map((r) => [...r]));
        draw();
      };
      bar.append(b);
    }
    if (onExport) {
      const b = document.createElement("button");
      b.textContent = "Export CSV";
      b.onclick = () => onExport(csv(cells));
      bar.append(b);
    }
    dom.append(bar);
    const scroll = document.createElement("div");
    scroll.className = "sheet-scroll";
    const table = document.createElement("table"),
      head = document.createElement("tr");
    for (let c = -1; c < cells[0].length; c++) {
      const th = document.createElement("th");
      th.textContent = c < 0 ? "" : columnName(c);
      head.append(th);
    }
    table.append(head);
    cells.forEach((row, r) => {
      const tr = document.createElement("tr"),
        th = document.createElement("th");
      th.textContent = r + 1;
      tr.append(th);
      row.forEach((raw, c) => {
        const td = document.createElement("td"),
          input = document.createElement("input");
        input.setAttribute("aria-label", columnName(c) + (r + 1));
        input.value = calculate(
          cells,
          columnName(c) + (r + 1),
          new Set(),
          memo,
        );
        input.onfocus = () => {
          selected = [r, c];
          input.value = cells[r][c];
          formula.value = cells[r][c];
          addressLabel.textContent = columnName(c) + (r + 1);
        };
        input.onchange = () => {
          cells[r][c] = input.value;
          onChange(cells.map((r) => [...r]));
        };
        input.onblur = () => {
          draw();
        };
        input.onkeydown = (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            input.blur();
            const inputs = dom.querySelectorAll("td input");
            inputs[
              Math.min((r + 1) * cells[0].length + c, inputs.length - 1)
            ]?.focus();
          }
        };
        input.onpaste = (e) => {
          const text = e.clipboardData.getData("text/plain");
          if (!text.includes("\t") && !text.includes("\n")) return;
          e.preventDefault();
          const rows = text
            .replace(/\r/g, "")
            .trimEnd()
            .split("\n")
            .map((x) => x.split("\t"));
          rows.forEach((row, rr) =>
            row.forEach((value, cc) => {
              while (cells.length <= r + rr)
                cells.push(Array(cells[0].length).fill(""));
              while (cells[0].length <= c + cc)
                cells.forEach((x) => x.push(""));
              cells[r + rr][c + cc] = value;
            }),
          );
          onChange(cells.map((r) => [...r]));
          draw();
        };
        td.append(input);
        tr.append(td);
      });
      table.append(tr);
    });
    scroll.append(table);
    dom.append(scroll);
  }
  draw();
  return dom;
}
