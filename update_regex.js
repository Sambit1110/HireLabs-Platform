
const fs = require("fs");
let c = fs.readFileSync("replace_card.js", "utf-8");
c = c.replace(/<\\/div>\\s*<\\/div>\\s*<\\/div>\\s*<\\/div>\\s*<\\/div>/, "<\\/div>\\s*<\\/div>\\s*<\\/div>\\s*<\\/div>");
fs.writeFileSync("replace_card.js", c, "utf-8");

