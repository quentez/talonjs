/*
 * Constants.
 */

const SplitterMaxLines = 4;
const MaxLinesCount = 1000;

/** Class operating on message bodies, trying to extract 
 *  origional messages (without quoted messages). */
export default class Quotations {
  
  /*
   * Public interface.
   */
  
  extractFrom(messageBody: string, contentType: string = "text/plain"): string {
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
    const delimiter = this.findDelimiter(messageBody);
    messageBody = this.preprocess(messageBody, delimiter);
    
    // Only take the X first lines.
    let lines = messageBody.split(/\r?\n/).slice(MaxLinesCount);
    const markers = this.markMessageLines(lines);
    lines = this.processMarkedLines(lines, markers);
    
    // Concatenate the lines, change links back, strip and return.
    messageBody = lines.join(delimiter);
    messageBody = this.postProcess(messageBody);
    
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
  
  private findDelimiter(messageBody: string): string {
    
  }
  
  private preprocess(messageBody: string, delimiter: string): string {
    
  }
  
  private markMessageLines(lines: string[]): string[] {
    
  }
  
  private processMarkedLines(lines: string[], markers: string[]): string[] {
    
  }
  
  private postProcess(messageBody: string): string {
    
  }
}