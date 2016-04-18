"use strict";

const assert = require("chai").assert;
const quotations = require("../bin/talon").quotations;

describe("Quotations", function () {
  
  describe("Plain", function () {
    
    it("should detect pattern \"on <date> <somebody> wrote\".", function () {
      const messageBody = "Test reply\n\n" + 
        "On 11-Apr-2011, at 6:54 PM, Roman Tkachenko <romant@example.com> wrote:\n\n" +
        ">\n> Test\n>\n> Roman";
      
      assert.equal("Test reply", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect samsung-specific \"<somebody> wrote\".", function () {
      const messageBody = "Test reply\n\n" +
        "Sent from Samsung MobileName <address@example.com> wrote:\n\n" +
        ">\n> Test\n>\n> Roman";
      
      assert.equal("Test reply", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect \"on <date> wrote <somebody>\".", function () {
      const messageBody = "Lorem\n\n" +
        "Op 13-02-2014 3:18 schreef Julius Caesar <pantheon@rome.com>:\n\n" +
        "Veniam laborum mlkshk kale chips authentic. Normcore mumblecore laboris, fanny pack readymade eu blog chia pop-up freegan enim master cleanse.\n";

      assert.equal("Lorem", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect \"on <date> <somebody> wrote\", date with slashes.", function () {
      const messageBody = "Test reply\n\n" +
        "On 04/19/2011 07:10 AM, Roman Tkachenko wrote:\n\n" +
        ">\n> Test.\n>\n> Roman";
      
      assert.equal("Test reply", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect date+time email splitter.", function () {
      const messageBody = "Test reply\n\n" +
        "2014-10-17 11:28 GMT+03:00 Postmaster <\n" +
        "postmaster@sandboxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.mailgun.org>:\n\n" +
        "> First from site\n>\n    ";
        
      assert.equal("Test reply", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect pattern \"on <date> <somebody> wrote\" with space in front.", function () {
      const messageBody = "Thanks Thanmai\n" +
        "On Mar 8, 2012 9:59 AM, \"Example.com\" <\n" +
        "r+7f1b094ceb90e18cca93d53d3703feae@example.com> wrote:\n\n\n" +
        ">**\n>  Blah-blah-blah";
        
      assert.equal("Thanks Thanmai", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect pattern \"on <date> <somebody> sent\".", function () {
      const messageBody = "Test reply\n\n" +
        "On 11-Apr-2011, at 6:54 PM, Roman Tkachenko <romant@example.com> sent:\n\n" +
        ">\n> Test\n>\n> Roman";
        
      assert.equal("Test reply", quotations.extractFromPlain(messageBody));
    });
    
    it("shouldn't detect quote for line starting with \"on\".", function () {
      const messageBody = "Blah-blah-blah\nOn blah-blah-blah";
      assert.equal(messageBody, quotations.extractFromPlain(messageBody));      
    });
    
    it("should detect quote with splitter on same line.", function () {
      // Reply lines and "on <date> <person> wrote" splitter pattern are on the same line.
      const messageBody1 = "reply On Wed, Apr 4, 2012 at 3:59 PM, bob@example.com wrote:\n> Hi";        
      assert.equal("reply", quotations.extractFromPlain(messageBody1));
      
      // Test pattern "--- on <date> <person> wrote" with reply text on the same line.
      const messageBody2 = "reply--- On Wed, Apr 4, 2012 at 3:59 PM, me@domain.com wrote:\n> Hi";
      assert.equal("reply", quotations.extractFromPlain(messageBody2));
      
      // Test pattern "--- on <date> <person> wrote" with reply text containing "-" symbol.
      const messageBody3 = "reply\nbla-bla - bla--- On Wed, Apr 4, 2012 at 3:59 PM, me@domain.com wrote:\n> Hi";
      const reply3 = "reply\nbla-bla - bla";
      assert.equal(reply3, quotations.extractFromPlain(messageBody3));
    });
  });
});