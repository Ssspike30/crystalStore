const tests = [];
let beforeEachHook = null;

function test(title, fn) {
  tests.push({ title, fn });
}

function beforeEach(fn) {
  beforeEachHook = fn;
}

async function run() {
  let failed = 0;

  for (const { title, fn } of tests) {
    try {
      if (beforeEachHook) {
        await beforeEachHook();
      }
      await fn();
      console.log(`ok - ${title}`);
    } catch (error) {
      failed += 1;
      console.error(`not ok - ${title}`);
      console.error(error);
    }
  }

  console.log(`1..${tests.length}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

module.exports = { test, beforeEach, run };
