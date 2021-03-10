import * as path from "https://deno.land/std@0.90.0/path/mod.ts";

/**
 * Returns the image path for a given metadata JSON filename
 */
export const getRelatedFilePath = (originalPath: string) => {
  const dirName = path.dirname(originalPath);
  const fileName = path.basename(originalPath).replace(".json", "");

  const match = fileName.match(/\.(.+?)(\(\d+\))$/);
  if (!match) {
    return path.join(dirName, fileName);
  }

  const [end, ext, number] = match;
  const corrected = `${fileName.replace(end, "")}${number}.${ext}`;
  return path.join(dirName, corrected);
};
