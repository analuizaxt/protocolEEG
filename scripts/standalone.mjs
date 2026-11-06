import { readFile, writeFile, rm, rmdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const entry = path.join(dist, "src/index.html");
let html = await readFile(entry, "utf8");

function assetPath(url) {
  if (!url.startsWith("../assets/")) throw new Error(`Arquivo inesperado no pacote: ${url}`);
  const target = path.resolve(path.dirname(entry), url);
  if (!target.startsWith(dist + path.sep)) throw new Error("Caminho de arquivo inválido");
  return target;
}
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
if (scripts.length !== 1) throw new Error("A versão local requer um único pacote de JavaScript.");
for (const [tag, url] of scripts) {
  const js = await readFile(assetPath(url), "utf8");
  // This application has no split/dynamic modules; fail rather than ship a broken file.
  if (/\bimport\s*(?:\(|["'{*])/.test(js))
    throw new Error("O pacote contém imports externos; revise a versão local.");
  html = html.replace(
    tag,
    () => `<script type="module">${js.replace(/<\/script/gi, "<\\/script")}</script>`,
  );
}
const styles = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g)];
if (!styles.length) throw new Error("Estilos compilados não encontrados.");
for (const [tag, url] of styles) {
  const css = await readFile(assetPath(url), "utf8");
  html = html.replace(tag, () => `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`);
}
const icon = await readFile(path.join(root, "public/favicon.png"));
html = html.replace(
  /<link\b[^>]*\brel="icon"[^>]*>/,
  `<link rel="icon" type="image/png" href="data:image/png;base64,${icon.toString("base64")}">`,
);
await writeFile(path.join(dist, "index.html"), html);
await writeFile(path.join(root, "index.html"), html);
await rm(entry);
await rmdir(path.dirname(entry));
console.log(
  "Versão pronta: index.html e dist/index.html (JavaScript, estilos e imagens incorporados).",
);
