import * as TalonRegexp from "./Regexp";

/**
 * Find the line delimiter in the specified message body.
 * @param {string} messageBody - The message body to search in.
 * @return {string} The delimiter found in the body.
 */
export function findDelimiter(messageBody: string): string {
  var match = TalonRegexp.Delimiter.exec(messageBody);
  return match ? match[0] : "\n";
}

/**
 * Split a string in its multiples lines.
 * @param {string} str - The string to split.
 * @result {string[]} The array of splitted lines.
 */
export function splitLines(str: string): string[] {
  return str.split(/\r?\n/);
};

/**
 * Match a Regexp with the beginning of a string.
 * @param {string} str - The base string.
 * @param {RegExp} regexp - The regular expression to match.
 * @return {RegExpMatchArray} The resulting match, if any. 
 */
export function matchStart(str: string, regexp: RegExp): RegExpMatchArray {
  let match: any = str.match(regexp);
  return !match || match.index > 0 ? null : match;
}