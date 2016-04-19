var fs = require("fs");
var MailParser = require("mailparser").MailParser;

exports.parseEmlText = function (filename, done) {
  // Parse the specified file.
  var mailparser = new MailParser();
  
  // When the parser is done, return the text.
  mailparser.on("end", function (email) {
    return !email
      ? done("Couldn't open the email file.")
      : done(null, email.text);
  });
  
  // Pipe the file in the parser.
  fs.createReadStream(filename).pipe(mailparser);
};

exports.tryReadFile = function (filename, done) {
  return fs.readFile(filename, "utf-8", function (err, data) {
    return err ? done() : done(null, data);
  });
}