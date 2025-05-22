import {webfont} from "webfont";
import fs from "fs-extra";
import { globby } from "globby";
import path from "path";
import ejs from "ejs";
import { fileURLToPath } from "url";

// Para __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas
const SVG_DIR = path.resolve(__dirname, "../svg");
const DIST_DIR = path.resolve(__dirname, "../dist");
const PREVIEW_TEMPLATE = path.resolve(__dirname, "../templates/preview.ejs");

const FONT_NAME = "scout-icon-webfont";
const CLASS_PREFIX = "";

(async () => {
  try {
    await fs.emptyDir(DIST_DIR);

    const files = await globby("**/*.svg", { cwd: SVG_DIR, absolute: true });

    const result = await webfont({
      files,
      fontName: FONT_NAME,
      formats: ["woff2", "woff", "ttf", "eot", "svg"],
      normalize: true,
      fontHeight: 1000,
      descent: 200,
      template: "css",
      templateClassName: CLASS_PREFIX,
      templateFontPath: "./", // fuentes en la misma carpeta que el css
      glyphTransformFn: (obj) => {
        const name = path.basename(obj.path, ".svg").replace(/\s+/g, "-");
        obj.name = name;
        return obj;
      },
    });

    // Guardar fuentes
    await Promise.all(
      Object.entries(result).map(async ([type, content]) => {
        if (["glyphsData", "usedBuildInTemplate"].includes(type)) return;
        if (typeof content !== "string" && !Buffer.isBuffer(content)) return;
        const ext = type === "svg" ? "svg" : type;
        await fs.writeFile(path.join(DIST_DIR, `${FONT_NAME}.${ext}`), content);
      })
    );

    // Guardar CSS
    await fs.writeFile(path.join(DIST_DIR, `${FONT_NAME}.css`), result.template);

    // Preparar datos para HTML
    const glyphs = result.glyphsData.map((glyph) => ({
      className: `${CLASS_PREFIX}-${glyph.metadata.name}`,
      name: glyph.metadata.name,
    }));

    const html = await ejs.renderFile(PREVIEW_TEMPLATE, {
      fontName: FONT_NAME,
      cssPath: `./${FONT_NAME}.css`, // relativo dentro de dist
      glyphs,
    });

    await fs.writeFile(path.join(DIST_DIR, "index.html"), html);

    console.log("✅ Icon font generado correctamente en /dist");
  } catch (err) {
    console.error("❌ Error generando el font:", err);
  }
})();
