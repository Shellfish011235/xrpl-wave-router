import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("standalone Wave listener binds only IPv4 loopback", { timeout: 15_000 }, async () => {
  // Observe the actual OS listener without replacing its bind arguments.
  const observer = `
    import net from "node:net";
    const listen = net.Server.prototype.listen;
    net.Server.prototype.listen = function (...args) {
      this.once("listening", () => {
        console.log("BOUND_ADDRESS=" + JSON.stringify(this.address()));
      });
      return listen.apply(this, args);
    };
  `;
  const child = spawn(process.execPath, [
    "--import", "tsx",
    "--import", `data:text/javascript,${encodeURIComponent(observer)}`,
    "src/index.ts",
  ], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let errors = "";
  child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
  try {
    const address = await new Promise<{ address: string; port: number }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Listener startup timeout: ${output} ${errors}`)), 8_000);
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Listener exited before readiness (${code}): ${output} ${errors}`));
      });
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        const match = output.match(/BOUND_ADDRESS=([^\r\n]+)[\r\n]/);
        if (match) {
          clearTimeout(timer);
          try { resolve(JSON.parse(match[1])); } catch (error) { reject(error); }
        }
      });
    });
    assert.equal(address.address, "127.0.0.1");
    assert.ok(address.port > 0);
    const response = await fetch(`http://127.0.0.1:${address.port}/health`, {
      signal: AbortSignal.timeout(2_000),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).service, "xrpl-ai-pathfinder-mvp");
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
  }
});
