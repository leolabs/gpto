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
    "-GPSLatitude",
    "-GPSLongitude",
    "-GPSAltitude",
    path,
  ]);

  const [
    dateTimeOriginal,
    createDate,
    gpsLatutide,
    gpsLongitude,
    gpsAltitude,
  ] = exifData.split("\t").map((d) => (d === "-" ? undefined : d));

  return {
    dateTimeOriginal,
    createDate,
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
