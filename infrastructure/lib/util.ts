// This is a suboptimal solution to finding the relative directory to the
// package root. This is necessary because it is possible for this file to be
// run with the a cwd of either the infrastructure directory or the root of the
// git repo.
export function packageRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith("infrastructure")) {
    return `${cwd}/../packages`;
  }
  return `${cwd}/packages`;
}
