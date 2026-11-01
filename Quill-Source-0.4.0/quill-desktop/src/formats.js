import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ExternalHyperlink,
  AlignmentType,
} from "docx";
import mammoth from "mammoth/mammoth.browser.js";
import ExcelJS from "exceljs";
import MarkdownIt from "markdown-it";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
const md = new MarkdownIt({ html: false, linkify: false });
const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});
td.use(gfm);
export const markdownToHTML = (text) => md.render(text);
export const htmlToMarkdown = (html) => td.turndown(html);
export async function readDocx(bytes) {
  return (await mammoth.convertToHtml({ arrayBuffer: bytes })).value;
}
function inlines(nodes = []) {
  return nodes.flatMap((n) => {
    if (n.type === "text") {
      const marks = n.marks || [],
        link = marks.find((m) => m.type === "link");
      const options = {
        text: n.text,
        bold: marks.some((m) => m.type === "bold"),
        italics: marks.some((m) => m.type === "italic"),
        underline: marks.some((m) => m.type === "underline") ? {} : undefined,
        strike: marks.some((m) => m.type === "strike"),
        subScript: marks.some((m) => m.type === "subscript"),
        superScript: marks.some((m) => m.type === "superscript"),
      };
      const color = marks.find((m) => m.type === "textStyle")?.attrs?.color;
      if (/^#[0-9a-f]{6}$/i.test(color || "")) options.color = color.slice(1);
      if (marks.some((m) => m.type === "code")) options.font = "Consolas";
      const run = new TextRun(options);
      return link && /^https?:|^mailto:/i.test(link.attrs.href)
        ? [new ExternalHyperlink({ link: link.attrs.href, children: [run] })]
        : [run];
    }
    if (n.type === "hardBreak") return [new TextRun({ break: 1 })];
    if (n.type === "chip")
      return [new TextRun({ text: n.attrs.label, color: "4477AA" })];
    return [];
  });
}
function blocks(nodes = [], depth = 0, listKind = null) {
  return nodes.flatMap((n) => {
    if (n.type === "paragraph" || n.type === "heading") {
      const alignment = {
        left: AlignmentType.LEFT,
        center: AlignmentType.CENTER,
        right: AlignmentType.RIGHT,
        justify: AlignmentType.JUSTIFIED,
      }[n.attrs?.textAlign];
      const options = {
        children: inlines(n.content),
        spacing: { after: 160 },
        alignment,
      };
      if (n.type === "heading")
        options.heading =
          HeadingLevel["HEADING_" + n.attrs.level] || HeadingLevel.HEADING_1;
      if (listKind === "bullet") options.bullet = { level: Math.min(8, depth) };
      if (listKind === "number")
        options.numbering = {
          reference: "numbered",
          level: Math.min(8, depth),
        };
      return [new Paragraph(options)];
    }
    if (["bulletList", "orderedList", "taskList"].includes(n.type)) {
      const kind =
        n.type === "orderedList"
          ? "number"
          : n.type === "taskList"
            ? "task"
            : "bullet";
      return (n.content || []).flatMap((li) => {
        const children = structuredClone(li.content || []);
        if (kind === "task" && children[0]?.type === "paragraph")
          children[0].content = [
            { type: "text", text: li.attrs?.checked ? "☑ " : "☐ " },
            ...(children[0].content || []),
          ];
        return blocks(children, depth, kind === "task" ? null : kind);
      });
    }
    if (n.type === "codeBlock")
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: (n.content || []).map((x) => x.text || "").join(""),
              font: "Consolas",
            }),
          ],
          shading: { fill: "F1F1F1" },
          spacing: { after: 200 },
        }),
      ];
    if (n.type === "blockquote" || n.type === "pullQuote")
      return blocks(n.content, depth).map((p) => p);
    if (n.type === "horizontalRule")
      return [
        new Paragraph({
          text: "────────────────────────",
          spacing: { after: 200 },
        }),
      ];
    if (n.type === "table")
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: (n.content || []).map(
            (row) =>
              new TableRow({
                children: (row.content || []).map(
                  (cell) => new TableCell({ children: blocks(cell.content) }),
                ),
              }),
          ),
        }),
      ];
    if (n.type === "columns" || n.type === "column")
      return blocks(n.content, depth);
    if (n.type === "image") {
      const match = /^data:image\/(png|jpeg|gif|bmp);base64,(.+)$/s.exec(
        n.attrs.src || "",
      );
      if (match) {
        const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
        return [
          new Paragraph({
            children: [
              new ImageRun({
                type: match[1] === "jpeg" ? "jpg" : match[1],
                data: bytes,
                transformation: {
                  width: n.attrs.exportWidth || 500,
                  height: n.attrs.exportHeight || 300,
                },
              }),
            ],
          }),
        ];
      }
      return [
        new Paragraph({
          text:
            "[Image: " +
            (n.attrs.alt || n.attrs.title || "embedded image") +
            "]",
        }),
      ];
    }
    if (n.type === "fileAttachment" || n.type === "videoAttachment")
      return [new Paragraph({ text: "[Attachment: " + n.attrs.name + "]" })];
    if (n.type === "spreadsheet")
      return [
        new Table({
          rows: n.attrs.cells.map(
            (row) =>
              new TableRow({
                children: row.map(
                  (value) =>
                    new TableCell({
                      children: [new Paragraph({ text: String(value) })],
                    }),
                ),
              }),
          ),
        }),
      ];
    return blocks(n.content || [], depth);
  });
}
export async function writeDocx(content, title) {
  content = structuredClone(content);
  const images = [];
  const walk = (n) => {
    if (n.type === "image") images.push(n);
    for (const c of n.content || []) walk(c);
  };
  walk(content);
  if (typeof Image !== "undefined")
    await Promise.all(
      images.map(
        (n) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const scale = Math.min(1, 600 / img.naturalWidth);
              n.attrs.exportWidth = Math.round(img.naturalWidth * scale);
              n.attrs.exportHeight = Math.round(img.naturalHeight * scale);
              if (n.attrs.src.startsWith("data:image/webp")) {
                const c = globalThis.document.createElement("canvas");
                c.width = img.naturalWidth;
                c.height = img.naturalHeight;
                c.getContext("2d").drawImage(img, 0, 0);
                n.attrs.src = c.toDataURL("image/png");
              }
              resolve();
            };
            img.onerror = resolve;
            img.src = n.attrs.src;
          }),
      ),
    );
  const document = new Document({
    title,
    creator: "Quill",
    numbering: {
      config: [
        {
          reference: "numbered",
          levels: Array.from({ length: 9 }, (_, level) => ({
            level,
            format: "decimal",
            text: "%" + (level + 1) + ".",
            alignment: "left",
            style: {
              paragraph: { indent: { left: 720 * (level + 1), hanging: 260 } },
            },
          })),
        },
      ],
    },
    sections: [{ children: blocks(content.content) }],
  });
  return (await Packer.toBlob(document)).arrayBuffer();
}
export async function writeXlsx(cells, title) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(
    title.replace(/[\\/*?:\[\]]/g, " ").slice(0, 31) || "Sheet1",
  );
  cells.forEach((row, r) =>
    row.forEach((raw, c) => {
      const s = String(raw ?? "");
      sheet.getCell(r + 1, c + 1).value = s.startsWith("=")
        ? { formula: s.slice(1) }
        : s !== "" && Number.isFinite(Number(s))
          ? Number(s)
          : s;
    }),
  );
  sheet.columns.forEach((col) => (col.width = 18));
  return workbook.xlsx.writeBuffer();
}
export async function readXlsx(bytes) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes);
  const sheet = book.worksheets[0];
  if (!sheet) throw Error("No worksheets in file");
  const rows = Math.max(20, sheet.rowCount),
    cols = Math.max(8, sheet.columnCount);
  if (rows * cols > 100000)
    throw Error("Worksheet exceeds 100,000-cell import limit");
  const cells = Array.from({ length: rows }, () => Array(cols).fill(""));
  sheet.eachRow((row, r) =>
    row.eachCell((cell, c) => {
      const v = cell.value;
      cells[r - 1][c - 1] =
        v && typeof v === "object"
          ? v.formula
            ? "=" + v.formula
            : v.richText
              ? v.richText.map((x) => x.text).join("")
              : v.text || String(v.result ?? "")
          : String(v ?? "");
    }),
  );
  return { title: sheet.name, cells };
}
export function csvToCells(text) {
  const rows = [[]];
  let value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      rows.at(-1).push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      rows.at(-1).push(value);
      rows.push([]);
      value = "";
    } else value += c;
  }
  if (value || rows.at(-1).length) rows.at(-1).push(value);
  else if (rows.length > 1) rows.pop();
  const cols = Math.max(1, ...rows.map((r) => r.length));
  return rows.map((r) => [...r, ...Array(cols - r.length).fill("")]);
}
