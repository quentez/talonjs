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
  // console.log( `count ${count} element ${element}`);
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
    // console.log( `count ${count} element ${element}`);

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
 * Only remove the child under the first quotation occurence
 *
 * @param {Document} document - The DOM document.
 * @param {Node} element - The HTML element to edit.
 * @param {boolean[]} quotationCheckpoints - The checkpoints for the tags to remove.
 * @param {number} count - The number of scanned tags.
 * @param {number} level - The recursion call depth.
 * @return {object} The updated count, and whether this tag was part of a quote or not.
 */
export function deleteQuotationTags(document: Document, element: Node, quotationCheckpoints: boolean[], startTags:Set<number>, count: number = 0, level: number = 0, quoteStartDepth? : number): {
  count: number,
  isTagInQuotation: boolean,
  quoteStartDepth: number
} {
  let isTagInQuotation = true;
  // If we processed all the node from the quotation line and we move back to the top of the tree stop removing data
  if (quoteStartDepth && level < quoteStartDepth && startTags.size === 0)
    return {
      count,
      isTagInQuotation: false,
      quoteStartDepth
    };

  // If the tag is in the splitter line remove the tag from the startTags and set the depthLevel
  if (startTags.has(count)) {
    startTags.delete(count);
    if (!quoteStartDepth || level < quoteStartDepth)
      quoteStartDepth = level;
  }

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
      ({ count, isTagInQuotation: isChildTagInQuotation, quoteStartDepth } = deleteQuotationTags(document, node, quotationCheckpoints, startTags, count, level + 1, quoteStartDepth));

      if (!isChildTagInQuotation)
        continue;

      // If this child was part of a quote, keep it around.
      quotationChildren.push(node);
    }

  // If the tag is in the splitter line remove the tag from the startTags and set the depthLevel
  if (startTags.has(count)) {
      startTags.delete(count);
      if (!quoteStartDepth || level < quoteStartDepth)
        quoteStartDepth = level;
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
    isTagInQuotation,
    quoteStartDepth
  };
}
interface cutQuoteOption {
  onlyRemoveEmptyBlocks?: boolean
}

/**
 * Cuts the outermost block element with the class "gmail_quote".
 *
 * @param {Document} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutGmailQuote(document: Document, options?: cutQuoteOption): boolean {
  // Find the first element that fits our criteria.
  const gmailQuote = <Node>XPath.select("//*[contains(@class, 'gmail_quote')]", document, true);

  // If no quote was found, or if that quote was a forward, return false.
  if (!gmailQuote || (gmailQuote.textContent && matchStart(gmailQuote.textContent, ForwardRegexp)))
    return false;

  if (options && options.onlyRemoveEmptyBlocks && gmailQuote.textContent.trim() !== '')
    return

  // Otherwise, remove the quote from the document and return.
  gmailQuote.parentNode.removeChild(gmailQuote);
  return true;
};

/**
 * Cuts the Outlook splitter block and all the following block.
 *
 * @param {Document} document - The document to cut the elements from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutMicrosoftQuote(document: Document, options?: cutQuoteOption): boolean {
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
  if (!splitter)
    return false;

  if (options && options.onlyRemoveEmptyBlocks && splitter.textContent.trim() !== '')
    return

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
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutZimbraQuote(document: Document, options?: cutQuoteOption): boolean {
  const splitter = <Node>XPath.select("//*[local-name(.)='hr' and @data-marker=\"__DIVIDER__\"]", document, true);
  if (!splitter)
    return false;

  if (options && options.onlyRemoveEmptyBlocks && splitter.textContent.trim() !== '')
    return

  splitter.parentNode.removeChild(splitter);
  return true;
};

/**
 * Cuts all of the outermost block elements with known quote ids.
 *
 * @param {Document} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutById(document: Document, options?: cutQuoteOption): boolean {
  let found = false;

  // For each known Quote Id, remove any corresponding element.
  for (const quoteId of QuoteIds) {
    const quote = <Node>XPath.select(`//*[@id="${quoteId}"]`, document, true);
    if (!quote)
      continue;

    if (options && options.onlyRemoveEmptyBlocks && quote.textContent.trim() !== '')
      return
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
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutBlockquote(document: Document, options?: cutQuoteOption): boolean {
  const quote = <Node>XPath.select(
    "(.//*[local-name(.)='blockquote'])" +
    "[not(@class=\"gmail_quote\") and not(ancestor::blockquote)]" +
    "[last()]"
  , document, true);

  if (!quote)
    return false;

  if (options && options.onlyRemoveEmptyBlocks && quote.textContent.trim() !== '')
    return

  quote.parentNode.removeChild(quote);
  return true;
};

/**
 * Cuts div tag that wraps a block starting with "From:".
 *
 * @param {Document} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutFromBlock(document: Document): boolean {
  // Handle the case when "From:" block is enclosed in some tag.
  const block1List = <Node[]>XPath.select(
    "//*[starts-with(text(), \"From:\")]|" +
    "//*[starts-with(text(), \"Date:\")]"
  , document);

  if (block1List.length > 0) {
    let block1 = block1List[block1List.length - 1];

    // Find the parent of the outermost div for this block.
    let parentDiv: Node;
    while (block1.parentNode) {
      if (block1.nodeName === "div")
        parentDiv = block1;

      block1 = block1.parentNode;
    }

    // If none was found, stop.
    if (!parentDiv)
      return false;

    // Otherwise, check if the parent div is at the root of the document.
    const maybeBody = parentDiv.parentNode;

    // If removing the enclosing div would remove all content,
    // we should assume the quote is not enclosed in a tag.
    const parentDivIsAllContent = maybeBody
      && (maybeBody.nodeName === "body")
      && maybeBody.childNodes.length === 1;

    if (!parentDivIsAllContent) {
      block1.parentNode.removeChild(block1);
      return true;
    }
  }

  return false;
};