
const fs = require("fs");
let c = fs.readFileSync("components/landing/InteractiveDemo.jsx", "utf-8");

c = c.replace(
  /\{uploadFeedback && \([\s\S]*?\}\s*\)\s*\}/,
  ""
);

fs.writeFileSync("components/landing/InteractiveDemo.jsx", c, "utf-8");
console.log("Removed modal");

