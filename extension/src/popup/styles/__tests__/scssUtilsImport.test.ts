import fs from "fs";
import path from "path";

/**
 * Sass does not error on an unknown function -- `pxToRem(14px)` is valid CSS
 * syntax, so it is passed straight through to the bundle and the browser then
 * discards the whole declaration. A stylesheet that uses a helper from
 * utils.scss without `@use`-ing it therefore fails silently, at runtime, with
 * a green build. This has shipped twice.
 */
const UTILS = path.join(__dirname, "..", "utils.scss");
const SRC = path.join(__dirname, "..", "..", "..");

const helpers = Array.from(
  fs.readFileSync(UTILS, "utf8").matchAll(/@(?:function|mixin)\s+([\w-]+)/g),
).map((m) => m[1]);

const scssFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return scssFiles(full);
    return entry.isFile() && full.endsWith(".scss") ? [full] : [];
  });

describe("scss utils imports", () => {
  it("finds the helpers to check for", () => {
    expect(helpers).toEqual(
      expect.arrayContaining([
        "pxToRem",
        "removePxUnit",
        "native-like-outline",
      ]),
    );
  });

  it("every stylesheet using a utils helper also @use-s utils.scss", () => {
    const offenders: string[] = [];

    for (const file of scssFiles(SRC)) {
      if (path.resolve(file) === path.resolve(UTILS)) continue;

      const contents = fs.readFileSync(file, "utf8");
      if (contents.includes("utils.scss")) continue;

      const used = helpers.filter((helper) =>
        // `@include name` for mixins, `name(` for functions.
        new RegExp(`(?:@include\\s+${helper}\\b|\\b${helper}\\s*\\()`).test(
          contents,
        ),
      );

      if (used.length) {
        offenders.push(`${path.relative(SRC, file)} uses ${used.join(", ")}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
