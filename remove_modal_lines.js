
const fs = require("fs");
let lines = fs.readFileSync("components/landing/InteractiveDemo.jsx", "utf-8").split("\n");

// Find index of {uploadFeedback && (
const startIndex = lines.findIndex(l => l.includes("{uploadFeedback && ("));

if (startIndex !== -1) {
  // Find where this block ends (the closing )})
  let endIndex = startIndex;
  let bracketCount = 0;
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].includes(")")) {
       // Just find the line with: )}
    }
  }
  
  // Just find the index of the first `  );` after startIndex? No, it ends with `)}`
  const lastIndex = lines.findIndex((l, i) => i > startIndex && l.trim() === ")}");
  if (lastIndex !== -1) {
    lines.splice(startIndex, lastIndex - startIndex + 1);
  }
}

fs.writeFileSync("components/landing/InteractiveDemo.jsx", lines.join("\n"), "utf-8");
console.log("Removed modal block");

