import * as path from "https://deno.land/std@0.90.0/path/mod.ts";

import * as fs from "./util/fs.ts";
import { getRelatedFilePath } from "./util/paths.ts";

console.log("Root dir:", Deno.args[0]);
const trashPath = path.join(Deno.args[0], "_trash");

for await (const file of fs.expandGlob("**/*.json", {
  root: Deno.args[0],
  includeDirs: false,
})) {
  const relatedName = getRelatedFilePath(file.name);

  const trashed = path.join(trashPath, relatedName);
  const restored = path.join(path.dirname(file.path), relatedName);
  if (fs.existsSync(trashed) && !fs.existsSync(restored)) {
    console.log("Moving", trashed, "->", restored);
    await fs.move(trashed, restored);
  }
}
