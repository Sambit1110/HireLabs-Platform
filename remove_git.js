
const fs = require("fs");
let lines = fs.readFileSync("components/landing/InteractiveDemo.jsx", "utf-8").split("\n");
let filtered = lines.filter(l => !l.startsWith("<<<<<<<") && !l.startsWith("=======") && !l.startsWith(">>>>>>>"));
fs.writeFileSync("components/landing/InteractiveDemo.jsx", filtered.join("\n"), "utf-8");
console.log("Removed git conflict markers");

