const path = require("node:path");
const { run } = require("node:test");

run({
  files: [path.join(__dirname, "shared-utils.test.js")],
  isolation: "none",
});
