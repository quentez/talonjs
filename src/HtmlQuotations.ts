import * as XPath from 'xpath';

import { CheckpointPrefix, CheckpointSuffix, NodeLimit, QuoteIds, NodeTypes } from './Constants';
import { ForwardRegexp } from './Regexp';
import { matchStart } from './Utils';

/**
 * Add checkpoints to an HTML element and all its descendants.
 *
 * @param {Document} document - The DOM document.
 * @param {Node} element - The HTML element to edit.
 * @param {number} count - The number of checkpoints already added.
 * @param {number} level - The recursion call depth.
 * @return {number} The total number of checkpoints in the document.
 */
export function addCheckpoint(document: Document, element: Node, count: number = 0, level: number = 0): number {
  // Update the text for this element.
  if (element.firstChild && element.firstChild.nodeType === NodeTypes.TEXT_NODE)
    element.replaceChild(document.createTextNode(`${element.firstChild.nodeValue || ""}${CheckpointPrefix}${count}${CheckpointSuffix}`), element.firstChild);
  else
    element.nodeValue = `${CheckpointPrefix}${count}${CheckpointSuffix}`;
  count++;

  // Process recursively.
  if (count < NodeLimit)
    for (let index = 0; index < element.childNodes.length && count < NodeLimit; index++) {
      const node = element.childNodes.item(index);
      if (node.nodeType !== 1)
        continue;

      count = addCheckpoint(document, node, count, level + 1);
    }

  // Also update the following text node, if any.
  if (element.nextSibling && element.nextSibling.nodeType === NodeTypes.TEXT_NODE)
    element.parentNode.replaceChild(document.createTextNode(`${element.nextSibling.nodeValue || ""}${CheckpointPrefix}${count}${CheckpointSuffix}`), element.nextSibling);
  else if (element.parentNode)
    element.parentNode.appendChild(document.createTextNode(`${CheckpointPrefix}${count}${CheckpointSuffix}`));

  count++;

  // Return the updated count.
  return count;
};

/**
 * Remove tags with quotation checkpoints from the provided HTML element and all its descendants.
 *
 * @param {Document} document - The DOM document.
 * @param {Node} element - The HTML element to edit.
 * @param {boolean[]} quotationCheckpoints - The checkpoints for the tags to remove.
 * @param {number} count - The number of scanned tags.
 * @param {number} level - The recursion call depth.
 * @return {object} The updated count, and whether this tag was part of a quote or not.
 */
export function deleteQuotationTags(document: Document, element: Node, quotationCheckpoints: boolean[], count: number = 0, level: number = 0): {
  count: number,
  isTagInQuotation: boolean
} {
  let isTagInQuotation = true;

  // Check if this element is a quotation tag.
  if (quotationCheckpoints[count]) {
    if (element.firstChild && element.firstChild.nodeType === NodeTypes.TEXT_NODE)
      element.replaceChild(document.createTextNode(""), element.firstChild);
    else
      element.nodeValue = "";
  } else {
    isTagInQuotation = false;
  }
  count++;

  // If this a non-quote table, don't remove children.
  const preserveTable = !isTagInQuotation && element.nodeName === 'table';

  // Process recursively.
  const quotationChildren = new Array<Node>(); // Collection of children in quotation.

  if (count < NodeLimit && !preserveTable)
    for (let index = 0; index < element.childNodes.length && count < NodeLimit; index++) {
      const node = element.childNodes.item(index);
      if (node.nodeType !== NodeTypes.ELEMENT_NODE)
        continue;

      let isChildTagInQuotation: boolean;
      ({ count, isTagInQuotation: isChildTagInQuotation } = deleteQuotationTags(document, node, quotationCheckpoints, count, level + 1));

      if (!isChildTagInQuotation)
        continue;

      // If this child was part of a quote, keep it around.
      quotationChildren.push(node);
    }

  // If needed, clear the following text node.
  if (quotationCheckpoints[count]) {
    if (element.nextSibling && element.nextSibling.nodeType === NodeTypes.TEXT_NODE)
      element.parentNode.replaceChild(document.createTextNode(""), element.nextSibling);
  } else {
    isTagInQuotation = false;
  }
  count++;

  // If this tag wasn't part of a quote, remove its children who were.
  if (!isTagInQuotation)
    for (const node of quotationChildren)
      node.parentNode.removeChild(node);

  // Return the updated count, and whether this element was part of a quote or not.
  return {
    count,
    isTagInQuotation
  };
}

export interface CutQuoteOptions {
  onlyRemoveEmptyBlocks?: boolean
}

function shouldNotRemoveQuote(node: Node, options?: CutQuoteOptions): Boolean {
  return Boolean(options && options.onlyRemoveEmptyBlocks && node.textContent.trim() !== '');
}

