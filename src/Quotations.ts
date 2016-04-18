import { findDelimiter } from "./Utils";
import * as TalonRegexp from "./Regexp";
import * as TalonConstants from "./Constants";

/** Class operating on message bodies, trying to extract origonal messages (without quotations). */
export default class Quotations {
  
  /*
   * Public interface.
   */
  
  extractFrom(messageBody: string, contentType: string = TalonConstants.ContentTypeTextPlain): string {
    // Depending on the content-type, use the appropriate method.
    switch (contentType) {
      case "text/plain":
        return this.extractFromPlain(messageBody);
      case "text/html":
        return this.extractFromHtml(messageBody);
      default:
        return messageBody;
    }
  }
  
  /** 
   * Extracts a non quoted message from the provided plain text.
   * @param {string} messageBody - The plain text body to extract the message from.
   * @return {string} The extracted, non-quoted message.
   */
  extractFromPlain(messageBody: string): string {
    // Prepare the provided message body.
    const delimiter = findDelimiter(messageBody);
    messageBody = this.preprocess(messageBody, delimiter);
    
    // Only take the X first lines.
    let lines = messageBody.split(/\r?\n/).slice(TalonConstants.MaxLinesCount);
    const markers = this.markMessageLines(lines);
    lines = this.processMarkedLines(lines, markers);
    
    // Concatenate the lines, change links back, strip and return.
    messageBody = lines.join(delimiter);
    messageBody = this.postProcess(messageBody);
    
    // Return the extracted message.
    return messageBody;
  }
  
  /**
   * Extracts a non quoted message from the provided html.
   * @param {string} messageBody - The html body to extract the message from.
   * @return {string} The extracted, non-quoted message.
   */
  extractFromHtml(messageBody: string): string {
    return messageBody;
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
  private preprocess(messageBody: string, delimiter: string, contentType: string = TalonConstants.ContentTypeTextPlain): string {
    // Normalize links. i.e. replace "<", ">" wrapping the link with some symbols
    // so that ">" closing the link won't be mistaken for a quotation marker.   
    messageBody = messageBody.replace(TalonRegexp.Link, (match: string, link: string, offset: number, str: string): string => {
      const newLineIndex = str.substring(offset).indexOf("\n");
      return str[newLineIndex + 1] === ">" ? match : `@@${link}@@`; 
    });
    
    // If this is an HTML message, we're done here.
    if (contentType !== TalonConstants.ContentTypeTextPlain)
      return messageBody;
      
    // Otherwise, wrap splitters with new lines.
    messageBody = messageBody.replace(TalonRegexp.OnDateSomebodyWrote, (match: string, group1: string, offset: number, str: string) => {     
      return offset > 0 && str[offset - 1] !== "\n"
        ? delimiter + match
        : match;
    });
    
    return messageBody;
  }
  
  private markMessageLines(lines: string[]): string[] {
    
  }
  
  private processMarkedLines(lines: string[], markers: string[]): string[] {
    
  }
  
  private postProcess(messageBody: string): string {
    
  }
}