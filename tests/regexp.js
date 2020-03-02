"use strict";

const fs = require("fs");
const path = require("path");
const async = require("front-async");
const assert = require("chai").assert;
const utils = require("./utils");
const { isStartOfForwardedMessage } = require("../bin/Talon").utils;

describe("TalonJS Regexp", function () {

  describe("ForwardRegexp", function () {

    const matchingLines = [
      "----- Forwarded message -----\n", // Gmail
      "Begin forwarded message:"         // iOS
    ];

    it("should match the following lines", function () {
      for (const line of matchingLines) {
        assert.isTrue(isStartOfForwardedMessage(line), line);
      }
    });

    const nonMatchingLines = [
      "Sally forwarded this message",
      "See forwarded message below:"
    ];

    it("should not match the following lines", function () {
      for (const line of nonMatchingLines)
        assert.isFalse(isStartOfForwardedMessage(line), line);
    });
  });
});
