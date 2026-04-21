// Test harness: starts Next.js on port 3460, resets DB, runs node:test, tears down.
import { spawn } from "node:child_process";
import { resetState, waitForServer } from "./helpers.mjs";

const PORT = process.env.TEST_PORT || "3460";
process.env.TEST_BASE_URL = `http://localhost:${PORT}`;

let server;
function kill() {
  if (server && !server.killed) {
    try {
      server.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
}
process.on("SIGINT", kill);
process.on("SIGTERM", kill);
process.on("exit", kill);

async function main() {
  console.log(`▶ Starting Next.js on port ${PORT}…`);
  server = spawn("npx", ["next", "start", "-p", PORT], {
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout.on("data", (d) => (serverLog += d.toString()));
  server.stderr.on("data", (d) => (serverLog += d.toString()));

  try {
    await waitForServer(30_000);
  } catch (e) {
    console.error(serverLog);
    throw e;
  }
  console.log("✓ Server ready");

  console.log("▶ Resetting test DB state…");
  await resetState();
  console.log("✓ DB reset");

  console.log("▶ Running tests…\n");
  // Run files serially — each test mutates shared seeded employees, and parallel
  // execution across files causes cross-test races (bulk create deleting rows
  // other tests are mid-walk through).
  const files = [
    "tests/01_auth.test.mjs",
    "tests/02_workers_workflow.test.mjs",
    "tests/03_office_workflow.test.mjs",
    "tests/04_overrides_rejection.test.mjs",
    "tests/05_validation_confidentiality.test.mjs",
    "tests/06_reports_persistence.test.mjs",
    "tests/07_form_fidelity.test.mjs",
  ];
  let code = 0;
  for (const f of files) {
    const runner = spawn(
      "node",
      ["--test", "--test-reporter=spec", f],
      {
        env: { ...process.env, TEST_BASE_URL: process.env.TEST_BASE_URL },
        stdio: "inherit",
      },
    );
    await new Promise((resolve) => runner.on("exit", resolve));
    if (runner.exitCode && runner.exitCode !== 0) code = runner.exitCode;
  }
  kill();
  process.exit(code);
}

main().catch((err) => {
  console.error(err);
  kill();
  process.exit(1);
});
