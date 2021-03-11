import * as path from "https://deno.land/std@0.90.0/path/mod.ts";
import * as colors from "https://deno.land/std@0.90.0/fmt/colors.ts";

import yargs from "https://deno.land/x/yargs/deno.ts";
import formatDate from "https://deno.land/x/date_fns@v2.15.0/format/index.js";
import ProgressBar from "https://deno.land/x/progress@v1.2.3/mod.ts";
import pMap from "https://cdn.skypack.dev/p-map";

import { MetadataFile } from "./types/metadata.ts";
import { exifToolInstalled, getExifData, getMimeType } from "./util/exif.ts";
import * as fs from "./util/fs.ts";
import { exec } from "./util/cli.ts";
import { ensurePermissions } from "./util/permissions.ts";
import { getRelatedFilePath } from "./util/paths.ts";

const args = yargs(Deno.args)
  .usage("Usage: $0 [options] <directory>")
  .strict()
  .alias("h", "help")
  .version(false)
  .group(["people", "remove-live-video"], "Features:")
  .option("people", {
    alias: "p",
    describe: "Adds tagged people from GPhotos as keywords",
    type: "boolean",
  })
  .option("remove-live-video", {
    alias: "l",
    describe: "Trashes files that belong to live photos",
    type: "boolean",
  })
  .option("verbose", {
    alias: "v",
    describe: "Activates verbose logging",
    type: "boolean",
  })
  .option("dry-run", {
    alias: "d",
    describe: "Disables writing any changes to disk",
    type: "boolean",
  })
  .option("threads", {
    alias: "t",
    describe: "Concurrent processed files",
    type: "number",
    default: 15,
  })
  .example([
    ["$0 .", "Run the script in the current folder"],
    ["$0 --dry-run <folder>", "Run the script without modifying any files"],
  ]).argv;

const rootDir: string | undefined = args._[0];

if (!rootDir) {
  console.error("No directory set. Please pass one to the script.");
  Deno.exit(1);
}

if (!(await ensurePermissions(rootDir, !args.dryRun))) {
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
if (!args.dryRun) {
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

// Check for metadata files
const jsonFiles = Array.from(
  fs.expandGlobSync("**/*.json", {
    root: rootDir,
    includeDirs: false,
  })
);

const filesWithMetadata = new Set();

console.log("Found", jsonFiles.length, "metadata files.");

const progress = new ProgressBar({
  total: jsonFiles.length,
  width: 1000,
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

  if (!(await fs.exists(relatedFilePath))) {
    complete();
    args.verbose && error("File", relatedFilePath, "doesn't exist.");
    return;
  }

  const dirName = path.dirname(relatedFilePath);
  const fileName = path.basename(relatedFilePath);
  const extension = path.extname(relatedFilePath);

  const mimeType = await getMimeType(relatedFilePath);
  if (
    mimeType === "image/jpeg" &&
    ![".jpg", ".jpeg"].includes(extension.toLowerCase())
  ) {
    log(
      "The file claims to be a",
      extension,
      "but it's actually a JPG. Renaming..."
    );

    if (!args.dryRun) {
      const newPath = path.join(dirName, `${fileName}.jpg`);
      await fs.move(relatedFilePath, newPath);
      relatedFilePath = newPath;
    }
  }

  const metadata: MetadataFile = JSON.parse(await Deno.readTextFile(file.path));
  const exifData = await getExifData(file.path);
  const newExifValues: string[] = [];

  // Fix missing timestamps with information from Google Photos
  if (exifData.dateTimeOriginal === "-" && exifData.createDate === "-") {
    const newDate = formatDate(
      Date.parse(metadata.photoTakenTime.formatted),
      "yyyy-MM-dd HH:mm:ss",
      {}
    );
    args.verbose && log(`Setting date to ${newDate}...`);
    newExifValues.push(`-DateTimeOriginal=${newDate}`);
  }

  // Add missing GPS information
  if (
    exifData.gpsLatutide === "-" &&
    exifData.gpsLongitude === "-" &&
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
    if (args.dryRun) {
      log("Changes:", newExifValues.join(" "));
    } else {
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

  filesWithMetadata.add(relatedFilePath);
  complete();
};

await pMap(jsonFiles, processFile, { concurrency: args.threads });

if (args.removeLiveVideo) {
  console.log("Removing separated live videos...");

  const allFiles = fs.expandGlobSync("**/*", {
    root: rootDir,
    includeDirs: false,
  });

  const validExtensions = [".mov", ".mp4"];

  for await (const file of allFiles) {
    if (
      !validExtensions.includes(path.extname(file.name).toLowerCase()) ||
      filesWithMetadata.has(file.path)
    ) {
      continue;
    }

    console.log(
      "Removing",
      colors.blue(file.name),
      "because it is a live video."
    );
    if (!args.dryRun && trashPath) {
      await fs.move(file.path, path.join(trashPath, file.name));
    }
  }
}
