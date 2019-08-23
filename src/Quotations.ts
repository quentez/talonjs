import * as Cheerio from 'cheerio';
import * as XmlDom from 'xmldom';

import { ContentType, ContentTypeTextPlain, MaxLinesCount, NodeLimit, SplitterMaxLines, NodeTypes } from './Constants';
import {
  addCheckpoint,
  cutBlockquote,
  cutById,
  cutGmailQuote,
  cutMicrosoftQuote,
  cutZimbraQuote,
  deleteQuotationTags,
  cutQuoteOption
} from './HtmlQuotations';
import {
  CheckPointRegexp,
  EmptyQuotationRegexp,
  ForwardRegexp,
  LinkRegexp,
  NormalizedLinkRegexp,
  OnDateSomebodyWroteRegexp,
  ParenthesisLinkRegexp,
  QuotationRegexp,
  QuotePatternRegexp,
  SplitterRegexps,
} from './Regexp';
import { elementToText, findDelimiter, matchStart, normalizeHtmlDocument, splitLines } from './Utils';
import { QuotationInfo } from './QuotationInfo';

const xmlDomParser = new XmlDom.DOMParser({ errorHandler: { warning: () => {}, error: () => {}, fatalError: (error) => { throw error; } }});
const xmlDomSerializer = new XmlDom.XMLSerializer();

/*
 * Module interface.
 */

interface ExtractFromPlainResult {
  body: string,
  didFindQuote: boolean
}

/**
 * Extracts a non quoted message from the provided plain text.
 *
 * @param {string} messageBody - The plain text body to extract the message from.
 * @return {string} The extracted, non-quoted message.
 */
export function extractFromPlain(messageBody: string): ExtractFromPlainResult {
  if (!messageBody || !messageBody.trim())
    return { body: messageBody, didFindQuote: false };

  // Prepare the provided message body.
  const delimiter = findDelimiter(messageBody);
  messageBody = preprocess(messageBody, delimiter);

  // Only take the X first lines.
  const lines = splitLines(messageBody).slice(0, MaxLinesCount);
  const markers = markMessageLines(lines);
  const { wereLinesDeleted, lastMessageLines } = processMarkedLines(lines, markers);

  // Concatenate the lines, change links back, strip and return.
  messageBody = lastMessageLines.join(delimiter);
  messageBody = postProcess(messageBody);

  // Return the extracted message.
  return { body: messageBody, didFindQuote: wereLinesDeleted };
}

interface ExtractFromHtmlResult extends ExtractFromPlainResult {
  isTooLong?: boolean
}

/**
 * Extracts a non quoted message from the provided html.
 *
 * @param {string} messageBody - The html body to extract the message from.
 * @return {string} The extracted, non-quoted message.
 */
export function extractFromHtml(messageBody: string): ExtractFromHtmlResult {
  if (!messageBody || !messageBody.trim())
    return { body: messageBody, didFindQuote: false };

  // Remove all newline characters from the provided body.
  messageBody = messageBody.replace(/\r\n/g, " ").replace(/\n/g, " ");
  messageBody = normalizeHtmlDocument(messageBody);

  // Parse the body as a Parse5 document.
  const document = loadHtmlAndFix(messageBody);
  const xmlDocument = xmlDomParser.parseFromString(document.xml());

  // HACK.
  if (xmlDocument.lastChild && xmlDocument.lastChild.nodeValue)
    xmlDocument.removeChild(xmlDocument.lastChild);

  // Keep a copy of the original document around.
  const xmlDocumentCopy = <Document>xmlDocument.cloneNode(true);

  // Add the checkpoints to the HTML tree.
  const numberOfCheckpoints = addCheckpoint(xmlDocument, xmlDocument);
  if (numberOfCheckpoints >= NodeLimit)
    return { body: messageBody, didFindQuote: false, isTooLong: true };

  let extractQuoteHtml = extractQuoteHtmlViaMarkers(numberOfCheckpoints, xmlDocument, {ignoreBlockTags: false});
  if (extractQuoteHtml.error)
    return { body: messageBody, didFindQuote: false, isTooLong: true };

  // Make sure we did not miss a quote due to some parsing error
  if (!extractQuoteHtml.quoteWasFound)
    extractQuoteHtml = extractQuoteHtmlViaMarkers(numberOfCheckpoints, xmlDocument, {ignoreBlockTags: true});

  if (extractQuoteHtml.quoteWasFound) {
    // Remove the tags that we marked as quotation from the HTML.
    deleteQuotationTags(xmlDocument, xmlDocumentCopy, extractQuoteHtml.quotationCheckpoints, new QuotationInfo(new Set(extractQuoteHtml.splittersTags)));

    // Fix quirk in XmlDom.
    if (xmlDocumentCopy.nodeType === NodeTypes.DOCUMENT_NODE && !xmlDocumentCopy.documentElement)
      (xmlDocumentCopy.documentElement as any) = <HTMLElement>xmlDocumentCopy.childNodes[0];

    // Cut empty blockQuote markers
    cutQuotation(xmlDocumentCopy, {onlyRemoveEmptyBlocks: true});

    // Serialize and return.
    return {
      body: xmlDomSerializer.serializeToString(xmlDocumentCopy, true),
      didFindQuote: true
    }
  }
   // Try and cut the quote of one of the known types.
   const cutQuotations = cutQuotation(xmlDocumentCopy);

  // Otherwise, if we found a known quote earlier, return the content before.
  if (cutQuotations)
    return { body: xmlDomSerializer.serializeToString(xmlDocumentCopy, true), didFindQuote: true };
  // Finally, if no quote was found, return the original HTML.
  else
    return { body: messageBody, didFindQuote: false };
}

