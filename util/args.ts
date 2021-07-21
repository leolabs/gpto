import yargs from "https://deno.land/x/yargs@v16.2.0-deno/deno.ts";

export const args = yargs(Deno.args)
  .usage("Usage: [options] <directory>")
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
    [".", "Run the script in the current folder"],
    ["--dry-run <folder>", "Run the script without modifying any files"],
  ]).argv;
