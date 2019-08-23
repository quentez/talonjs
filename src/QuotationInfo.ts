import { NodeLimit } from './Constants';
import { throws } from 'assert';

export class QuotationInfo {
  startTags: Set<number>;
  quoteStartDepth: number;

  constructor (startTags: Set<number>) {
    this.startTags = startTags;
    this.quoteStartDepth = NodeLimit;
  }

  getQuoteStartDepth() {
    return this.quoteStartDepth;
  }

  removeTagFromQuoteInfo(count: number, level: number){
    this.startTags.delete(count);
    if (!this.quoteStartDepth || level < this.quoteStartDepth)
    this.quoteStartDepth = level;
  }

  quoteStartWithTag(count: number) {
    return this.startTags.has(count);
  }

  isQuoteEmpty() {
    return this.startTags.size === 0
  }
};
