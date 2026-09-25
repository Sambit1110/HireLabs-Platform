
const fs = require("fs");
let c = fs.readFileSync("app/api/parse-resume/route.js", "utf-8");

c = c.replace(
  /improvement_tips: \[\]/,
  `improvement_tips: [
          "Ensure your resume format is ATS-friendly.",
          "Add quantifiable metrics to your recent roles.",
          "Highlight leadership experience more prominently."
        ]`
);

fs.writeFileSync("app/api/parse-resume/route.js", c, "utf-8");
console.log("Updated fallback tips");

