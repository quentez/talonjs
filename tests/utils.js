"use strict";

const fs = require("fs");
const MailParser = require("mailparser").MailParser;
const Cheerio = require("cheerio");
const XmlDom = require("xmldom");

const talonUtils = require("../bin/talon").utils;

const xmlDomParser = new XmlDom.DOMParser();
const xmlDomSerializer = new XmlDom.XMLSerializer();

exports.parseEmlText = function (filename, done) {
  // Parse the specified file.
  const mailparser = new MailParser();
  
  // When the parser is done, return the text.
  mailparser.on("end", function (email) {
    return !email
      ? done("Couldn't open the email file.")
      : done(null, email.text);
  });
  
  // Pipe the file in the parser.
  fs.createReadStream(filename).pipe(mailparser);
};

exports.parseEmlHtml = function (filename, done) {
  // Parse the specified file.
  const mailparser = new MailParser();
  
  // When the parser is done, return the text.
  mailparser.on("end", function (email) {
    return !email
      ? done("Couldn't open the email file.")
      : done(null, email.html);
  });
  
  // Pipe the file in the parser.
  fs.createReadStream(filename).pipe(mailparser);
};

exports.tryReadFile = function (filename, done) {
  return fs.readFile(filename, "utf-8", function (err, data) {
    return err ? done() : done(null, data);
  });
};

exports.htmlToText = function (html) {
  const document = Cheerio.load(html);
  const xmlDocument = xmlDomParser.parseFromString(document.xml());
  
  return talonUtils.elementToText(xmlDocument);
};