function cutQuotation(xmlDocument: Document, options?: cutQuoteOption) {
  return cutGmailQuote(xmlDocument, options)
  || cutZimbraQuote(xmlDocument, options)
  || cutBlockquote(xmlDocument, options)
  || cutMicrosoftQuote(xmlDocument, options)
  || cutById(xmlDocument, options);
}

interface extractQuoteOption {
  ignoreBlockTags?: boolean
}

function extractQuoteHtmlViaMarkers(numberOfCheckpoints: number, xmlDocument: Document, options: extractQuoteOption): {
  quotationCheckpoints?: Array<boolean>,
  quoteWasFound?: boolean,
  error?: string,
  splittersTags?: Array<number>
} {
  const messagePlainText = preprocess(elementToText(xmlDocument, options.ignoreBlockTags), "\n", ContentTypeTextPlain);
  let lines = splitLines(messagePlainText);

  // Stop here if the message is too long.
  if (lines.length > MaxLinesCount)
    return { error: 'Message too big' };

  // Collect the checkpoints on each line.
  const lineCheckpoints = lines.map(line => {
    const match = line.match(new RegExp(CheckPointRegexp.source, "g"));
    return match
      ? match.map(matchPart => parseInt(matchPart.slice(4, -4), 10))
      : new Array<number>();
  });

  // Remove checkpoints.
  lines = lines.map(line => line.replace(new RegExp(CheckPointRegexp.source, "g"), ""));
  // Use the plain text quotation algorithm.
  const markers = markMessageLines(lines);
  const { wereLinesDeleted, firstDeletedLine, lastDeletedLine } = processMarkedLines(lines, markers);
  const quotationCheckpoints = new Array<boolean>(numberOfCheckpoints);

  const splittersTags = [];
  let isFirstSplitterGroup = true;
  if (wereLinesDeleted)
    for (let index = firstDeletedLine; index <= lastDeletedLine; index++) {
      for (let checkpoint of lineCheckpoints[index])
        quotationCheckpoints[checkpoint] = true;

      if(markers[index] !== 's')
        isFirstSplitterGroup = false;

      if(markers[index] === 's' && isFirstSplitterGroup)
        splittersTags.push(...lineCheckpoints[index]);
    }

  return {quoteWasFound: wereLinesDeleted, quotationCheckpoints: quotationCheckpoints, splittersTags}
}

/*
 * Private methods.
 */

/**
 * Prepares the message body for being stripped.
 *
 * Replaces link brackets so that they won't be mistaken for quotation markers.
 * Splits lines in two if the splitter pattern is preceeded by some text on the same line.
 * (done only for the "On <date> <person> wrote:" pattern).
 *
 * @param {string} messageBody - The message body to process.
 * @param {string} delimiter - The delimiter for lines in the provided body.
 * @param {string} contentType - The MIME content type of the provided body.
 * @return {string} The pre-processed message body.
 */
export function preprocess(messageBody: string, delimiter: string, contentType: ContentType = ContentTypeTextPlain): string {
  // Normalize links. i.e. replace "<", ">" wrapping the link with some symbols
  // so that ">" closing the link won't be mistaken for a quotation marker.
  messageBody = messageBody.replace(new RegExp(LinkRegexp.source, "g"), (match: string, link: string, offset: number, str: string): string => {
    const newLineIndex = str.substring(offset).indexOf("\n");
    return str[newLineIndex + 1] === ">" ? match : `@@${link}@@`;
  });

  // If this is an HTML message, we're done here.
  if (contentType !== ContentTypeTextPlain)
    return messageBody;

  // Otherwise, wrap splitters with new lines.
  messageBody = messageBody.replace(new RegExp(OnDateSomebodyWroteRegexp.source, "g"), (match: string, ...args: any[]) => {
    const offset = args.filter(a => isFinite(a))[0];
    const str = args[args.length - 1];

    return offset > 0 && str[offset - 1] !== "\n"
      ? delimiter + match
      : match;
  });

  return messageBody;
}

/**
 * Mark message lines with markers to distinguish quotation lines.
 *
 * Markers:
 *
 * e - empty line.
 * m - line that starts with quotation marker '>'
 * s - splitter line.
 * f - forward line.
 * t - presumably lines from that last message in the conversation.
 *
 * @params {string[]} lines - Array of lines to mark.
 * @result {string} Array of markers as a single string.
 */
