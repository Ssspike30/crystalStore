const { run } = require("./support/testkit");

require("./user-backend.test");

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
