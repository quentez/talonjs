"use strict";

let assert = require("chai").assert;
let quotations = require("../bin/talon").quotations;

describe("Quotations", function () {
  
  describe("Plain", function () {
    
    it("should detect pattern On Date Somebody Wrote", function () {
      let messageBody = "Test reply\n\n" + 
        "On 11-Apr-2011, at 6:54 PM, Roman Tkachenko <romant@example.com> wrote:\n\n" +
        ">\n> Test\n>\n> Roman";
      
      assert.equal("Test reply", quotations.extractFromPlain(messageBody));
    });
  });
});