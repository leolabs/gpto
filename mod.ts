import * as path from "https://deno.land/std@0.90.0/path/mod.ts";
import * as colors from "https://deno.land/std@0.90.0/fmt/colors.ts";

import formatDate from "https://deno.land/x/date_fns@v2.15.0/format/index.js";
import ProgressBar from "https://deno.land/x/progress@v1.2.3/mod.ts";
import pMap from "https://cdn.skypack.dev/p-map@5.0.0";

import { MetadataFile } from "./types/metadata.ts";
import { exifToolInstalled, getExifData, getMimeType } from "./util/exif.ts";
import * as fs from "./util/fs.ts";
import { exec } from "./util/cli.ts";
import { ensurePermissions } from "./util/permissions.ts";
import { getRelatedFilePath } from "./util/paths.ts";
import { args } from "./util/args.ts";

const rootDir: string | undefined = args._[0];
const dryRun = args.dryRun;

if (!rootDir) {
  console.error("No directory set. Please pass one to the script.");
  Deno.exit(1);
}

if (dryRun) {
  console.log("Processing in dry run mode. No changes will be made.");
}

if (!(await ensurePermissions(rootDir, !dryRun))) {
  console.error("The script doesn't have enough permissions to run.");
  Deno.exit(1);
}

if (!(await exifToolInstalled())) {
  console.error("You need to have exiftool installed for this script to work.");
  console.log(
    "If you have brew installed, run",
    colors.bold("brew install exiftool")
  );
}

// Make a trash folder
let trashPath: string | null = null;
if (!args.dryRun && args.removeLiveVideo) {
  trashPath = path.join(rootDir, "_trash");
  await fs.ensureDir(trashPath);
}

// Cleanup stray exiftool tmp files
const tmpFiles = fs.expandGlob("**/*_exiftool_tmp", {
  root: rootDir,
  includeDirs: false,
});

for await (const file of tmpFiles) {
  await Deno.remove(file.path);
}

console.log("Getting all files...");

// Check for metadata files
const jsonFiles = Array.from(
  fs.expandGlobSync("**/*.json", {
    root: rootDir,
    includeDirs: false,
  })
);

const filesWithMetadata = new Set();
const filesWithErrors = new Map<string, string>();

console.log("Found", jsonFiles.length, "metadata files.");

const progress = new ProgressBar({
  width: 1000,
  total: jsonFiles.length,
  title: "Processing files",
});

let completed = 0;
const complete = () => progress.render(++completed);

