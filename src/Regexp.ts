import { CheckpointPrefix, CheckpointSuffix } from "./Constants";

export const CheckPoint = new RegExp(`${CheckpointPrefix}\\d+${CheckpointSuffix}`, "im");

export const Delimiter = new RegExp("\\r?\\n");

export const Forward = new RegExp("^[-]+[ ]*Forwarded message[ ]*[-]+$", "im");

export const OnDateSomebodyWrote = new RegExp(
  `-{0,100}[>]?[ ]?(${
    // Beginning of the line.
    [
      "On",       // English,
      "Le",       // French
      "W dniu",   // Polish
      "Op",       // Dutch
      "Am",       // German
      "På",       // Norwegian
      "Den"       // Swedish, Danish
    ].join("|")
  })[ ].{0,100}(${
    // Date and sender separator.
    [
      ",",          // Most languages separate date and sender address by comma.
      "użytkownik"  // Polish date and sender address separator.
    ].join("|")
  })(.*\\n){0,2}.{0,100}(${
    // Ending of the line.
    [
      "wrote", "sent",                    // English
      "a écrit",                          // French
      "napisał",                          // Polish
      "schreef", "verzond", "geschreven", // Dutch
      "schrieb",                          // German
      "skrev"                             // Norwegian, Swedish
    ].join("|")
  }):?-{0,100}`
);

export const OnDateWroteSomebody = new RegExp(
  `-{0,100}[>]?[ ]?(${
    // Beginning of the line.
    [
      "Op",
      "Am"  // German
    ].join("|")
  })[ ].{0,100}(.*\\n){0,2}.{0,100}(${
    // Ending of the line.
    [
      "schreef", "verzond", "geschreven", // Dutch
      "schrieb"                           // German
    ].join("|")
  }).{0,100}:`
);

export const Quotation = new RegExp(
  "(" +
    // Quotation border: splitter line or a number of quotation marker lines.
    "(?:" +
      "s" +
      "|" +
      "(?:me*){2,}" +
    ")" +
    // Quotation lines could be marked as splitter or text, etc.
    ".*" +
    // But we expect it to end with a quotation marker line.
    "me*" +
  ")" +

  // After quotations should be text only or nothing at all.
  "[te]*$"
);

export const EmptyQuotation = new RegExp(
  "(" +
    // Quotation border: splitter line or a number of quotation marker lines.
    "(?:" +
      "(?:se*)+" +
      "|" +
      "(?:me*){2,}" +
    ")" +
  ")" +
  "e*"
);

// ------Original Message------ or ---- Reply Message ----
// With variations in other languages.
export const OriginalMessage = new RegExp(
  `[\\s]*[-]+[ ]{0,100}(${
    [
      "Original Message", "Reply Message",            // English
      "Ursprüngliche Nachricht", "Antwort Nachricht", // German
      "Oprindelig meddelelse"                         // Danish
    ].join("|")
  })[ ]{0,100}[-]+`, "i"
);

export const FromColonOrDateColon = new RegExp(
  `(_+\\r?\\n)?[\\s]*(:?[*]?${
    [
      "From", "Van", "De", "Von", "Fra", "Från",      // "From" in different languages.
      "Date", "Datum", "Envoyé", "Skickat", "Sendt",  // "Date" in different languages.
    ].join("|")
  })[\\s]?:[*]? .*`, "i"
);

export const SplitterPatterns = [
  OriginalMessage,
  OnDateSomebodyWrote,
  OnDateWroteSomebody,
  FromColonOrDateColon,
  // 02.04.2012 14:20 пользователь "bob@example.com" <
  // bob@xxx.mailgun.org> написал:
  new RegExp("(\\d+\\/\\d+\\/\\d+|\\d+\\.\\d+\\.\\d+)[^]*@"),
  // 2014-10-17 11:28 GMT+03:00 Bob <
  // bob@example.com>:
  new RegExp("\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}\\s+GMT[^]*@"),
  // Thu, 26 Jun 2014 14:00:51 +0400 Bob <bob@example.com>:
  new RegExp("\\S{3,10}, \\d\\d? \\S{3,10} 20\\d\\d,? \\d\\d?:\\d\\d(:\\d\\d)?( \\S+){3,6}@\\S+:"),
  // Sent from Samsung MobileName <address@example.com> wrote:
  new RegExp("Sent from Samsung .{0,100}@.{0,100}> wrote")
];

export const Link = new RegExp("<(http://[^>]*)>");
export const NormalizedLink = new RegExp("@@(http://[^>@]*)@@");
export const ParenthesisLink = new RegExp("\\(https?://");

export const QuotePattern = new RegExp("^>+ ?");
export const NoQuoteLine = new RegExp("^[^>].*[\\S].*");