const ensurePermission = async (
  desc: Deno.PermissionDescriptor,
  question: string
) => {
  const { state } = await Deno.permissions.query(desc);
  if (state === "granted") {
    return true;
  }

  console.log(question);
  const request = await Deno.permissions.request(desc);
  if (request.state === "granted") {
    return true;
  }

  return false;
};

/**
 * Makes sure the current script has read, write,
 * and run permissions in the given path.
 */
export const ensurePermissions = async (path: string, needsWrite: boolean) => {
  const hasReadAccess = await ensurePermission(
    { name: "read", path },
    "The script needs read access to the given folder to get metadata."
  );
  if (!hasReadAccess) {
    return false;
  }

  if (needsWrite) {
    const hasWriteAccess = await ensurePermission(
      { name: "write", path },
      "The script needs write access to rename files and clean up."
    );
    if (!hasWriteAccess) {
      return false;
    }
  }

  const hasRunAccess = await ensurePermission(
    { name: "run" },
    "The script needs run access to call exiftool."
  );
  if (!hasRunAccess) {
    return false;
  }

  return true;
};
