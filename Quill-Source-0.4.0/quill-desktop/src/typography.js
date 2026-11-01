export const typographyThemes = [
  {
    id: "lightning",
    name: "Lightning",
    description: "Compact type based on the current Quip interface.",
    heading: "Salesforce Sans Web",
    body: "Salesforce Sans Web",
    fallback: "Source Sans 3",
  },
  {
    id: "arial",
    name: "Arial",
    description: "A familiar system sans-serif document.",
    heading: "Arial",
    body: "Arial",
    fallback: "Source Sans 3 if Arial is unavailable",
  },
  {
    id: "atlas",
    name: "Atlas",
    description: "Sans-serif headings with a serif reading face.",
    heading: "Atlas Grotesk",
    body: "Lyon Text",
    fallback: "Source Sans 3 + Literata",
  },
  {
    id: "modern",
    name: "Modern",
    description: "A clean sans-serif document throughout.",
    heading: "Neue Haas Grotesk",
    body: "Neue Haas Grotesk",
    fallback: "Source Sans 3",
  },
  {
    id: "byline",
    name: "Byline",
    description: "A serif editorial treatment.",
    heading: "Publico",
    body: "Publico",
    fallback: "Source Serif 4",
  },
  {
    id: "marseilles",
    name: "Marseilles",
    description: "An informal sans-serif treatment.",
    heading: "Duplicate Sans",
    body: "Duplicate Sans",
    fallback: "DM Sans",
  },
  {
    id: "manuscript",
    name: "Manuscript",
    description: "Monospaced text with centered headings.",
    heading: "Courier Prime",
    body: "Courier Prime",
    fallback: "Bundled Courier Prime",
  },
];
export function normalizeTypography(value) {
  const aliases = { sans: "modern", serif: "byline", mono: "manuscript" };
  const id = aliases[value] || value;
  return typographyThemes.some((t) => t.id === id) ? id : "atlas";
}
export function themeInfo(value) {
  return typographyThemes.find((t) => t.id === normalizeTypography(value));
}
export const fontPackages = [
  ["courier-prime", "Quill Courier Prime"],
  ["source-sans-3", "Quill Source Sans"],
  ["source-serif-4", "Quill Source Serif"],
  ["literata", "Quill Literata"],
  ["dm-sans", "Quill DM Sans"],
];
