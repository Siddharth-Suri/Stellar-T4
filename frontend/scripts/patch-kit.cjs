/**
 * scripts/patch-kit.js
 * Fixes a typo in @creit.tech/stellar-wallets-kit where "easy-in-out" should
 * be "ease-in-out". Applied automatically via the "postinstall" npm script.
 */
const fs = require("fs");

const targets = [
  "node_modules/@creit.tech/stellar-wallets-kit/esm/components/shared/button.js",
  "node_modules/@creit.tech/stellar-wallets-kit/script/components/shared/button.js",
];

for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  const original = fs.readFileSync(file, "utf8");
  const patched = original.replace(/easy-in-out/g, "ease-in-out");
  if (patched !== original) {
    fs.writeFileSync(file, patched);
    console.log(`✔ patched ${file}`);
  }
}
