require('dotenv').config();

const email = process.env.LINKEDIN_EMAIL;
const password = process.env.LINKEDIN_PASSWORD;
const {chromium} = require('playwright');

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


    await context.storageState({ path: "./playwright/.auth/user.json" });
    

})();
