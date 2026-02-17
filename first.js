const {chromium} = require('playwright');
//email: frank105311499@gmail.com
//password: X:#)#U2rFgD@j=4
const email = "frank105311499@gmail.com";
const password = "X:#)#U2rFgD@j=4";

(async () =>{
    const browser = await chromium.launch({headless: false});
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/');
    await page.getByRole('link', {name: 'Sign in with email'}).click();
    await page.getByRole('textbox', {name: 'Email or phone'}).pressSequentially(email);

    await page.getByRole('textbox', {name: 'Password'}).pressSequentially(password);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    // await page.getByRole('button', {name: 'Sign in'}).click();
    await page.waitForTimeout(3000);
    await page.getByRole('combobox', {name: 'Search'}).pressSequentially('Software Engineer');
    await page.keyboard.press('Enter');
    await page.getByRole('button', {name: 'Jobs'}).click();
    //await page.getByRole('combobox', {name: 'City, state, or zip code'}).pressSequentially('United State');
    //await page.keyboard.press('Enter');

    await page.locator(".job-card-container__link").first().click();
    for(let i = 0; i < 10; i++){
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(1000);
    }


    const jobs = await page.locator("[data-job-id]").all();

    for(const job of jobs){
        await job.click();
        const title = await job.locator('.job-card-list__title--link').textContent();
        const company = await card.locator('.artdeco-entity-lockup__subtitle').textContent();
        console.log(title);
        await page.getByRole("heading", {level: 1});

        
    }

    

    









    await page.waitForTimeout(3000);







    
    

    // while(i < 20){
    //         const text = await page.locator('h2[itemprop="title"]').nth(i);
    //         jobs.push({"title":text.textContent()});

            
    //         i++;
    // }



    // for (let  i = 0; i < text.length; i++){
    //     console.log(text[i].trim());
    // }

    // await page.waitForTimeout(3000);

    

    


    // await browser.close();

    

})();
