const fs = require("node:fs"),
  path = require("node:path");
for (const name of ["index.html", "style.css", "themes.css"])
  fs.copyFileSync("src/" + name, "dist/" + name);
if (fs.existsSync("dist/meta.json")) {
  const meta = JSON.parse(fs.readFileSync("dist/meta.json"));
  const packages = new Set();
  for (const input of Object.keys(meta.inputs)) {
    const parts = input.split("/");
    const idx = parts.lastIndexOf("node_modules");
    if (idx < 0) continue;
    packages.add(
      parts
        .slice(0, idx + 1 + (parts[idx + 1].startsWith("@") ? 2 : 1))
        .join("/"),
    );
  }
  let text =
    "Quill third-party notices\nThe application bundle includes code from the following open-source packages. Electron/Chromium notices are supplied separately with the Windows distribution.\n\n";
  for (const dir of [...packages].sort()) {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json")));
    text +=
      "\n===== " +
      pkg.name +
      " " +
      pkg.version +
      " (" +
      (pkg.license || "see package") +
      ") =====\n";
    const files = fs
      .readdirSync(dir)
      .filter((f) => /^(license|licence|copying|notice)(\.|$)/i.test(f));
    for (const f of files) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isFile()) text += fs.readFileSync(p, "utf8") + "\n";
    }
    if (!files.length)
      text +=
        "Source: " +
        (pkg.homepage || JSON.stringify(pkg.repository) || pkg.name) +
        "\n";
  }
  fs.writeFileSync("dist/THIRD_PARTY_NOTICES.txt", text);
}
const fonts = [
  ["courier-prime", "Quill Courier Prime"],
  ["source-sans-3", "Quill Source Sans"],
  ["source-serif-4", "Quill Source Serif"],
  ["literata", "Quill Literata"],
  ["dm-sans", "Quill DM Sans"],
];
fs.mkdirSync("dist/fonts", { recursive: true });
let css = "";
for (const [id, family] of fonts) {
  const dir = path.join("node_modules", "@fontsource", id);
  for (const weight of [400, 600, 700])
    for (const style of ["normal", "italic"]) {
      const filename = `${id}-latin-${weight}-${style}.woff2`;
      const source = path.join(dir, "files", filename);
      if (!fs.existsSync(source)) continue;
      fs.copyFileSync(source, path.join("dist/fonts", filename));
      css += `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:swap;src:url("fonts/${filename}") format("woff2")}\n`;
    }
  for (const file of ["LICENSE", "OFL.txt"])
    if (fs.existsSync(path.join(dir, file)))
      fs.copyFileSync(
        path.join(dir, file),
        path.join("dist/fonts", id + "-" + file),
      );
}
fs.writeFileSync("dist/fonts.css", css);
fs.copyFileSync("src/typography.css", "dist/typography.css");
