#!/usr/bin/env node
/**
 * Local deploy helper: runs build and reminds about server deployment.
 * For full production deployment, run deployment/deploy.sh on your target server.
 */
const { execSync } = require("child_process");

console.log("Running production build...\n");
execSync("npm run build", { stdio: "inherit" });
console.log("\nBuild successful. For server deployment, run deployment/deploy.sh on your target.");
process.exit(0);
