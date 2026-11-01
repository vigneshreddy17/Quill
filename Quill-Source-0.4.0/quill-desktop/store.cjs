const fs = require("node:fs");
const path = require("node:path");
function validate(data) {
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.documents) ||
    !Array.isArray(data.folders)
  )
    throw Error("Invalid workspace");
  const ids = new Set();
  for (const d of data.documents) {
    if (
      !d ||
      typeof d.id !== "string" ||
      typeof d.title !== "string" ||
      d.content?.type !== "doc" ||
      !Array.isArray(d.content.content) ||
      ids.has(d.id)
    )
      throw Error("Invalid or duplicate document");
    ids.add(d.id);
  }
  return data;
}
class Store {
  constructor(file) {
    this.file = file;
  }
  load() {
    if (!fs.existsSync(this.file))
      return { documents: [], folders: [], version: 1 };
    return validate(JSON.parse(fs.readFileSync(this.file, "utf8")));
  }
  save(data) {
    validate(data);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temp = this.file + ".tmp";
    const handle = fs.openSync(temp, "w");
    try {
      fs.writeFileSync(handle, JSON.stringify(data), "utf8");
      fs.fsyncSync(handle);
    } finally {
      fs.closeSync(handle);
    }
    if (fs.existsSync(this.file))
      fs.copyFileSync(this.file, this.file + ".bak");
    fs.renameSync(temp, this.file);
    return true;
  }
}
module.exports = { Store };
