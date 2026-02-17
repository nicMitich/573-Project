# 573 Project - LinkedIn Job Scraper

A Playwright-based automation script for scraping job listings from LinkedIn.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (comes with Node.js)

## Setup

1. **Clone the repo and switch to the branch:**

   ```bash
   git clone https://github.com/hrisikaj/573-Project.git
   cd 573-Project
   git checkout linkedln_scraper
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Install Playwright browsers:**

   ```bash
   npx playwright install
   ```

4. **Create a `.env` file** in the project root:

   ```
   LINKEDIN_EMAIL=your_email@example.com
   LINKEDIN_PASSWORD=your_password
   ```

   > ⚠️ **Never commit the `.env` file.** It is already in `.gitignore`.

## Running the Script

```bash
node first.js
```

## Project Structure

```
├── first.js                # Main scraping script
├── tests/                  # Playwright test specs
├── playwright.config.ts    # Playwright configuration
├── .gitignore
├── package.json
└── README.md
```

## Notes

- The script launches a **visible browser** (non-headless) so you can observe the automation.
- LinkedIn may trigger a verification check on automated logins. If this happens, you'll need to manually complete the verification.
- Each team member should use their **own LinkedIn credentials** in their local `.env` file.
