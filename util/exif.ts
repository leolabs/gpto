import { exec } from "./cli.ts";

/**
 * Returns whether exiftool is installed
 * in the current environment.
 */
export const exifToolInstalled = async () => {
  try {
    const exiftoolPath = await exec(["which", "exiftool"]);
    return exiftoolPath.length > 0;
  } catch (e) {
    return false;
  }
};

/** These values mean there is no data available for the given field */
const UNDEFINED_DATA = ["-", "0000:00:00 00:00:00"];

/**
 * Extracts the most important EXIF data from a given file.
 */
export const getExifData = async (path: string) => {
  const exifData = await exec([
    "exiftool",
    "-n",
    "-T",
    "-d",
    "%Y-%m-%d %H:%M:%S%z",
    "-DateTimeOriginal",
    "-CreateDate",
    "-QuickTime:CreateDate",
    "-Keys:CreationDate",
    "-GPSLatitude",
    "-GPSLongitude",
    "-GPSAltitude",
    path,
  ]);

  const [
    dateTimeOriginal,
    createDate,
    quickTimeCreateDate,
    keysCreationDate,
    gpsLatutide,
    gpsLongitude,
    gpsAltitude,
  ] = exifData
    .split("\t")
    .map((d) => (UNDEFINED_DATA.includes(d) ? undefined : d));

  return {
    dateTimeOriginal,
    createDate,
    quickTimeCreateDate,
    keysCreationDate,
    gpsLatutide,
    gpsLongitude,
    gpsAltitude,
  };
};

/**
 * Returns the mime type of a given file.
 */
export const getMimeType = async (path: string) => {
  const result = await exec(["file", "--mime-type", path]);
  return result.split(":").pop()?.trim();
};
