/**
 * Runs a command in CLI and returns its result.
 */
export const exec = async (cmd: string[]) => {
  const opts: Deno.RunOptions = {
    cmd,
    stdout: "piped",
    stderr: "piped",
  };

  const process = Deno.run(opts);
  const decoder = new TextDecoder();
  const success = (await process.status()).success;

  const stdout = await process.output();
  const stderr = await process.stderrOutput();

  if (!success) {
    const msg = decoder.decode(stderr).trim();
    throw new Error(msg || "exec: failed to execute command");
  }

  return decoder.decode(stdout).trim();
};
