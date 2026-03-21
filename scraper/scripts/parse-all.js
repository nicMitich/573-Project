const fs = require("fs");
const path = require("path");
const { parseJob } = require("./parse-one-job");

const RAW_DIR = path.join(__dirname, "..", "raw");
const CLEAN_DIR = path.join(__dirname, "..", "clean");

if (!fs.existsSync(CLEAN_DIR)) fs.mkdirSync(CLEAN_DIR, { recursive: true });

const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".json"));
let success = 0;
let failed = 0;

for (const file of files) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), "utf8"));
    const parsed = parseJob(raw);
    const jobId = parsed.job_id || path.basename(file, ".json");
    const outFile = path.join(CLEAN_DIR, `${jobId}.json`);
    fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2));
    console.log(`✅ ${file} → ${jobId}.json  (${parsed.title || "No title"})`);
    success++;
  } catch (err) {
    console.log(`❌ ${file}: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone. Parsed: ${success} | Failed: ${failed}`);
