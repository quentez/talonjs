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

      const result = quotations.extractFromHtml(messageBody);
      assert.equal(
        removeWhitespace("<html><body>Message</body></html>"),
        removeWhitespace(result.body));
      assert.isFalse(result.didUseCheckpoints);
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

      const result = quotations.extractFromHtml(messageBody);
      assert.equal(removeWhitespace(reply), removeWhitespace(result.body));
      assert.isFalse(result.didUseCheckpoints);
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

    it("should not find splitter lines in the middle of reply", function () {
      const messageBody = `
        <html>
          <body>
            <div dir=\"ltr\"><div>Resending this:</div>
              <div dir=\"ltr\"><br></div>
              <div dir=\"ltr\">
                Hi Recipient,
                <div><br></div>
                <div>Thanks for following up.</div><div><br></div>
                <div>I actually wanted to reach out about the info you provided: </div>
                <div>
                  <ul>
                    <li>On the previous two occasions, when David sent us the photos, only the blue sloth was available for adoption.</li>
                    <li>This list, with the additional requested information, would be nice.</li>
                    <li>And yes, we can add a gift note to the box.</li>
                  </ul>
                  <div>Also, would you like to purchase a frame?</div>
                  <div><br></div>
                  <div>Best,</div>
                  <div class=\"gmail_quote\">
                    <div dir=\"ltr\" class=\"gmail_attr\"><br></div>
                    <div><br></div>
                    -- <br>
                    <div dir=\"ltr\" class=\"gmail_signature\"><div><div dir=\"ltr\">Signature</div></div></div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      // Extract the quote.
      const replyHtml = quotations.extractFromHtml(messageBody).body;

      assert.include(replyHtml, "On the previous two occasions", "The reply does not cut message content that resembles a splitter line");
      assert.include(replyHtml, "Best,", "The reply does not cut the line before the signature");
    });

    it("should not remove quotes in middle of message", function () {
      const messageBody = `
        <html>
            <body>
              <div>Hello
                <div><br /></div>
                <div>I like to add quote in the middle of my message.</div>
                <div><br /></div>
                <div>&gt; First quote.</div>
                <div>&gt; Second quote</div>
                <div>&gt; Last quote.</div>
                <div><br /></div>
                <div>Please do not erase them. </div>
                <div><br /></div>
                <div>John Doe</div>
              </div>
            </body>
        </html>`;

      assert.equal(removeWhitespace(messageBody), removeWhitespace(quotations.extractFromHtml(messageBody).body));
    });

    it("should not crop whole message when it contains img only.", function () {
      const messageBody = `
        <html>
            <body>
                <div style="/* inherit */" class="fa-xnt3do">
                    <div>
                        <img data-front-emoji-shortcode=":heart:" alt="❤️" src="https://assets.frontapp.com/emoji-data-1806/img-apple-64/2764-fe0f.png" width="20" height="20" style="vertical-align: -4.55px;" />
                    </div>
                </div>
                <img src="https://app.frontapp.com/api/1/noauth/companies/front/seen/msg_80hpmtf/han_k81flv/2396aa71.gif" style="width: 1px; height: 1px" />
                <br />
                <blockquote type="cite" class="front-blockquote">
                    On December 11, 2019, 11:05 AM GMT+1 <a href="mailto:someone@frontapp.com" target="_blank" rel="noopener noreferrer">someone@something.com</a> wrote:
                    <br />
                    <br />
                    <div id="fae_80hsp1f-rfd3bm">
                        <div class="fa-jsgtee" style="/* inherit */">
                            <div>Some content.</div>
                            <div>
                                <img style="width: 600px;" alt src="/api/1/companies/front/attachments/5b86f0264aebfc800b300a77658ae8c31f41bf74?resource_link_id=30120692419" front-cid="e57f80fb49bbaf17d8f3e99e427c676d" />
                            </div>
                            <br />
                            <div class="front-signature fa-qnztnn">
                                <div>—</div>
                                <div>Someone</div>
                                <div><i>Some role <a rel="noopener noreferrer" href="https://frontapp.com/" target="_blank">@Front</a></i></div>
                            </div>
                        </div>
                        <img style="width: 1px; height: 1px" src="https://app.frontapp.com/api/1/noauth/companies/front/seen/msg_80dc1mr/han_hd49j7/da545b6f.gif" />
                    </div>
                </blockquote>
                <img src="https://ext.frontusercontent.com/v1/proxy/bdvqrE0TTN8_Ic5PjD8arw-1hKL4iEy13mxqINSdGG0KXiqdWMckzSmhR3yyxOo8d9qp36FsKaUXeQTqUuIl43iRSgztQExMClUW3t4Qxk2-oIo2-f4x-mgFH6OC6ba68VrvhkB6R-QLr6zdWW_DebaRq8WyR5BH4Qtq1e5EI8lJuNczrzSqQbe4I5xk6pKxlueSEEoSoupJHnWiBsXa10Bh0HMWtAn8nKzNLj0vlnYDD9zGkVKicrHdlp8IAGO2xxbG5rizKnsvAQyU9ogEFA5H90yQgsk97Qr1glKJ8ORcRkEY8goscTtQANKCN1D1JB0UrGeW_EYTWZIfKwUq5OUMy2jKrJHW3eCmvP-4MtR7GtLykatTx5H-9DKUDKlDAzO0GnX0Ih9u8EI_gWcR-2L9vWWlQMzmSRo6Jffe9SDiBVExzpsG-mBehpAYaovv3W41ciGqo3HFmDcYHH2s76oPA6wVK3TQ-BCYs1GRLcXwPK29wf8SXkL9Trj8UOhrJAu5Nbo6ldxV1TVjvA06mx_b44XTHUtP7Hv1_QpbpDSp5-L5TgZNIzzzwNpq6Hd_7MEW8wAID-471Z21qG64bP-eSW3rtCbl6a8lNmAH4XcZhKbmtNlPvZQw88igNGoqMRbKOCQmSTT0-dWPkeJysG5RjbGocoqLxzSjI2vaSbSDojjaHH8xDew4lXOcgSIC4QPQw5Qx6mzhDeWwLD34S_SImVv5wXo22zKvuFitW4-eig#https://u7381212.ct.sendgrid.net/wf/open?upn=-2FO4r-2Bv3idb-2FUifLo2WiIBilgL0hkwazTSrgrT-2B9mVRCB8FYhih3Hp-2F1t7uO-2Bru9bkVUBUl4drm9mM5iKVk97mHsBnj9Eg9f9gG-2FoQp49vOmXOlS8ceAbNxOSUuvjTLHCIF7EwgBg0DYIqsyir-2B5EnqIjESfga96zN9o6MHevDIKjKu7kXwDJatgpAW27LEl4zQpjeVHhM6vEACWvJW3ODkv0xEjLlrZKrNCoes72-2FlApZHts8aSu-2Fk6v5ab3HZPfHou4ZEzspp4BQaf-2BcGwe5R-2FWbEdyOb0vPY8-2Bcue5QKIXrDjITKJm8zZKDhUiuRcb6pq4grze4OJCGtRtD29nBUTnu4RW2UgKkrZiyV7PShBac7g-2BoulmRmHH1JpAoQe3Nn3r6H15pJWKnZFz2YJQ9w-3D-3D" alt width="1" height="1" border="0" style="height:1px !important;width:1px !important;border-width:0 !important;margin-top:0 !important;margin-bottom:0 !important;margin-right:0 !important;margin-left:0 !important;padding-top:0 !important;padding-bottom:0 !important;padding-right:0 !important;padding-left:0 !important;" />
             </body>
        </html>`;

      const expectedLightBody =`<html><body><div style="/* inherit */" class="fa-xnt3do"><div><img data-front-emoji-shortcode=":heart:" alt="❤️" src="https://assets.frontapp.com/emoji-data-1806/img-apple-64/2764-fe0f.png" width="20" height="20" style="vertical-align: -4.55px;" /></div></div><img src="https://app.frontapp.com/api/1/noauth/companies/front/seen/msg_80hpmtf/han_k81flv/2396aa71.gif" style="width: 1px; height: 1px" /><br /></body></html>`;
      const computedLightBody = quotations.extractFromHtml(messageBody).body;

      assert.equal(removeWhitespace(expectedLightBody), removeWhitespace(computedLightBody));
    });
  });

  describe("Forwarded messages", function () {

    const forwardedMessage = `
      <div><br><br>Sent from my iPad</div>
      <div><br>--- Forwarded message ---<br><br></div>
      <blockquote type=\"cite\">
        <div><b>From:</b> Ms. Smith &lt;<a href=\"mailto:mssmith123@gmail.com\">mssmith123@gmail.com</a>&gt;<br><b>Date:</b> November 12, 2019 at 3:27:21 PM EST<br><b>To:</b> <a href=\"mailto:support@company.com\">support@company.com</a><br><b>Subject:</b> <b>This is the subject</b><br><br></div>
      </blockquote>
      <div><span></span></div><blockquote type=\"cite\"><div><span>Here are the screenshots.</span><br><span></span><br></div></blockquote>
      <blockquote type=\"cite\"><div><img src=\"\" id=\"\" style=\"padding:0px 1px 1px 0px;\"></div></blockquote>
      <blockquote type=\"cite\"><div><span></span><br><span></span><br><span></span><br></div></blockquote>
      <blockquote type=\"cite\"><div><img src=\"\" id=\"\" style=\"padding:0px 1px 1px 0px;\"></div></blockquote>
      <blockquote type=\"cite\"><div><span></span><br><span></span><br><span></span><br></div></blockquote>
      <blockquote type=\"cite\"><div><img src=\"\" id=\"\" style=\"padding:0px 1px 1px 0px;\"></div></blockquote>
      <blockquote type=\"cite\"><div><span></span><br><span></span><br><span></span><br></div></blockquote>
    `;

    it("should not cut forwarded messages from the reply", function () {
      const messageBody = `
        <html>
          <body>
            ${forwardedMessage};
          </body>
        </html>
      `;

      const result = quotations.extractFromHtml(messageBody);
      assert.isFalse(result.didFindQuote, "No quote found if the message was forwarded");
      assert.isTrue(result.didUseCheckpoints, "We did not try cutting all quotation tags");

      const replyHtml = result.body;
      assert.include(replyHtml, "Sent from my iPad", "The reply preserves the signature");
      assert.include(replyHtml, "Forwarded message", "The reply does not cut the splitter line");
      assert.include(replyHtml, "Here are the screenshots", "The forwarded content is not cut from the reply");
    });

    it("should not cut a blockquote from inside a forwarded message", function () {
      const messageBody = `
        <html>
          <body>
            ${forwardedMessage};
            <blockquote type=\"cite\"><div><span></span><br><span></span><br><span>Sent from my iPhone</span></div></blockquote>
          </body>
        </html>
      `;

      const replyHtml = quotations.extractFromHtml(messageBody).body;
      assert.include(replyHtml, "Sent from my iPhone", "The signature from the forwarded message is not cut either");
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
          if (file.indexOf("stripped") >= 0)
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

    it("should correctly parseprocess email that are too long.", function (done) {
      return fs.readFile(path.join("tests", "fixtures", "front", "email_too_long.html"), "utf-8", (err, html) => {
        if (err)
          return done(err);

         // Extract the quote.
        const replyHtml = quotations.extractFromHtml(html, {nodeLimit: 1, maxLinesCount: 1}).body;
        assert.notInclude(replyHtml, "And you will not realize there is text here");
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