/**
 * Cuts the outermost block element with the class "gmail_quote".
 *
 * @param {Document} document - The document to cut the element from.
 * @param {CutQuoteOptions} options - Extra options.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutGmailQuote(document: Document, options?: CutQuoteOptions): boolean {
  // Find the first element that fits our criteria.
  const gmailQuote = <Node>XPath.select("//*[contains(@class, 'gmail_quote')]", document, true);

  // If no quote was found, or if that quote was a forward, return false.
  if (!gmailQuote || (gmailQuote.textContent && matchStart(gmailQuote.textContent, ForwardRegexp)) || shouldNotRemoveQuote(gmailQuote, options))
    return false;

  // Otherwise, remove the quote from the document and return.
  gmailQuote.parentNode.removeChild(gmailQuote);
  return true;
};

/**
 * Cuts the Outlook splitter block and all the following block.
 *
 * @param {Document} document - The document to cut the elements from.
 * @param {CutQuoteOptions} options - Extra options.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutMicrosoftQuote(document: Document, options?: CutQuoteOptions): boolean {
  let splitter = <Node>XPath.select(
    // Outlook 2007, 2010.
    "//*[local-name(.)='div' and @style='border:none;" +
      "border-top:solid #B5C4DF 1.0pt;" +
      "padding:3.0pt 0cm 0cm 0cm']|" +
    // Windows Mail.
    "//*[local-name(.)='div' and @style='padding-top: 5px; " +
      "border-top-color: rgb(229, 229, 229); " +
      "border-top-width: 1px; border-top-style: solid;']"
  , document, true);

  if (splitter) {
    // Outlook 2010.
    if (splitter.parentElement && splitter === splitter.parentElement.children[0])
      splitter = splitter.parentNode
  } else {
    // Outlook 2003.
    splitter = <Node>XPath.select(
      "//*[local-name(.)='div']" +
      "/*[local-name(.)='div' and @class='MsoNormal' and @align='center' and @style='text-align:center']" +
      "/*[local-name(.)='font']" +
      "/*[local-name(.)='span']" +
      "/*[local-name(.)='hr' and @size='3' and @width='100%' and @align='center' and @tabindex='-1']"
    , document, true);

    if (splitter) {
      if (splitter.parentNode)
        splitter = splitter.parentNode;
      if (splitter.parentNode)
        splitter = splitter.parentNode;
      if (splitter.parentNode)
        splitter = splitter.parentNode;
      if (splitter.parentNode)
        splitter = splitter.parentNode;
    }
  }

  // If no splitter was found at this point, stop.
  if (!splitter|| shouldNotRemoveQuote(splitter, options))
    return false;

  // Remove the splitter, and everything after it.
  while (splitter.nextSibling)
    splitter.parentNode.removeChild(splitter.nextSibling);

  splitter.parentNode.removeChild(splitter);
  return true;
};

/**
 * Cuts a Zimbra quote block.
 *
 * @param {Document} document - The document to cut the element from.
 * @param {CutQuoteOptions} options - Extra options.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutZimbraQuote(document: Document, options?: CutQuoteOptions): boolean {
  const splitter = <Node>XPath.select("//*[local-name(.)='hr' and @data-marker=\"__DIVIDER__\"]", document, true);
  if (!splitter || shouldNotRemoveQuote(splitter, options))
    return false;

  splitter.parentNode.removeChild(splitter);
  return true;
};

/**
 * Cuts all of the outermost block elements with known quote ids.
 *
 * @param {Document} document - The document to cut the element from.
 * @param {CutQuoteOptions} options - Extra options.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutById(document: Document, options?: CutQuoteOptions): boolean {
  let found = false;

  // For each known Quote Id, remove any corresponding element.
  for (const quoteId of QuoteIds) {
    const quote = <Node>XPath.select(`//*[@id="${quoteId}"]`, document, true);
    if (!quote || shouldNotRemoveQuote(quote, options))
      continue;

    found = true;
    quote.parentNode.removeChild(quote);
  }

  // Return whether we found at least one.
  return found;
};

/**
 * Cust the last non-nested blockquote with wrapping elements.
 *
 * @param {Document} document - The document to cut the element from.
 * @param {CutQuoteOptions} options - Extra options.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutBlockquote(document: Document, options?: CutQuoteOptions): boolean {
  const quote = <Node>XPath.select(
    "(.//*[local-name(.)='blockquote'])" +
    "[not(@class=\"gmail_quote\") and not(ancestor::blockquote)]" +
    "[last()]"
  , document, true);

  if (!quote || shouldNotRemoveQuote(quote, options))
    return false;

  quote.parentNode.removeChild(quote);
  return true;
};