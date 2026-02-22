require('dotenv').config();

const email = process.env.LINKEDIN_EMAIL;
const password = process.env.LINKEDIN_PASSWORD;
const {chromium} = require('playwright');

(async () =>{

    const browser = await chromium.launch({headless: false});
    const context = await browser.newContext({ storageState: "./playwright/.auth/user.json" });
    const page = await context.newPage();
    const keyword = 'Software Engineer';








    

    let i = 1;
    while(i < 5){
    const pageNo = i * 25;
    let oldCount = 0;
    const jobID = new Set();
    const jobs =  [];
    const url = `https://www.linkedin.com/jobs/search?keywords=${keyword}&start=${pageNo}`;
    await page.goto(url);

    while(true){

    const card = await page.locator("[data-job-id]");
    const count = await card.count();


    if(oldCount === count){
        break;
    }



    


    for(let i = oldCount; i < count; i++){
        const job = page.locator("[data-job-id]").nth(i);
        jobID.add(job.getAttribute('data-job-id'));
        await job.click();
        const title = await job.locator('.job-card-list__title--link').textContent();
        const company = await job.locator('.artdeco-entity-lockup__subtitle').textContent();
        const location = await page.locator('.job-details-jobs-unified-top-card__primary-description-container')
                                    .locator('.tvm__text--low-emphasis')
                                    .first()
                                    .textContent();
        const des_arr = await page.locator('.mt4').allTextContents();
        const job_des = des_arr.join();
        jobs.push({ title: title, company: company, location: location, desciption: job_des});


        page.mouse.wheel(0, 500);



        
    }
    oldCount = count;

}




}


    

})();
