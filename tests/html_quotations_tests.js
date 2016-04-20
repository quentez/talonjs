"use strict";

const fs = require("fs");
const path = require("path");
const async = require("front-async");
const assert = require("chai").assert;
const utils = require("./utils");
const quotations = require("../bin/talon").quotations;

describe("Html Quotations", function () {
  
  describe("Extract html", function () {
    
    it("should find the quotation splitter inside blockquote.", function () {
      const messageBody = "Reply\n" +
        "<blockquote>\n\n" +
        "<div>\n" +
        "On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:\n" +
        "</div>\n\n" +
        "<div>\n" +
        "Test\n" +
        "</div>\n\n" +
        "</blockquote>";
        
      const reply = "Reply";
      
      assert.equal(reply, removeWhitespace(quotations.extractFromHtml(messageBody)));
    });
  });
});

function removeWhitespace(str) {
  return str && str.replace(/\s/g, "");
}