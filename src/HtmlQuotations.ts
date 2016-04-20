import * as XmlDom from "xmldom";
import * as XPath from "xpath";

import { matchStart } from "./Utils";
import * as TalonRegexp from "./Regexp";
import * as TalonConstants from "./Constants";

/**
 * Add checkpoints to an HTML element and all its descendants.
 * 
 * @param {Cheerio} element - The HTML element to edit.
 * @param {number} count - The number of checkpoints already added.
 * @return {number} The total number of checkpoints in the document.
 */
export function addCheckpoint(document: Document, element: Node, count: number = 0): number {  
  // Update the text for this element.
  if (element.firstChild && element.firstChild.nodeType === 3)
    element.replaceChild(document.createTextNode(`${element.firstChild.nodeValue || ""}${TalonConstants.CheckpointPrefix}${count}${TalonConstants.CheckpointSuffix}`), element.firstChild);
  count++;
  
  // Process recursively.
  for (let index = 0; index < element.childNodes.length; index++) {
    const node = element.childNodes.item(index);
    if (node.nodeType !== 1)
      continue;
      
    count = addCheckpoint(document, node, count);
  }
    
  // Also update the following text node, if any.
  if (element.nextSibling && element.nextSibling.nodeType === 3)
    element.parentNode.replaceChild(document.createTextNode(`${element.nextSibling.nodeValue || ""}${TalonConstants.CheckpointPrefix}${count}${TalonConstants.CheckpointSuffix}`), element.nextSibling);
  count++;
  
  // Return the updated count.
  return count;
};

/**
 * Remove tags with quotation checkpoints from the provided HTML element and all its descendants.
 * 
 * @param {Cheerio} element - The HTML element to edit.
 * @param {boolean[]} quotationCheckpoints - The checkpoints for the tags to remove.
 * @param {number} count - The number of scanned tags.
 * @return {object} The updated count, and whether this tag was part of a quote or not.
 */
