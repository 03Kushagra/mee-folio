import { spawn } from "node:child_process";

const workspaces = ["client", "server"];
const npmCliPath = process.env.npm_execpath;

if (!npmCliPath) {
  throw new Error("Run this script through npm so the npm CLI path is available.");
}

const processes = workspaces.map((workspace) =>
  spawn(process.execPath, [npmCliPath, "run", "dev", "--workspace", workspace], {
    stdio: "inherit",
  }),
);

function stopProcesses(signal) {
  for (const childProcess of processes) {
    childProcess.kill(signal);
  }
}

process.on("SIGINT", () => {
  stopProcesses("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopProcesses("SIGTERM");
  process.exit(0);
});

for (const childProcess of processes) {
  childProcess.on("exit", (code) => {
    if (code && code !== 0) {
      stopProcesses("SIGTERM");
      process.exit(code);
    }
  });
}
