require('dotenv').config();
const fs = require('fs');

const email = process.env.LINKEDIN_EMAIL;
const password = process.env.LINKEDIN_PASSWORD;
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: "./playwright/.auth/user.json" });
    const page = await context.newPage();
    const keyword = 'Software Engineer';

    const jobs = [];
    let i = 1;

    while (i < 10) {
        const pageNo = i * 25;
        const url = `https://www.linkedin.com/jobs/search?keywords=${keyword}&start=${pageNo}`;
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
        } catch (e) {
            console.log('Failed to load page', i, '- skipping');
            i++;
            continue;
        }

        try {
            await page.waitForSelector('[data-job-id]', { timeout: 10000 });
        } catch (e) {
            console.log('No jobs found on page', i, '- skipping');
            i++;
            continue;
        }

        await page.locator('[data-job-id]').first().click();
        await page.waitForSelector('.job-details-jobs-unified-top-card__primary-description-container', { timeout: 5000 });

        for (let s = 0; s < 6; s++) {
            await page.mouse.wheel(0, 600);
            await page.waitForTimeout(800);
        }

        const card = page.locator("[data-job-id]");
        const count = await card.count();
        console.log('Page', i, '- found', count, 'jobs');

        for (let j = 0; j < count; j++) {
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
                    med_salary: null
                });
            } catch (e) {
                console.log('skipping job', j, e.message);
            }
        }
        i++;
    }

    console.log('Total jobs scraped:', jobs.length);
    fs.writeFileSync('jobs.json', JSON.stringify(jobs, null, 2));
    console.log('Saved', jobs.length, 'jobs to jobs.json');

    await browser.close();
})();