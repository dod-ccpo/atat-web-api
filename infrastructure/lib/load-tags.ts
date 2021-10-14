import * as fs from "fs";

export interface AwsTag {
  key: string;
  value: string;
}

/**
 * Load tags from JSON data.
 *
 * Tags can be provided from a static file that may or may not be tracked in version control.
 * This file does not handle any errors reading the file or parsing the JSON to preserve them
 * for the caller.
 *
 * @param fileName - The name of the file to load tags from
 * @returns The list of tags defined in the given file
 */
export function getTags(fileName: string): AwsTag[] {
  const data = fs.readFileSync(fileName, "utf-8");
  return JSON.parse(data) as AwsTag[];
}
