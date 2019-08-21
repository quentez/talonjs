export type ContentType = "text/plain" | "text/html";

export const ContentTypeTextPlain: ContentType = "text/plain";
export const ContentTypeTextHtml: ContentType = "text/html";

export const SplitterMaxLines = 4;
export const MaxLinesCount = 1000;
export const NodeLimit = 1000;

export const QuoteIds = ["OLK_SRC_BODY_SECTION"];

export const CheckpointPrefix = "#!%!";
export const CheckpointSuffix = "!%!#";

export const BlockTags = ["div", "p", "ul", "li", "h1", "h2", "h3"];
export const HardbreakTags = ["br", "hr", "tr"];

export enum NodeTypes {
  ELEMENT_NODE = 1,
  TEXT_NODE = 3,
  DOCUMENT_NODE = 9
}
