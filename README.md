# Google Photos Takeout Organizer

This tools helps you organize and clean up your Google Photos Takeout directory.

I've written it to make it easier to move your library from Google Photos to other
libraries such as Apple Photos or Adobe Lightroom.

## Features:

- Add missing date and GPS position to images and videos
- Add people as keywords to images and videos
- Remove video files that belong to live photos

## How to Run:

Make sure you have [Deno](https://deno.land) installed, then run:

```shell
deno run https://deno.land/x/gpto/mod.ts
```

## Available Options:

```
Usage: [options] <directory>

Features:
  -p, --people             Adds tagged people from GPhotos as keywords [boolean]
  -l, --remove-live-video  Trashes files that belong to live photos    [boolean]

Options:
  -v, --verbose  Activates verbose logging                             [boolean]
  -d, --dry-run  Disables writing any changes to disk                  [boolean]
  -t, --threads  Concurrent processed files               [number] [default: 15]
  -h, --help     Show help                                             [boolean]

Examples:
  .                   Run the script in the current folder
  --dry-run <folder>  Run the script without modifying any files
```