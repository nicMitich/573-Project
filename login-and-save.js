const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://app.joinhandshake.com/", {
    waitUntil: "domcontentloaded",
  });

  console.log("Login manually. After you're fully logged in, press Enter here.");

  await new Promise((resolve) => process.stdin.once("data", resolve));

  await context.storageState({ path: "storage.json" });

  console.log("✅ Session saved to storage.json");

  await browser.close();
})();