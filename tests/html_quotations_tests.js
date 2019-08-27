"use strict";

const fs = require("fs");
const path = require("path");
const async = require("front-async");
const assert = require("chai").assert;
const utils = require("./utils");
const quotations = require("../bin/Talon").quotations;

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

      const reply = "<html><body>Reply</body></html>";

      assert.equal(reply, removeWhitespace(quotations.extractFromHtml(messageBody).body));
    });

    it("should find the reply with the quotation splitter outside the blockquote.", function () {
      const messageBody = "Reply\n\n" +
        "<div>\n" +
        "On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:\n" +
        "</div>\n\n" +
        "<blockquote>\n" +
        "<div>\n" +
        "Test\n" +
        "</div>\n"
        "</blockquote>";

      const reply = "<html><body>Reply</body></html>";

      assert.equal(reply, removeWhitespace(quotations.extractFromHtml(messageBody).body));
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

      const reply = "<html><body>Reply<blockquote>Regular</blockquote></body></html>";

      assert.equal(reply, removeWhitespace(quotations.extractFromHtml(messageBody).body));
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
        removeWhitespace(quotations.extractFromHtml(messageBody).body));
    });

    it("should find an empty reply from an empty body.", function () {
      assert.equal("", quotations.extractFromHtml("").body);
    });

    it("should validate that we always output valid HTML.", function () {
      const messageBody = "Reply\n" +
        "<div>\n" +
        "On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:\n\n" +
        "<blockquote>\n" +
        "<div>\n" +
        "Test\n" +
        "</div>\n" +
        "</blockquote>\n" +
        "</div>\n\n" +
        "<div/>\n";

      const result = quotations.extractFromHtml(messageBody).body;
      assert.isAtLeast(result.indexOf("<html>"), 0);
      assert.isAtLeast(result.indexOf("</html>"), 0);
    });

    it("should strip Gmail quote.", function () {
       const messageBody = `Reply
        <div class="gmail_quote">
          <div class="gmail_quote">
            On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:
            <div>
              Test
            </div>
          </div>
        </div>`;

      const reply = "<html><body>Reply         </body></html>";

      assert.equal(reply, quotations.extractFromHtml(messageBody).body);
    });

    it("should strip Gmail quote compact.", function () {
       const messageBody =  "Reply" +
        "<div class=\"gmail_quote\">" +
        "<div class=\"gmail_quote\">On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:" +
        "<div>Test</div>" +
        "</div>" +
        "</div>";

      const reply = "<html><body>Reply</body></html>";

      assert.equal(reply, removeWhitespace(quotations.extractFromHtml(messageBody).body));
    });

    it("shouldn't strip Gmail quote in blockquote.", function () {
       const messageBody =  "Message" +
        "<blockquote class=\"gmail_quote\">" +
        "<div class=\"gmail_default\">" +
        "My name is William Shakespeare." +
        "<br/>" +
        "</div>" +
        "</blockquote>";

      assert.equal(
        removeWhitespace("<html><body>Message</body></html>"),
        removeWhitespace(quotations.extractFromHtml(messageBody).body));
    });

    it("should detect reply with disclaimer after quote.", function () {
       const messageBody = "\n<html>\n" +
        "<body>\n" +
        "<div>\n" +
        "<div>\n" +
        "message\n" +
        "</div>\n" +
        "<blockquote>\n" +
        "Quote\n" +
        "</blockquote>\n" +
        "</div>\n" +
        "<div>\n" +
        "disclaimer\n" +
        "</div>\n" +
        "</body>\n" +
        "</html>\n";

      const reply = "\n<html>\n" +
        "<body>\n" +
        "<div>\n" +
        "<div>\n" +
        "message\n" +
        "</div>\n" +
        "</div>\n" +
        "<div>\n" +
        "disclaimer\n" +
        "</div>\n" +
        "</body>\n" +
        "</html>\n";

      assert.equal(
        removeWhitespace(reply),
        removeWhitespace(quotations.extractFromHtml(messageBody).body));
    });

    it("should detect reply with \"date\" block splitter.", function () {
      const messageBody = "\n<div>" +
        "message<br>\n" +
        "<div>\n" +
        "<hr>\n" +
        "Date: Fri, 23 Mar 2012 12:35:31 -0600<br>\n" +
        "To: <a href=\"mailto:bob@example.com\">bob@example.com</a><br>\n" +
        "From: <a href=\"mailto:rob@example.com\">rob@example.com</a><br>\n" +
        "Subject: You Have New Mail From Mary!<br><br>\n\n" +
        "text\n" +
        "</div>\n" +
        "</div>\n";

      const reply = "<html><body><div>message<br/></div></body></html>";


      assert.equal(reply, removeWhitespace(quotations.extractFromHtml(messageBody).body));
    });

    it("should detect reply with \"from\" block splitter.", function () {
      const messageBody = `<div>
        message<br>
        <div>
        <hr>
        From: <a href="mailto:bob@example.com">bob@example.com</a><br>
        Date: Fri, 23 Mar 2012 12:35:31 -0600<br>
        To: <a href="mailto:rob@example.com">rob@example.com</a><br>
        Subject: You Have New Mail From Mary!<br><br>

        text
        </div></div>`;

      const reply = "<html><body><div>message<br/></div></body></html>";

      assert.equal(reply, removeWhitespace(quotations.extractFromHtml(messageBody).body));
    });

    it("should detect reply with content in same element as \"from\" block splitter.", function () {
      const messageBody = `
        <body>
          <div>

            Blah<br><br>

            <hr>Date: Tue, 22 May 2012 18:29:16 -0600<br>
            To: xx@hotmail.ca<br>
            From: quickemail@ashleymadison.com<br>
            Subject: You Have New Mail From x!<br><br>

          </div>
        </body>`;

      const reply = "<html><body><div>Blah<br/><br/></div></body></html>";
      assert.equal(reply, removeWhitespace(quotations.extractFromHtml(messageBody).body));
    });
  });

  describe("Talon fixtures", function () {

    it("should find reply in OLK src body section.", function (done) {
      return fs.readFile(path.join("tests", "fixtures", "talon", "OLK_SRC_BODY_SECTION.html"), "utf-8", function (err, html) {
        if (err)
          return done(err);

        const reply = "<html><body><div>Reply</div></body></html>";
        assert.equal(reply, removeWhitespace(quotations.extractFromHtml(html).body));
        done();
      });
    });

    it("should find reply with <hr> separator.", function (done) {
      return fs.readFile(path.join("tests", "fixtures", "talon", "reply-separated-by-hr.html"), "utf-8", function (err, html) {
        if (err)
          return done(err);

        const reply = "<html><body><div>Hi<div>there</div><div>Bob<hr/><br/></div></div></body></html>";
        assert.equal(reply, removeWhitespace(quotations.extractFromHtml(html).body));
        done();
      });
    });

    it("should use fixtures to test ExtractFromHtml method.", function (done) {
      // List the fixtures.
      const htmlRepliesPath = path.join("tests", "fixtures", "talon", "html_replies");
      return fs.readdir(htmlRepliesPath, (err, files) => {
        if (err)
          return done(err);

        // Iterate on the files we found.
        return async.eachSeries(files, (file, nextFile) => {

          // Read the file.
          return fs.readFile(path.join(htmlRepliesPath, file), "utf-8", (err, html) => {
            if (err)
              return nextFile(err);

            const replyHtml = quotations.extractFromHtml(html).body;
            const replyPlain = utils.htmlToText(replyHtml);

            assert.equal(
              removeWhitespace("Hi. I am fine.\n\nThanks,\nAlex"),
              removeWhitespace(replyPlain));

            return nextFile();
          });
        }, done);
      });
    });
  });

  describe("Nylas fixtures", function () {

    it("should use fixtures to test ExtractFromHtml method.", function (done) {
      // List the fixtures.
      const htmlRepliesPath = path.join("tests", "fixtures", "nylas");
      return fs.readdir(htmlRepliesPath, (err, files) => {
        if (err)
          return done(err);

        // Iterate on the files we found.
        return async.eachSeries(files, (file, nextFile) => {
          // If this is one of the stripped files, skip.
          if (file.indexOf("stripped") >= 0)Psearch
            return nextFile();

          // Read the file.
          return fs.readFile(path.join(htmlRepliesPath, file), "utf-8", (err1, html) =>
            fs.readFile(path.join(htmlRepliesPath, file.slice(0, -5) + "_stripped.html"), "utf-8", (err2, htmlStripped) => {
              if (err1)
                return nextFile(err1);

              if (err2)
                return nextFile(err2);

              const replyHtml = quotations.extractFromHtml(html).body;
              assert.equal(
                removeWhitespace(htmlStripped),
                removeWhitespace(replyHtml));

              return nextFile();
            })
          );
        }, done);
      });
    });
  });

  describe("Front fixtures", function () {

    it("should correctly render Outlook comments.", function (done) {
      return fs.readFile(path.join("tests", "fixtures", "front", "email_with_conditional_comments.html"), "utf-8", (err, html) => {
        if (err)
          return done(err);

        // Extract the quote.
        var replyHtml = quotations.extractFromHtml(html).body;

        // Make sure it doesn't contain the incriminating string.
        assert.notInclude(replyHtml, "<![if !supportLists]>", "The reply does not keep Word comments");
        assert.notInclude(replyHtml, "&lt;![if !supportLists]>", "The reply does not transform Word comments");
        done();
      });
    });

    it("should correctly render emails with From: not followed by @ or Sent.", function (done) {
      return fs.readFile(path.join("tests", "fixtures", "front", "email_with_from.html"), "utf-8", (err, html) => {
        if (err)
          return done(err);

        // Extract the quote.
        var replyHtml = quotations.extractFromHtml(html).body;

        assert.include(replyHtml, "29 missing", "The reply does not cut From:");
        done();
      });
    });

    it("should correctly detect tables.", function (done) {
      return fs.readFile(path.join("tests", "fixtures", "front", "email_with_table.html"), "utf-8", (err, html) => {
        if (err)
          return done(err);

        // Extract the quote.
        var replyHtml = quotations.extractFromHtml(html).body;

        assert.equal(
          removeWhitespace(utils.htmlToText(replyHtml)),
          removeWhitespace(utils.htmlToText(html)));
        done();
      });
    });

    it("should not crash when no XmlDom document is found.", function (done) {
      return fs.readFile(path.join("tests", "fixtures", "front", "email_with_no_doc.html"), "utf-8", (err, html) => {
        if (err)
          return done(err);

        // Extract the quote.
        quotations.extractFromHtml(html).body;
        done();
      });
    });

    it("should correctly parse quotation.", function (done) {
      return fs.readFile(path.join("tests", "fixtures", "front", "email_error_quote.html"), "utf-8", (err, html) => {
        if (err)
          return done(err);

        // Extract the quote.
        const replyHtml = quotations.extractFromHtml(html).body;
        assert.notInclude(replyHtml, "Bla");
        return done();
      });
    });

    it("should correctly parse email with \n.", function (done) {
      return fs.readFile(path.join("tests", "fixtures", "front", "email_error_line_break.html"), "utf-8", (err, html) => {
        if (err)
          return done(err);

        // Extract the quote.
        const replyHtml = quotations.extractFromHtml(html).body;
        assert.notInclude(replyHtml, "Hello from quote");
        return done();
      });
    });

    it("should correctly parse email with gmail quote in reply.", function (done) {
      return fs.readFile(path.join("tests", "fixtures", "front", "email_with_quote.html"), "utf-8", (err, html) => {
        if (err)
          return done(err);

         // Extract the quote.
        const replyHtml = quotations.extractFromHtml(html).body;
        assert.include(replyHtml, "Too often, how we work with people outside");
        return done();
      });
    });

       it("should correctly parse email with signature in reply.", function (done) {
      return fs.readFile(path.join("tests", "fixtures", "front", "email_with_signature.html"), "utf-8", (err, html) => {
        if (err)
          return done(err);

         // Extract the quote.
        const replyHtml = quotations.extractFromHtml(html).body;
        assert.notInclude(replyHtml, "Leo Vck");
        return done();
      });
    });

    it("should test emails that used to crash extractFromHtml.", function (done) {
      // List the fixtures.
      const htmlRepliesPath = path.join("tests", "fixtures", "front", "crashers");
      return fs.readdir(htmlRepliesPath, (err, files) => {
        if (err)
          return done(err);

        // Iterate on the files we found.
        return async.eachSeries(files, (file, nextFile) => {
          // Read the file.
          return fs.readFile(path.join(htmlRepliesPath, file), "utf-8", (err, html) => {
            if (err)
              return nextFile(err);

            quotations.extractFromHtml(html);
            return nextFile();
          });
        }, done);
      });
    });
  });

});

function removeWhitespace(str) {
  return str && str.replace(/\s/g, "");
}
