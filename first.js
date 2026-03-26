require('dotenv').config();
const fs = require('fs');

const email = process.env.LINKEDIN_EMAIL;
const password = process.env.LINKEDIN_PASSWORD;
const { chromium } = require('playwright');



function parseRelativeTime(text) {
    const now = Date.now();
    const cleaned = text.trim().toLowerCase();

    const match = cleaned.match(/(\d+)\s*(second|minute|hour|day|week|month)/);
    if (!match) return now;

    const num = parseInt(match[1]);
    const unit = match[2];

    const ms = {
        second: 1000,
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
    };

    return Math.floor((now - num * ms[unit]) / 1000);
}


(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: "./playwright/.auth/user.json" });
    const page = await context.newPage();
    const keyword = 'Software Engineer';
    const MAX_JOBS = 10;

    const jobs = [];

    // Go to initial search page
    await page.goto(`https://www.linkedin.com/jobs/search?keywords=${keyword}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-job-id]', { timeout: 10000 });

    let pageNum = 1;

    while (jobs.length < MAX_JOBS) {
        console.log(`\n--- Page ${pageNum} | Jobs so far: ${jobs.length}/${MAX_JOBS} ---`);

        try {
            await page.waitForSelector('[data-job-id]', { timeout: 10000 });
        } catch (e) {
            console.log('No jobs found on page', pageNum, '- stopping');
            break;
        }

        // Click first job to load details panel
        await page.locator('[data-job-id]').first().click();
        await page.waitForSelector('.job-details-jobs-unified-top-card__primary-description-container', { timeout: 5000 });

        // Scroll to load all job cards on this page
        for (let s = 0; s < 6; s++) {
            await page.mouse.wheel(0, 600);
            await page.waitForTimeout(800);
        }

        const card = page.locator("[data-job-id]");
        const count = await card.count();
        console.log('Found', count, 'jobs on this page');

        for (let j = 0; j < count; j++) {
            if (jobs.length >= MAX_JOBS) break;

            try {
                const job = page.locator("[data-job-id]").nth(j);
                await job.scrollIntoViewIfNeeded();
                await job.click();
                await page.waitForSelector('.job-details-jobs-unified-top-card__primary-description-container', { timeout: 5000 });

                const job_id = await job.getAttribute('data-job-id');
                const title = await job.locator('.job-card-list__title--link').textContent();
                const company_name = await job.locator('.artdeco-entity-lockup__subtitle').textContent();
                const location = await page.locator('.job-details-jobs-unified-top-card__primary-description-container')
                    .locator('.tvm__text--low-emphasis')
                    .first()
                    .textContent();
                const des_arr = await page.locator('.mt4').allTextContents();
                const description = des_arr.join();
                const relative_time = await page.locator('.tvm__text').filter({hasText: 'ago'}).textContent();
                const original_listed_time = parseRelativeTime(relative_time);

                jobs.push({
                    job_id: job_id?.trim() || null,
                    company_name: company_name?.trim() || null,
                    title: title?.trim() || null,
                    description: description?.trim() || null,
                    max_salary: null,
                    pay_period: null,
                    location: location?.trim() || null,
                    company_id: null,
                    views: null,
                    med_salary: null,
                    job_posting_url: job_id ? `https://www.linkedin.com/jobs/view/${job_id.trim()}` : null,
                    original_listed_time: original_listed_time,
                    expiry: null
                });

                console.log(`Scraped ${jobs.length}/${MAX_JOBS}: ${title?.trim()}`);
            } catch (e) {
                console.log('skipping job', j, e.message);
            }
        }

        if (jobs.length >= MAX_JOBS) break;

        // Click next page button
        try {
            const nextButton = page.locator('button[aria-label="View next page"]');
            if (await nextButton.isVisible()) {
                await nextButton.click();
                await page.waitForTimeout(2000);
                await page.waitForSelector('[data-job-id]', { timeout: 10000 });
                pageNum++;
            } else {
                console.log('No next page button found - stopping');
                break;
            }
        } catch (e) {
            console.log('Failed to go to next page:', e.message);
            break;
        }
    }

    console.log('\nTotal jobs scraped:', jobs.length);
    fs.writeFileSync('jobs.json', JSON.stringify(jobs, null, 2));
    console.log('Saved', jobs.length, 'jobs to jobs.json');

    await browser.close();
})();