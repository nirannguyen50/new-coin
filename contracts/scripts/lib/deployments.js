// Small JSON store so that verify.js and deploy-vesting.js can find what
// deploy.js created on a given network.
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "..", "deployments");

function fileFor(networkName) {
  return path.join(DIR, `${networkName}.json`);
}

function loadDeployment(networkName) {
  const file = fileFor(networkName);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveDeployment(networkName, data) {
  fs.mkdirSync(DIR, { recursive: true });
  const file = fileFor(networkName);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  return file;
}

module.exports = { loadDeployment, saveDeployment, fileFor };
