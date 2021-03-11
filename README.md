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
Usage: deno run [options] [directory]

Options:
      --version            Show version number                         [boolean]
  -v, --verbose            activates verbose logging                   [boolean]
  -d, --dry-run            don't write any changes                     [boolean]
  -p, --people             adds tagged people from GPhotos as keywords [boolean]
  -l, --remove-live-video  trashes files that belong to live photos    [boolean]
      --threads            concurrency                    [number] [default: 15]
  -h, --help               Show help                                   [boolean]
```