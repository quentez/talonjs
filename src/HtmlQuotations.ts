import * as Cheerio from "cheerio";

import { matchStart } from "./Utils";
import * as TalonRegexp from "./Regexp";
import * as TalonConstants from "./Constants";

/**
 * Cuts the outermost block element with the class "gmail_quote".
 * 
 * @param {CheerioSelector} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutGmailQuote(document: CheerioSelector): boolean {
  // Find the first element that fits our criteria.
  const gmailQuote = document("div.gmail_quote").first();
  
  // If no quote was found, or if that quote was a forward, return false.
  if (gmailQuote.length === 0 || (gmailQuote.text() && matchStart(gmailQuote.text(), TalonRegexp.Forward)))
    return false;
    
  // Otherwise, remove the quote from the document and return.
  gmailQuote.remove();
  return true;
};

/**
 * Cuts the Outlook splitter block and all the following block.
 * 
 * @param {CheerioSelector} document - The document to cut the elements from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutMicrosoftQuote(document: CheerioSelector): boolean {
  let splitter = document(
    // Outlook 2007, 2010.
    "//div[@style='border:none;border-top:solid #B5C4DF 1.0pt;" + 
    "padding:3.0pt 0cm 0cm 0cm']|" +
    // Windows Mail.
    "//div[@style='padding-top: 5px; " +
    "border-top-color: rgb(229, 229, 229); " +
    "border-top-width: 1px; border-top-style: solid;']"
  ).first();
  
  if (splitter.length > 0) {
    // Outlook 2010.
    if (splitter === splitter.parent().children().first())
      splitter = splitter.parent();
  } else {
    // Outlook 2003.
    splitter = document(
      "//div" +
      "/div[@class='MsoNormal' and @align='center' " +
      "and @style='text-align:center']" +
      "/font" +
      "/span" +
      "/hr[@size='3' and @width='100%' and @align='center' " +
      "and @tabindex='-1']"
    ).first();
    
    if (splitter.length > 0)
      splitter = splitter.parent().parent().parent().parent();
  }
  
  // If no splitter was found at this point, stop.
  if (splitter.length === 0)
    return false;
      
  // Remove the splitter.
  splitter.nextAll().remove();
  splitter.remove();
  return true;
};

/**
 * Cuts a Zimbra quote block.
 * 
 * @param {CheerioSelector} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutZimbraQuote(document: CheerioSelector): boolean {
  const splitter = document("//hr[@data-marker=\"__DIVIDER__\"]");
  if (splitter.length === 0)
    return false;
    
  splitter.remove();
  return true;  
};

/**
 * Cuts all of the outermost block elements with known quote ids.
 * 
 * @param {CheerioSelector} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutById(document: CheerioStatic): boolean {
  let found = false;
  
  // For each known Quote Id, remove any corresponding element.
  for (let quoteId of TalonConstants.QuoteIds) {
    const quote = document(`#${quoteId}`);
    if (quote.length === 0)
      continue;
      
    found = true;
    quote.remove();
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
export function cutBlockquote(document: CheerioSelector): boolean {
  const quote = document(
    "(.//blockquote)" +
    "[not(@class=\"gmail_quote\") and not(ancestor::blockquote)]" +
    "[last()]"
  );
  
  if (quote.length === 0)
    return false;
    
  quote.remove();
  return true;
};

/**
 * Cuts div tag that wraps a block starting with "From:".
 * 
 * @param {CheerioSelector} document - The document to cut the element from.
 * @return {boolean} Whether a corresponding quote was found or not.
 */
export function cutFromBlock(document: CheerioSelector): boolean {
  // Handle the case when "From:" block is enclosed in some tag.
  let block1 = document(
    "//*[starts-with(mg:text_content(), 'From:')]|" +
    "//*[starts-with(mg:text_content(), 'Date:')]"
  ).last();
  
  if (block1.length > 0) {
    // Find the first parent div element.
    let parentDiv: Cheerio;
    while (block1.parent().length > 0) {
      if (block1.get(0).tagName === "div") {
        parentDiv = block1;
        break;
      }
      
      block1 = block1.parent();
    }
    
    // If none was found, stop.
    if (parentDiv.length === 0)
      return false;
      
    // Otherwise, check if the parent div is at the root of the document.
    const maybeBody = parentDiv.parent();
    
    // If where removing this enclosing div would remove all content,
    // we should assume the quote is not enclosed in a tag.
    const parentDivIsAllContent = maybeBody.length > 0 
      && maybeBody.get(0).tagName === "body"
      && maybeBody.children().length === 1;
      
    if (!parentDivIsAllContent) {
      block1.remove();
      return true;
    }
  }
  
  // Handle the case when the "From:" block is at the root level,
  // and not enclosed in some other tag.
  const block2 = document(
    "//*[starts-with(mg:tail(), 'From:')]|" +
    "//*[starts-with(mg:tail(), 'Date:')]"
  ).first();
  
  // If no block was found, or if it's a forward, stop.
  if (block2.length === 0
      || matchStart((block2.text() || ""), TalonRegexp.Forward))
    return false;
    
  // Otherwise, remove all the subsequent blocks.
  block2.nextAll().remove();
  block2.remove();
  return true;
};