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