export function deleteQuotationTags(document: Document, element: Node, quotationCheckpoints: boolean[], count: number = 0): {
  count: number,
  isTagInQuotation: boolean
} {
  var isTagInQuotation = true;
  
  // Check if this element is a quotation tag.
  if (quotationCheckpoints[count]) {
    if (element.firstChild && element.firstChild.nodeType === 3)
      element.replaceChild(document.createTextNode(""), element.firstChild);
  } else {
    isTagInQuotation = false;
  }
    
  count++;
  
  // Process recursively.
  const quotationChildren = new Array<Node>(); // Collection of children in quotation.
  
  for (let index = 0; index < element.childNodes.length; index++) {
    const node = element.childNodes.item(index);
    if (node.nodeType !== 1)
      continue;
      
    let isChildTagInQuotation: boolean;
    ({ count, isTagInQuotation: isChildTagInQuotation } = deleteQuotationTags(document, node, quotationCheckpoints, count));
    
    if (!isChildTagInQuotation)
      continue;
      
    // If this child was part of a quote, keep it around.
    quotationChildren.push(node);
  }
  
  // If needed, clear the following text node.
  if (quotationCheckpoints[count]) {
    if (element.nextSibling && element.nextSibling.nodeType === 3)
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

/**
 * Cuts the outermost block element with the class "gmail_quote".
 * 
 * @param {CheerioSelector} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutGmailQuote(document: Document): boolean {
  // Find the first element that fits our criteria.
  const gmailQuote = <Node>XPath.select("//div[contains(@class, 'gmail_quote')]", document, true);
  
  // If no quote was found, or if that quote was a forward, return false.
  if (!gmailQuote || (gmailQuote.textContent && matchStart(gmailQuote.textContent, TalonRegexp.Forward)))
    return false;
    
  // Otherwise, remove the quote from the document and return.
  gmailQuote.parentNode.removeChild(gmailQuote);
  return true;
};

/**
 * Cuts the Outlook splitter block and all the following block.
 * 
 * @param {CheerioSelector} document - The document to cut the elements from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutMicrosoftQuote(document: Document): boolean {
  let splitter = <Node>XPath.select(
    // Outlook 2007, 2010.
    "//div[@style='border:none;border-top:solid #B5C4DF 1.0pt;" + 
    "padding:3.0pt 0cm 0cm 0cm']|" +
    // Windows Mail.
    "//div[@style='padding-top: 5px; " +
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
      "//div" +
      "/div[@class='MsoNormal' and @align='center' " +
      "and @style='text-align:center']" +
      "/font" +
      "/span" +
      "/hr[@size='3' and @width='100%' and @align='center' " +
      "and @tabindex='-1']"
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
      
  // Remove the splitter, and everything after it.
  while (splitter.nextSibling)
    splitter.parentNode.removeChild(splitter.nextSibling);
  
  splitter.parentNode.removeChild(splitter);
  return true;
};

/**
 * Cuts a Zimbra quote block.
 * 
 * @param {CheerioSelector} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutZimbraQuote(document: Document): boolean {
  const splitter = <Node>XPath.select("//hr[@data-marker=\"__DIVIDER__\"]", document, true);
  if (!splitter)
    return false;
    
  splitter.parentNode.removeChild(splitter);
  return true;  
};

/**
 * Cuts all of the outermost block elements with known quote ids.
 * 
 * @param {CheerioSelector} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutById(document: Document): boolean {
  let found = false;
  
  // For each known Quote Id, remove any corresponding element.
  for (const quoteId of TalonConstants.QuoteIds) {
    const quote = <Node>XPath.select(`//*[@id="${quoteId}"]`, document, true);
    if (!quote)
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
 * @param {CheerioSelector} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutBlockquote(document: Document): boolean {
  const quote = <Node>XPath.select(
    "(.//blockquote)" +
    "[not(@class=\"gmail_quote\") and not(ancestor::blockquote)]" +
    "[last()]"
  , document, true);
  
  if (!quote)
    return false;
    
  quote.parentNode.removeChild(quote);
  return true;
};

/**
 * Cuts div tag that wraps a block starting with "From:".
 * 
 * @param {CheerioSelector} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutFromBlock(document: Document): boolean {
  // Handle the case when "From:" block is enclosed in some tag.
  const block1List = <Node[]>XPath.select(
    "//*[starts-with(mg:text_content(), 'From:')]|" +
    "//*[starts-with(mg:text_content(), 'Date:')]"
  , document);
  
  if (block1List.length > 0) {
    let block1 = block1List[block1List.length - 1];
    
    // Find the parent of outermost div for this block.
    let parentDiv: Node;
    while (block1.parentNode) {
      if (block1.nodeName === "div") {
        parentDiv = block1;
        break;
      }
      
      block1 = block1.parentNode;
    }
    
    // If none was found, stop.
    if (!parentDiv)
      return false;
      
    // Otherwise, check if the parent div is at the root of the document.
    const maybeBody = parentDiv.parentNode;
    
    // If where removing this enclosing div would remove all content,
    // we should assume the quote is not enclosed in a tag.
    const parentDivIsAllContent = maybeBody 
      && maybeBody.nodeName === "body"
      && maybeBody.childNodes.length === 1;
      
    if (!parentDivIsAllContent) {
      block1.parentNode.removeChild(block1);
      return true;
    }
  }
  
  // Handle the case when the "From:" block is at the root level,
  // and not enclosed in some other tag.
  const block2 = <Node>XPath.select(
    "//*[starts-with(mg:tail(), 'From:')]|" +
    "//*[starts-with(mg:tail(), 'Date:')]"
  , document, true);
  
  // If no block was found, or if it's a forward, stop.
  if (!block2 || matchStart((block2.textContent || ""), TalonRegexp.Forward))
    return false;
    
  // Otherwise, remove all the subsequent blocks.
  while (block2.nextSibling)
    block2.parentNode.removeChild(block2.nextSibling);
  
  // Along with the block itself.
  block2.parentNode.removeChild(block2);
  return true;
};