const processFile = async (file: fs.WalkEntry) => {
  let relatedFilePath = getRelatedFilePath(file.path);
  const niceFileName = path.basename(relatedFilePath);

  const log = (...args: string[]) => {
    progress.console(`[${niceFileName}] ${args.join(" ")}`);
  };

  const error = (...args: string[]) => {
    progress.console(colors.red(`[${niceFileName}] ${args.join(" ")}`));
  };

  try {
    if (!(await fs.exists(relatedFilePath))) {
      const originalPath = relatedFilePath;
      // Maybe we have already renamed the file in a process before
      relatedFilePath += ".jpg";
      if (!(await fs.exists(relatedFilePath))) {
        relatedFilePath = originalPath;
        complete();
        args.verbose && error("File", relatedFilePath, "doesn't exist.");
        return;
      }
    }

    const dirName = path.dirname(relatedFilePath);
    const fileName = path.basename(relatedFilePath);
    const extension = path.extname(relatedFilePath);

    const mimeType = await getMimeType(relatedFilePath);
    if (
      mimeType === "image/jpeg" &&
      ![".jpg", ".jpeg"].includes(extension.toLowerCase())
    ) {
      log("claims to be a", extension, "but it's actually a JPG. Renaming...");

      if (!dryRun) {
        const newPath = path.join(dirName, `${fileName}.jpg`);
        await fs.move(relatedFilePath, newPath);
        relatedFilePath = newPath;
      }
    }

    const metadata: MetadataFile = JSON.parse(
      await Deno.readTextFile(file.path)
    );
    const exifData = await getExifData(relatedFilePath);
    const newExifValues: string[] = [];

    const parsedDate = Date.parse(metadata.photoTakenTime.formatted);
    const newDate = formatDate(parsedDate, "yyyy-MM-dd HH:mm:ssXXX", {});

    const touchDate = formatDate(parsedDate, "yyyyMMddHHmm.ss", {});
    await exec(["touch", "-c", "-t", touchDate, relatedFilePath]);

    // Fix missing timestamps with information from Google Photos
    if (
      !exifData.dateTimeOriginal &&
      !exifData.quickTimeCreateDate &&
      !exifData.keysCreationDate
    ) {
      args.verbose && log(`Setting original date to ${newDate}...`);

      if ([".mp4", ".m4v", ".mov"].includes(extension.toLowerCase())) {
        args.verbose && log("Setting movie date to", newDate);
        newExifValues.push(`-Keys:CreationDate=${newDate}`);
        newExifValues.push(`-QuickTime:CreateDate=${newDate}`);
      } else {
        newExifValues.push(`-DateTimeOriginal=${newDate}`);
      }

      if (Deno.build.os !== "linux") {
        newExifValues.push(`-FileCreateDate=${newDate}`);
      }
    }

    // Set createDate only if we modify the file anyway,
    // because it's not super important
    if (!exifData.dateTimeOriginal && !exifData.createDate) {
      const newDate = formatDate(
        Date.parse(metadata.creationTime.formatted),
        "yyyy-MM-dd HH:mm:ssXXX",
        {}
      );
      args.verbose && log(`Setting create date to ${newDate}...`);
      newExifValues.push(`-CreateDate=${newDate}`);
    }

    // Add missing GPS information
    if (
      !exifData.gpsLatutide &&
      !exifData.gpsLongitude &&
      metadata.geoData.latitude
    ) {
      args.verbose && log("Adding GPS data");
      newExifValues.push(`-GPSLatitude=${metadata.geoData.latitude}`);
      newExifValues.push(`-GPSLongitude=${metadata.geoData.longitude}`);
      newExifValues.push(`-GPSAltitude=${metadata.geoData.altitude}`);
    }

    // Add people tagged in Google Photos
    if (metadata.people && args.people) {
      const names = metadata.people.map((p) => p.name);
      args.verbose && log("Adding people keywords:", names.join(", "));

      for (const person of names) {
        // Remove and re-add to avoid duplicates
        newExifValues.push(`-Keywords-=${person}`);
        newExifValues.push(`-Keywords+=${person}`);
      }
    }

    // If there are any changes, write them to the file
    if (newExifValues.length) {
      args.verbose && log("Changes:", newExifValues.join(" "));

      if (!dryRun) {
        try {
          const result = await exec([
            "exiftool",
            "-overwrite_original",
            ...newExifValues,
            relatedFilePath,
          ]);
          args.verbose && result.split("\n").forEach((l) => log(l));
        } catch (e) {
          error("Exiftool:", e.message);
        }
      }
    }
  } catch (e) {
    error(colors.red(e.message));
    filesWithErrors.set(relatedFilePath, e.message);
  }
  filesWithMetadata.add(relatedFilePath);
  progress.title = path.basename(path.dirname(file.path));
  complete();
};

await pMap(jsonFiles, processFile, { concurrency: args.threads });

console.log();
console.log();

if (filesWithErrors.size) {
  console.log("Errors:");
  for (const [path, message] of filesWithErrors.entries()) {
    console.log(path, "->", message);
  }
}

const allFiles = fs.expandGlobSync("**/*", {
  root: rootDir,
  includeDirs: false,
});

const filesWithoutMetadata = Array.from(allFiles).filter(
  (f) => !f.name.endsWith(".json") && !filesWithMetadata.has(f.path)
);

if (filesWithoutMetadata.length) {
  const title = `${filesWithoutMetadata.length} files have no associated meta file:`;
  console.log(colors.red(colors.bold(title)));
  filesWithoutMetadata.forEach((f) => console.log(f.path));
}

if (args.removeLiveVideo) {
  console.log("Removing separate live videos...");

  const validExtensions = [".mov", ".mp4"];

  for (const file of filesWithoutMetadata) {
    console.log(
      `Checking ${file.name} with extension`,
      path.extname(file.name).toLowerCase()
    );

    if (!validExtensions.includes(path.extname(file.name).toLowerCase())) {
      continue;
    }

    console.log(
      "Removing",
      colors.blue(file.name),
      "because it is a live video."
    );
    if (!dryRun && trashPath) {
      await fs.move(file.path, path.join(trashPath, file.name));
    }
  }
}
