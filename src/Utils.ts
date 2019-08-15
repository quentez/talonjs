import * as XPath from 'xpath';

import { BlockTags, HardbreaksTag, NodeTypes } from './Constants';
import { DelimiterRegexp } from './Regexp';

/**
 * Find the line delimiter in the specified message body.
 * @param {string} messageBody - The message body to search in.
 * @return {string} The delimiter found in the body.
 */
export function findDelimiter(messageBody: string): string {
  var match = DelimiterRegexp.exec(messageBody);
  return match ? match[0] : "\n";
};

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
};

/**
 * Dead-simple HTML-to-text converter.
 *
 * "one<br>two<br>three" => "one\ntwo\nthree"
 *
 * @param {Node} element - The HTML element to stringify.
 * @return {string} The string representation of the provided element.
 */
export function elementToText(element: Node, ignoreBlockTags: Boolean): string {
  // Remove <style> elements.
  const styleNodes = <Node[]>XPath.select("//style", element);
  for (const styleNode of styleNodes)
    styleNode.parentNode.removeChild(styleNode);

  // Remove //comments.
  const commentNodes = <Node[]>XPath.select("//comment()", element);
  for (const commentNode of commentNodes)
    commentNode.parentNode.removeChild(commentNode);

  let text = "";
  const allNodes = <Element[]>XPath.select("//*", element);
  for (const node of allNodes) {
    let nodeValue = (node.nodeValue || (node.firstChild && node.firstChild.nodeType === NodeTypes.TEXT_NODE && node.firstChild.nodeValue) || '').trim();
    const sibillingValue = ((node.nextSibling && node.nextSibling.nodeType === NodeTypes.TEXT_NODE && node.nextSibling.nodeValue) || '').trim();

    if (HardbreaksTag.indexOf(node.nodeName.toLowerCase()) >= 0
      && text && text[text.length - 1] !== "\n")
      nodeValue += "\n";

    let nodeText = nodeValue + sibillingValue;
    nodeText = nodeText.replace('\\n', '\n');
    if (nodeText.length > 1) {
      if (!ignoreBlockTags && BlockTags.indexOf(node.nodeName.toLowerCase()) >= 0)
        text += "\n";

      if (node.nodeName.toLowerCase() === "li")
        text += "  * ";

      // Add this element's text to the result.
      text += `${nodeText} `;

      // Add href to the output.
      const href = node.attributes.getNamedItem("href");
      if (href)
        text += `(${href}) `;
    }
  }
  // Remove excessive new lines from the result and return.
  return removeExcessiveNewlines(text);
};

/**
 * Ensure that an HTML document always has <html> and <body> tags.
 *
 * @param {string} document - The HTML document to normalize.
 * @return {string} The normalized HTML document.
 */
export function normalizeHtmlDocument(document: string): string {
  const matchStart = document.match(/^(\s*<html[^>]*>)?(\s*<head[^>]*>.*<\/head>)?(\s*<body[^>]*>)?/im);
  const matchEnd = document.match(/(<\/body>\s*)?(<\/html>\s*)?$/im);

  if (!matchStart[3])
    document = matchStart[0].trim() +
      "<body>" +
      document.slice(matchStart[0].length);

  if (!matchStart[1])
    document = "<html>" + document;

  if (!matchEnd[1])
    document = (matchEnd[0] ? document.slice(0, -matchEnd[0].length) : document) +
      "</body>" +
      matchEnd[0].trim();

  if (!matchEnd[2])
    document = document + "</html>";

  return document;
};

/**
 * Remove excessive newlines that often happen as a result of tons of divs.
 *
 * @param {string} src - The string to process.
 * @return {string} The processed string.
 */
function removeExcessiveNewlines(src: string): string {
  return src.replace(/\n{2,10}/g, "\n\n").trim();
}