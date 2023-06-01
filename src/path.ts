export interface ParsedPath {
  /**
   * parent directory name (if exist)
   */
  dir: string;
  /**
   * name with extension
   */
  name: string;
  /**
   *  name without extension
   */
  basename: string;
  /**
   * extension
   */
  extension: string;
}

const lastSeparatorRegex = /[/\\](?!.*[/\\])/g;
const lastPeriodRegex = /\.(?!.*\.)/g;

export function parsePath(path: string): ParsedPath {
  const pathComponent = path.split(lastSeparatorRegex);
  let dir = "";
  let name;

  if (pathComponent.length == 2) [dir, name] = pathComponent;
  else [name] = pathComponent;

  const nameComponent = name.split(lastPeriodRegex);
  const basename = nameComponent[0];
  let extension = "";
  if (nameComponent.length > 1) extension = nameComponent[1];

  return {
    dir,
    name,
    basename,
    extension,
  };
}
