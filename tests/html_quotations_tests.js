"use strict";

const fs = require("fs");
const path = require("path");
const async = require("front-async");
const assert = require("chai").assert;
const utils = require("./utils");
const quotations = require("../bin/talon").quotations;

describe("Html Quotations", function () {
  
  describe("Extract html", function () {
    
    it("should find reply with the quotation splitter inside a blockquote.", function () {
      const messageBody = "Reply\n" +
        "<blockquote>\n\n" +
        "<div>\n" +
        "On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:\n" +
        "</div>\n\n" +
        "<div>\n" +
        "Test\n" +
        "</div>\n\n" +
        "</blockquote>";
        
      assert.equal("Reply", removeWhitespace(quotations.extractFromHtml(messageBody)));
    });
    
    it("should find the reply with the quotate splitter outside the blockquote.", function () {
      const messageBody = "Reply\n\n" +
        "<div>\n" +
        "On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:\n" +
        "</div>\n\n" +
        "<blockquote>\n" +
        "<div>\n" +
        "Test\n" +
        "</div>\n"
        "</blockquote>";
        
      assert.equal("Reply", removeWhitespace(quotations.extractFromHtml(messageBody)));
    });
    
    it("should find the reply with a regular blockquote before the splitter.", function () {
      const messageBody = "Reply\n" +
        "<blockquote>Regular</blockquote>\n\n" +
        "<div>\n" +
        "On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:\n" +
        "</div>\n\n" +
        "<blockquote>\n" +
        "<div>\n" +
        "<blockquote>Nested</blockquote>\n" +
        "</div>\n"
        "</blockquote>";
        
      const reply = "Reply<blockquote>Regular</blockquote>";
        
      assert.equal(reply, removeWhitespace(quotations.extractFromHtml(messageBody)));
    });
    
    it("should find the reply with no blockquotes.", function () {
      const messageBody = "\n<html>\n" +
        "<body>\n" +
        "Reply\n\n" +
        "<div>\n" +
        "On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:\n" +
        "</div>\n\n" +
        "<div>\n" +
        "Test\n" +
        "</div>\n" +
        "</body>\n" +
        "</html>\n";
        
      const reply = "<html>" +
        "<body>" +
        "Reply\n\n" +
        "</body></html>";
        
      assert.equal(
        removeWhitespace(reply), 
        removeWhitespace(quotations.extractFromHtml(messageBody)));
    });
  });
});

function removeWhitespace(str) {
  return str && str.replace(/\s/g, "");
}