"use strict";

const fs = require("fs");
const path = require("path");
const async = require("front-async");
const assert = require("chai").assert;
const utils = require("./utils");
const quotations = require("../bin/talon").quotations;

describe("Quotations", function () {
  
  describe("Extract plain", function () {
    
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
    
    function checkPatternOriginalMessage(originalMessageIndicator) {
      const messageBody = "Test reply\n\n" +
        `-----${originalMessageIndicator}-----\n\n` + 
        "Test";
        
      assert.equal("Test reply", quotations.extractFromPlain(messageBody));
    }
    
    it("should detect pattern \"original message\" in English.", function () {
      checkPatternOriginalMessage("Original Message");
      checkPatternOriginalMessage("Reply Message");
    });
    
    it("should detect pattern \"original message\" in German.", function () {
      checkPatternOriginalMessage("Ursprüngliche Nachricht");
      checkPatternOriginalMessage("Antwort Nachricht");
    });
    
    it("should detect pattern \"original message\" in Danish.", function () {
      checkPatternOriginalMessage("Oprindelig meddelelse");
    });
    
    it("should detect message after quote.", function () {
      const messageBody = "On 04/19/2011 07:10 AM, Roman Tkachenko wrote:\n\n" +
        ">\n> Test\nTest reply";
        
      assert.equal("Test reply", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect message around quote.", function () {
      const messageBody = "Test reply\n\n" +
        "On 04/19/2011 07:10 AM, Roman Tkachenko wrote:\n\n" +
        ">\n> Test\n\n" +
        "Regards, Roman";
      const reply = "Test reply\n\nRegards, Roman";
        
      assert.equal(reply, quotations.extractFromPlain(messageBody));
    });
    
    it("should detect message around nested quote.", function () {
      const messageBody = "Test reply\n" +
        "On 04/19/2011 07:10 AM, Roman Tkachenko wrote:\n\n" +
        ">Test test\n" +
        ">On 04/19/2011 07:10 AM, Roman Tkachenko wrote:\n" +
        ">\n>>\n>> Test.\n>>\n>> Roman\n\n" +
        "Regards, Roman";
      const reply = "Test reply\nRegards, Roman";
        
      assert.equal(reply, quotations.extractFromPlain(messageBody));
    });
    
    it("should detect quote with separator on 2 lines.", function () {
      const messageBody = "Test reply\n\n" +
        "On Fri, May 6, 2011 at 6:03 PM, Roman Tkachenko from Hacker News\n" +
        "<roman@definebox.com> wrote:\n\n" +
        "> Test.\n>\n> Roman\n\n" +
        "Regards, Roman";
      const reply = "Test reply\n\nRegards, Roman";
        
      assert.equal(reply, quotations.extractFromPlain(messageBody));
    });
    
    it("should detect quote with separator on 3 lines.", function () {
      const messageBody = "Test reply\n\n" +
        "On Nov 30, 2011, at 12:47 PM, Somebody <\n" +
        "416ffd3258d4d2fa4c85cfa4c44e1721d66e3e8f4@somebody.domain.com>\n" +
        "wrote:\n\n" +
        "Test message\n";
        
      assert.equal("Test reply", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect short quote.", function () {
      const messageBody = "Hi\n\n" +
        "On 04/19/2011 07:10 AM, Roman Tkachenko wrote:\n\n" +
        "> Hello";
        
      assert.equal("Hi", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect quote with indentation.", function () {
      const messageBody = "YOLO salvia cillum kogi typewriter mumblecore cardigan skateboard Austin.\n\n" +
        "------On 12/29/1987 17:32 PM, Julius Caesar wrote-----\n\n" +
        "Brunch mumblecore pug Marfa tofu, irure taxidermy hoodie readymade pariatur.\n\t"; 
      const reply = "YOLO salvia cillum kogi typewriter mumblecore cardigan skateboard Austin.";
        
      assert.equal(reply, quotations.extractFromPlain(messageBody));
    });
    
    it("should detect short quote with newline.", function () {
      const messageBody = "Btw blah blah...\n\n" +
        "On Tue, Jan 27, 2015 at 12:42 PM -0800, \"Company\" <christine.XXX@XXX.com> wrote:\n\n" +
        "Hi Mark,\n" +
        "Blah blah?\n" +
        "Thanks,Christine\n\n" +
        "On Jan 27, 2015, at 11:55 AM, Mark XXX <mark@XXX.com> wrote:\n\n" +
        "Lorem ipsum?\n" +
        "Mark\n\n" +
        "Sent from Acompli";
        
      assert.equal("Btw blah blah...", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect pattern \"<date> <email>\" with unicode.", function () {
      const messageBody = "Replying ok\n" +
        "2011/4/7 Nathan \xd0\xb8ova <support@example.com>\n\n"
        ">  Cool beans, scro";
        
      assert.equal("Replying ok", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect \"From\" block in English.", function () {
      const messageBody = "Allo! Follow up MIME!\n\n" +
        "From: somebody@example.com\n" +
        "Sent: March-19-11 5:42 PM\n" +
        "To: Somebody\n" +
        "Subject: The manager has commented on your Loop\n\n" +
        "Blah-blah-blah\n";

      assert.equal("Allo! Follow up MIME!", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect \"From\" block in German.", function () {
      const messageBody = "Allo! Follow up MIME!\n\n" +
        "Von: somebody@example.com\n" +
        "Gesendet: Dienstag, 25. November 2014 14:59\n" +
        "An: Somebody\n" +
        "Betreff: The manager has commented on your Loop\n\n" +
        "Blah-blah-blah\n";

      assert.equal("Allo! Follow up MIME!", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect multiline \"From\" block in French.", function () {
      const messageBody = "Lorem ipsum\n\n" +
        "De : Brendan xxx [mailto:brendan.xxx@xxx.com]\n" +
        "Envoyé : vendredi 23 janvier 2015 16:39\n" +
        "À : Camille XXX\n" +
        "Objet : Follow Up\n\n" +
        "Blah-blah-blah\n";

      assert.equal("Lorem ipsum", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect \"From\" block in French.", function () {
      const messageBody = "Lorem ipsum\n\n" +
        "Le 23 janv. 2015 à 22:03, Brendan xxx <brendan.xxx@xxx.com<mailto:brendan.xxx@xxx.com>> a écrit:\n\n" +
        "Bonjour!";

      assert.equal("Lorem ipsum", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect \"From\" block in Polish.", function () {
      const messageBody = "Lorem ipsum\n\n" +
        "W dniu 28 stycznia 2015 01:53 użytkownik Zoe xxx <zoe.xxx@xxx.com>\n\n" +
        "napisał:\n\n"
        "Blah!\n";

      assert.equal("Lorem ipsum", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect \"From\" block in Danish.", function () {
      const messageBody = "Allo! Follow up MIME!\n\n" +
        "Fra: somebody@example.com\n" +
        "Sendt: 19. march 2011 12:10\n" +
        "Til: Somebody\n" +
        "Emne: The manager has commented on your Loop\n\n" +
        "Blah-blah-blah\n";

      assert.equal("Allo! Follow up MIME!", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect \"From\" block in Swedish.", function () {
      const messageBody = "Lorem\n" +
        "Den 14 september, 2015 02:23:18, Valentino Rudy (valentino@rudy.be) skrev:\n\n" +
        "Veniam laborum mlkshk kale chips authentic. Normcore mumblecore laboris, fanny pack readymade eu blog chia pop-up freegan enim master cleanse.\n";

      assert.equal("Lorem", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect \"From\" block in Norwegian.", function () {
      const messageBody = "Lorem\n" +
        "På 14 september 2015 på 02:23:18, Valentino Rudy (valentino@rudy.be) skrev:\n\n" +
        "Veniam laborum mlkshk kale chips authentic. Normcore mumblecore laboris, fanny pack readymade eu blog chia pop-up freegan enim master cleanse.\n";

      assert.equal("Lorem", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect \"From\" block in Dutch.", function () {
      const messageBody = "Gluten-free culpa lo-fi et nesciunt nostrud.\n\n" +
        "Op 17-feb.-2015, om 13:18 heeft Julius Caesar <pantheon@rome.com> het volgende geschreven:\n\n" +
        "Small batch beard laboris tempor, non listicle hella Tumblr heirloom.\n";

      assert.equal("Gluten-free culpa lo-fi et nesciunt nostrud.", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect a false-positive quote marker.", function () {
      const messageBody = "Visit us now for assistance...\n" +
        ">>> >>>  http://www.domain.com <<<\n" +
        "Visit our site by clicking the link above";

      assert.equal(messageBody, quotations.extractFromPlain(messageBody));
    });
    
    it("should detect quote with link closed on quote marker line.", function () {
      const messageBody = "8.45am-1pm\n\n" +
        "From: somebody@example.com\n\n" +
        "<http://email.example.com/c/dHJhY2tpbmdfY29kZT1mMDdjYzBmNzM1ZjYzMGIxNT\n" +
        ">  <bob@example.com <mailto:bob@example.com> >\n\n" +
        "Requester: ";
        
      assert.equal("8.45am-1pm", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect quote with link breaking quote sequence.", function () {
      // Link starts and ends on the same line.
      const messageBody1 = "Blah\n\n" +
        "On Thursday, October 25, 2012 at 3:03 PM, life is short. on Bob wrote:\n\n" +
        ">\n> Post a response by replying to this email\n>\n" +
        "(http://example.com/c/YzOTYzMmE) >\n" +
        "> life is short. (http://example.com/c/YzMmE)\n>\n";
        
      assert.equal("Blah", quotations.extractFromPlain(messageBody1));
      
      // Link starts after some text on one line and ends on another.
      const messageBody2 = "Blah\n\n" +
        "On Monday, 24 September, 2012 at 3:46 PM, bob wrote:\n\n" +
        "> [Ticket #50] test from bob\n" +
        ">\n> View ticket (http://example.com/action\n_nonce=3dd518)\n>\n";
      
      assert.equal("Blah", quotations.extractFromPlain(messageBody2));
    });
    
    it("should detect \"From\" that starts with date.", function () {
      const messageBody = "Blah\n\n" +
        "Date: Wed, 16 May 2012 00:15:02 -0600\n" +
        "To: klizhentas@example.com";

      assert.equal("Blah", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect bold \"From\" block.", function () {
      const messageBody = "Hi\n\n" +
        "\t*From:* bob@example.com [mailto:\n" +
        "\tbob@example.com]\n" +
        "\t*Sent:* Wednesday, June 27, 2012 3:05 PM\n" +
        "\t*To:* travis@example.com\n" +
        "\t*Subject:* Hello\n\n";

      assert.equal("Hi", quotations.extractFromPlain(messageBody));
    });
    
    it("should detect \"Date\" block with weird format.", function () {
      const messageBody = "Blah\n" +
        "Date: Fri=2C 28 Sep 2012 10:55:48 +0000\n" +
        "From: tickets@example.com\n" +
        "To: bob@example.com\n" +
        "Subject: [Ticket #8] Test\n";

      assert.equal("Blah", quotations.extractFromPlain(messageBody));
    });
    
    it("shouldn't exclude quote for forwarded message.", function () {
      const messageBody = "FYI\n\n" +
        "---------- Forwarded message ----------\n" +
        "From: bob@example.com\n" +
        "Date: Tue, Sep 4, 2012 at 1:35 PM\n" +
        "Subject: Two\n" +
        "line subject\n" +
        "To: rob@example.com\n\n" +
        "Text";

      assert.equal(messageBody, quotations.extractFromPlain(messageBody));
    });
    
    it("should exclude forwarded message in reply quote.", function () {
      const messageBody = "Blah\n\n" +
        "-----Original Message-----\n" + 
        "FYI\n\n" +
        "---------- Forwarded message ----------\n" +
        "From: bob@example.com\n" +
        "Date: Tue, Sep 4, 2012 at 1:35 PM\n" +
        "Subject: Two\n" +
        "line subject\n" +
        "To: rob@example.com\n\n";

      assert.equal("Blah", quotations.extractFromPlain(messageBody));
    });
  
    it("should pre-process and post-process links.", function () {
      const messageBody = "<http://link1> <http://link2>";
      assert.equal(messageBody, quotations.extractFromPlain(messageBody));
    });
  });
  
  describe("Mark message lines", function () {
  
    // e - empty line.
    // s - splitter line.
    // m - line starting with quotation marker ">".
    // t - the rest.
    
    it("should detect single-line splitter.", function () {
      const lines = [
        "Hello", 
        "",
        // Next line should be marked as splitter.
        "_____________",
        "From: foo@bar.com",
        "",
        "> Hi",
        "",
        "Signature"
      ];
      
      assert.equal("tessemet", quotations.markMessageLines(lines));
    });
    
    it("sould detect multi-line splitter.", function () {
      const lines = [
        "Just testing the email reply",
        "",
        "Robert J Samson",
        "Sent from my iPhone",
        "",
        // All 3 next lines should be marked as splitters.
        "On Nov 30, 2011, at 12:47 PM, Skapture <",
        "416ffd3258d4d2fa4c85cfa4c44e1721d66e3e8f4@skapture-staging.mailgun.org>",
        "wrote:",
        "",
        "Tarmo Lehtpuu has posted the following message on"
      ];
      
      assert.equal("tettessset", quotations.markMessageLines(lines));
    });
  });
  
  describe("Process marked lines", function () {
    
    it("should detect last message with quote and message mixed.", function () {
      const markers = "tsemmtetm";
      const lines = Array.apply(null, Array(markers.length)).map(function (_, i) { return i.toString(); });

      assert.deepEqual(lines, quotations.processMarkedLines(lines, markers).lastMessageLines);
    });
    
    it("shouldn't find quote if there are no splitters.", function () {
      const markers = "tmm";
      const lines = Array.apply(null, Array(markers.length)).map(function (_, i) { return i.toString(); });

      assert.deepEqual(lines, quotations.processMarkedLines(lines, markers).lastMessageLines);
    });
    
    it("should find quote for text after splitter without quotation marks.", function () {
      const markers = "tst";
      const lines = Array.apply(null, Array(markers.length)).map(function (_, i) { return i.toString(); });

      assert.deepEqual(["0"], quotations.processMarkedLines(lines, markers).lastMessageLines);
    });
    
    it("should find quote after text and before signature.", function () {
      const markers = "tsmt";
      const lines = Array.apply(null, Array(markers.length)).map(function (_, i) { return i.toString(); });

      assert.deepEqual(["0", "3"], quotations.processMarkedLines(lines, markers).lastMessageLines);
    });
    
    it("should find nested quote after text.", function () {
      const markers = "tstsmt";
      const lines = Array.apply(null, Array(markers.length)).map(function (_, i) { return i.toString(); });

      assert.deepEqual(["0"], quotations.processMarkedLines(lines, markers).lastMessageLines);
    });
    
    it("should find quote with multi-line link 1.", function () {
      const markers = "tsmttem";
      const lines = [
        "text",
        "splitter",
        ">View (http://example.com",
        "/abc",
        ")",
        "",
        "> quote"
      ];

      assert.deepEqual(lines.slice(0, 1), quotations.processMarkedLines(lines, markers).lastMessageLines);
    });
    
    it("should find quote with multi-line link 2.", function () {
      const markers = "tmmmtm";
      const lines = [
        "text",
        ">",
        ">",
        ">",
        "(http://example.com) >  ",
        "> life is short. (http://example.com)  "
      ];

      assert.deepEqual(lines.slice(0, 1), quotations.processMarkedLines(lines, markers).lastMessageLines);
    });
    
    it("should ignore quote with inline replies.", function () {
      const markers = "tsmtmtm";
      const lines = [
        "text",
        "splitter",
        ">",
        "(http://example.com)",
        ">",
        "inline  reply",
        ">"
      ];

      assert.deepEqual(lines, quotations.processMarkedLines(lines, markers).lastMessageLines);
    });
    
    it("should ignore quote with inline reply containing plain link.", function () {
      const markers = "tsmtm";
      const lines = [
        "text",
        "splitter",
        ">",
        "inline reply with link http://example.com",
        ">"
      ];

      assert.deepEqual(lines, quotations.processMarkedLines(lines, markers).lastMessageLines);
   });
   
   it("should ignore quote with inline reply containing link in parenthesis.", function () {
      const markers = "tsmtm";
      const lines = [
        "text",
        "splitter",
        ">",
        "inline  reply (http://example.com)",
        ">"
      ];

      assert.deepEqual(lines, quotations.processMarkedLines(lines, markers).lastMessageLines);
   });
  });
  
  describe("Pre-process", function () {
    
    it("should rewrite links and prepend \"on <date> <somebody> wrote\" pattern with new line.", function () {
      const message = "Hello\n" +
        "See <http://google.com\n" +
        "> for more\n" +
        "information On Nov 30, 2011, at 12:47 PM, Somebody <\n" +
        "416ffd3258d4d2fa4c85cfa4c44e1721d66e3e8f4\n" +
        "@example.com>" +
        "wrote:\n" +
        "\n" +
        "> Hi";
        
      const expected = "Hello\n" +
        "See @@http://google.com\n" +
        "@@ for more\n" +
        "information\n" +
        " On Nov 30, 2011, at 12:47 PM, Somebody <\n" +
        "416ffd3258d4d2fa4c85cfa4c44e1721d66e3e8f4\n" +
        "@example.com>" +
        "wrote:\n" +
        "\n" +
        "> Hi";
        
      assert.equal(expected, quotations.preprocess(message, "\n"));
    });
    
    it("shouln't update valid message.", function () {
      const message = "Hello\n" +
        "How are you? On Nov 30, 2011, at 12:47 PM,\n " +
        "Example <\n" +
        "416ffd3258d4d2fa4c85cfa4c44e1721d66e3e8f4\n" + 
        "@example.org>" +
        "wrote:\n" + 
        "\n" +
        "> Hi";
        
      assert.equal(message, quotations.preprocess(message, "\n"));
    });
    
    it("should prepend \"on <date> <somebody> wrote\" pattern with new line.", function () {
      const message = "Hello On Nov 30, smb wrote:\n" +
        "Hi\n" +
        "On Nov 29, smb wrote:\n" +
        "hi";
        
      const expected = "Hello\n" +
        " On Nov 30, smb wrote:\n" +
        "Hi\n" +
        "On Nov 29, smb wrote:\n" +
        "hi";
        
      assert.equal(expected, quotations.preprocess(message, "\n"));
    });
  });
  
  describe("Talon fixtures", function () {
    
    it("should find reply in quotations share block.", function (done) {
      return utils.parseEmlText(path.join("tests", "fixtures", "talon", "reply-quotations-share-block.eml"), function (err, text) {
        if (err)
          return done(err);
          
        const strippedText = quotations.extractFromPlain(text);
        assert.isOk(strippedText);
        assert.equal(strippedText.indexOf("From"), -1);
        done();
      });
    });
    
    it("should use fixtures to test ExtractFromPlain method.", function (done) {
      // List the fixtures.
      const standardRepliesPath = path.join("tests", "fixtures", "talon", "standard_replies");
      return fs.readdir(standardRepliesPath, function (err, files) {
        if (err)
          return done(err);
        
        // Iterate on the files we found.
        return async.eachSeries(files, (file, nextFile) => {
          // We're only interested in email files.
          if (file.substr(-4) !== ".eml")
            return nextFile();
            
          return async.series({
            
            // Parse the EML file.
            emailText: next => utils.parseEmlText(path.join(standardRepliesPath, file), next),
            
            // Try and load the reply text for this message.
            replyText: next => utils.tryReadFile(path.join(standardRepliesPath, file.slice(0, -4) + "_reply_text"), next),
            
            // Compare the results.
            checkText: (next, results) => {
              // Try and extract the reply from the loaded message.
              const extractedText = quotations.extractFromPlain(results.emailText);
              
              // Compare the reply text and the extracted text.
              assert.equal((results.replyText || "Hello").replace(/\r\n/g, "\n").trim(), extractedText);
              return next();
            }
          }, nextFile);
        }, done);
      });
    });
  });
});