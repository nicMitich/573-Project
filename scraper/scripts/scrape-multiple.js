const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const RAW_DIR = path.join(__dirname, "..", "raw");

async function safeText(locator) {
  try {
    const n = await locator.count();
    if (!n) return null;
    return (await locator.first().innerText()).trim();
  } catch {
    return null;
  }
}

// ── Phase 1: Collect job IDs from search pages ──────────────────────

async function collectJobIds(page, maxPages) {
  const jobIds = new Set();

  for (let pg = 1; pg <= maxPages; pg++) {
    const url = `https://app.joinhandshake.com/job-search?page=${pg}&per_page=25`;
    console.log(`\n📄 Loading search page ${pg}...`);

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Scroll down to lazy-load all cards on this page
    for (let s = 0; s < 5; s++) {
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(500);
    }

    // Extract job IDs from all links on the page that point to jobs
    const ids = await page.evaluate(() => {
      const found = [];

      // Method 1: Look for <a> tags with /jobs/ in href
      document.querySelectorAll('a[href*="/jobs/"]').forEach((a) => {
        const m = a.href.match(/\/jobs\/(\d+)/);
        if (m) found.push(m[1]);
      });

      // Method 2: Look for /job-search/{id} links
      document.querySelectorAll('a[href*="/job-search/"]').forEach((a) => {
        const m = a.href.match(/\/job-search\/(\d+)/);
        if (m) found.push(m[1]);
      });

      return found;
    });

    const before = jobIds.size;
    ids.forEach((id) => jobIds.add(id));
    console.log(`   Found ${ids.length} links, ${jobIds.size - before} new (total: ${jobIds.size})`);

    // If no new IDs were found, we've likely hit the end
    if (jobIds.size - before === 0 && pg > 1) {
      console.log("   No new jobs found, stopping pagination.");
      break;
    }
  }

  return [...jobIds];
}

// ── Phase 2: Visit each job page and scrape details ─────────────────

async function scrapeJob(page, jobId) {
  const jobUrl = `https://app.joinhandshake.com/jobs/${jobId}`;

  await page.goto(jobUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Expand full description
  await page
    .getByRole("button", { name: /Show more/i })
    .click()
    .catch(() => {});
  await page.waitForTimeout(800);

  const title = await safeText(page.locator("h1"));
  const mainText = await safeText(page.locator("main"));

  // Company name: appears right above the title in the detail view
  // Pattern: first line is company name, second is industry, third is title
  let company = null;
  if (mainText) {
    const lines = mainText.split("\n").map((l) => l.trim()).filter(Boolean);
    // The h1 title should appear in the first few lines;
    // company name is the line before industry, which is before title
    const titleIdx = lines.findIndex((l) => l === title);
    if (titleIdx >= 2) {
      company = lines[titleIdx - 2]; // company is 2 lines above title
    } else if (titleIdx >= 1) {
      company = lines[titleIdx - 1];
    }
  }

  return {
    scraped_at: new Date().toISOString(),
    url: jobUrl,
    title,
    company,
    mainText,
  };
}

// ── Main ─────────────────────────────────────────────────────────────

(async () => {
  const MAX_PAGES = parseInt(process.argv[2]) || 2;    // pages to scan
  const MAX_JOBS = parseInt(process.argv[3]) || 25;    // max jobs to scrape

  console.log(`Config: up to ${MAX_PAGES} search pages, max ${MAX_JOBS} jobs\n`);

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({ storageState: "storage.json" });
  const page = await context.newPage();

  // Phase 1: Collect job IDs
  console.log("═══ Phase 1: Collecting job IDs ═══");
  const allJobIds = await collectJobIds(page, MAX_PAGES);
  console.log(`\nCollected ${allJobIds.length} unique job IDs.`);

  if (allJobIds.length === 0) {
    console.log("❌ No job IDs found. Check if your session is still valid (re-run login-and-save.js).");
    await browser.close();
    process.exit(1);
  }

  // Skip jobs we've already scraped
  const existingFiles = fs.existsSync(RAW_DIR)
    ? fs.readdirSync(RAW_DIR).map((f) => f.replace(".json", ""))
    : [];
  const newJobIds = allJobIds.filter((id) => !existingFiles.includes(id));
  console.log(`${newJobIds.length} new jobs to scrape (${allJobIds.length - newJobIds.length} already in raw/).`);

  const toScrape = newJobIds.slice(0, MAX_JOBS);

  // Phase 2: Scrape each job
  console.log(`\n═══ Phase 2: Scraping ${toScrape.length} jobs ═══`);

  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

  let success = 0;
  let failed = 0;

  for (let i = 0; i < toScrape.length; i++) {
    const jobId = toScrape[i];
    console.log(`\n[${i + 1}/${toScrape.length}] Scraping job ${jobId}...`);

    try {
      const data = await scrapeJob(page, jobId);
      const outFile = path.join(RAW_DIR, `${jobId}.json`);
      fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
      console.log(`   ✅ ${data.title || "No title"} — ${data.company || "Unknown company"}`);
      success++;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n═══ Done ═══`);
  console.log(`Scraped: ${success} | Failed: ${failed} | Skipped (existing): ${allJobIds.length - newJobIds.length}`);

  await browser.close();
})();