export function markMessageLines(lines: string[]): string {
  const markers = new Array<string>(lines.length);

  // For each line, find the corresponding marker.
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    // Empty line.
    if (!line) {
      markers[index] = "e";
    // Line with a quotation marker.
    } else if (matchStart(line, QuotePatternRegexp)) {
      markers[index] = "m";
    // Forwarded message.
    } else if (matchStart(line, ForwardRegexp)) {
      markers[index] = "f";
    } else {
      // Try to find a splitter spread on several lines.
      const splitterMatch = isSplitter(lines.slice(index, index + SplitterMaxLines).join("\n"));

      // If none was found, assume it's a line from the last message in the conversation.
      if (!splitterMatch) {
        markers[index] = "t";
      // Otherwise, append as many splitter markers, as lines in the splitter.
      } else {
        const splitterLines = splitLines(splitterMatch[0]);
        for (let splitterIndex = 0; splitterIndex < splitterLines.length; splitterIndex++)
          markers[index + splitterIndex] = "s";

        // Skip as many lines as we just updated.
        index += splitterLines.length - 1;
      }
    }
    index++;
  }

  return markers.join("");
}

/**
 * Run regexes against the message's marked lines to strip quotations.
 * Returns only the last message lines.
 *
 * @param {string[]} lines - Array of lines to process.
 * @param {string} markers - Array of markers for the specified lines.
 * @return {string[]} The lines for th
 */
export function processMarkedLines(lines: string[], markers: string): {
  lastMessageLines: string[],
  wereLinesDeleted: boolean,
  firstDeletedLine: number,
  lastDeletedLine: number
} {
  const result = {
    lastMessageLines: lines,
    wereLinesDeleted: false,
    firstDeletedLine: -1,
    lastDeletedLine: -1
  };
  // If there are no splitters, there should be no markers.
  if (markers.indexOf("s") < 0 && !/(me*){3}/.exec(markers))
    markers = markers.replace(/m/g, "t");

  if (matchStart(markers, /[te]*f/))
    return result;

  // Inlined reply.
  // Use lookbehind assertions to find overlapping entries. e.g. for "mtmtm".
  // Both "t" entries should be found.
  let inlineReplyMatch: any;
  const inlineReplyRegexp = /me*(te*)+m/g;
  while (inlineReplyMatch = inlineReplyRegexp.exec(markers)) {
    // Long links could break a sequence of quotation lines,
    // but they shouldn't be considered an inline reply.
    const links = lines[inlineReplyMatch.index].match(ParenthesisLinkRegexp)
      || matchStart(lines[inlineReplyMatch.index + 1].trim(), ParenthesisLinkRegexp)

    if (!links)
      return result;

    // Hack to emulate look-behind of first group.
    inlineReplyRegexp.lastIndex--;
  }

  // Cut out text lines coming after the splitter if there are no markers there.
  let quotation: any = markers.match("(se*)+((t|f)+e*)+");
  if (quotation) {
    result.wereLinesDeleted = true;
    result.firstDeletedLine = quotation.index;
    result.lastDeletedLine = lines.length - 1;
    result.lastMessageLines = lines.slice(0, quotation.index);
    return result;
  }

  // Handle the case with markers.
  quotation = markers.match(QuotationRegexp)
    || markers.match(EmptyQuotationRegexp);

  if (quotation) {
    const firstGroupStart = quotation.index + quotation[0].indexOf(quotation[1]);
    const firstGroupEnd = firstGroupStart + quotation[1].length;

    result.wereLinesDeleted = true;
    result.firstDeletedLine = firstGroupStart;
    result.lastDeletedLine = firstGroupEnd - 1;
    result.lastMessageLines = lines.slice(0, firstGroupStart).concat(lines.slice(firstGroupEnd));
    return result;
  }

  return result;
}

/*
 * Private methods.
 */

/**
 * Make up for changes made while preprocessing the message.
 * Convert link brackets back to "<" and ">".
 *
 * @param {string} messageBody - The message body to process.
 * @return {string} The processed message body.
 */
function postProcess(messageBody: string): string {
  return messageBody.replace(new RegExp(NormalizedLinkRegexp.source, "g"), "<$1>").trim();
}

/**
 * Returns a Regexp match if the provided string is a splitter.
 *
 * @param {string} src - The string to search.
 * @return {RegExpMatchArray} The match for the splitter that was found, if any.
 */
function isSplitter(src: string): RegExpMatchArray {
  for (const pattern of SplitterRegexps) {
    var match = matchStart(src, pattern);
    if (match)
      return match;
  }
}

/**
 * Load an HTML string into a Cheerio document,
 * then fix HTML weirdness that could affect the rest of the process.
 *
 * @param {string} src - The HTML string to load.
 * @return {CheerioStatic} The newly created Cheerio document.
 */
function loadHtmlAndFix(src: string): CheerioStatic {
  const document = Cheerio.load(src);

  // Remove Word conditional comments.
  document.root().find("*").contents().filter((n, e) => e.type === "directive" && e.name[0] === "!").remove();

  return document;
}
