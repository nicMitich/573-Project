require('dotenv').config();
const fs = require('fs');

const email = process.env.LINKEDIN_EMAIL;
const password = process.env.LINKEDIN_PASSWORD;
const {chromium} = require('playwright');

(async () =>{

    const browser = await chromium.launch({headless: false});
    const context = await browser.newContext({ storageState: "./playwright/.auth/user.json" });
    const page = await context.newPage();
    const keyword = 'Software Engineer';








    

    const jobID = new Set();
const jobs = [];
let i = 1;

while(i < 10){
    const pageNo = i * 25;
    const url = `https://www.linkedin.com/jobs/search?keywords=${keyword}&start=${pageNo}`;
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch(e) {
        console.log('Failed to load page', i, '- skipping');
        i++;
        continue;
    }
    await page.waitForSelector('[data-job-id]', { timeout: 10000 });


    

    await page.locator('[data-job-id]').first().click();
    await page.waitForSelector('.job-details-jobs-unified-top-card__primary-description-container', { timeout: 5000 });

    for(let s = 0; s < 6; s++){
        await page.mouse.wheel(0, 600);
        await page.waitForTimeout(800);
    }



    console.log(1);

    

    const card = page.locator("[data-job-id]");
    const count = await card.count();
    console.log('count:', count);

    console.log(2);


    for(let j = 0; j < count; j++){
        console.log(3);    
        try {
            const job = page.locator("[data-job-id]").nth(j);
            await job.scrollIntoViewIfNeeded();
            await job.click();
            await page.waitForSelector('.job-details-jobs-unified-top-card__primary-description-container', { timeout: 5000 });
            console.log(4);
            const title = await job.locator('.job-card-list__title--link').textContent();
            const company = await job.locator('.artdeco-entity-lockup__subtitle').textContent();
            const location = await page.locator('.job-details-jobs-unified-top-card__primary-description-container')
                                        .locator('.tvm__text--low-emphasis')
                                        .first()
                                        .textContent();
            const des_arr = await page.locator('.mt4').allTextContents();
            const job_des = des_arr.join();
            jobs.push({ title, company, location, description: job_des });
        } catch(e) {
            console.log('skipping job', j, e.message);
        }
    


    }
    i++;
}

console.log(jobs);


fs.writeFileSync('jobs.json', JSON.stringify(jobs, null, 2));
console.log('saved', jobs.length, 'jobs to jobs.json');

    

})();
