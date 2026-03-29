// @ts-check
// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");
const { collectArticlesFromPage } = require('./lib/collector');
const { validateSortOrder } = require('./lib/validator');
const { printConsoleReport, writeHtmlReport } = require('./lib/reporter');

const TARGET_COUNT = 100;

async function sortHackerNewsArticles() {
    const ranAt = new Date();
    const startMs = Date.now();

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('🐺 QA Wolf — Hacker News Sort Validator');
    console.log('-'.repeat(52));
    console.log(`Collecting the first ${TARGET_COUNT} articles from /newest...\n`);

    await page.goto('https://news.ycombinator.com/newest');

    const articles = [];

    // —— Pagination loop —————————————————
    while (articles.length < TARGET_COUNT) {
        const pageArticles = await collectArticlesFromPage(page);

        for (const a of pageArticles) {
            if (articles.length >= TARGET_COUNT) break;

            const timestamp = a.raw ? new Date(a.raw.split(' ')[0]) : null;

            if (!timestamp || isNaN(timestamp.getTime())) {
                console.warn(`  ⚠  Rank ${a.rank}: could not parse timestamp "${a.raw}" — skipping`);
                continue;
            }

            articles.push({ rank: a.rank, title: a.title, timestamp, raw: a.raw });
        }

        if (articles.length >= TARGET_COUNT) break;

        const moreLink = page.locator('a.morelink');
        const moreVisible = await moreLink.isVisible();

        if (!moreVisible) {
            console.warn('\n  ⚠  "More" link not found — stopping early.');
            break;
        }

        console.log(`  Collected ${articles.length} so far — loading next page...`);
        await moreLink.click();
        await page.waitForLoadState('domcontentloaded');
    }

    await browser.close();

    // —— Count check —————————————————
    console.log(`\nArticles collected: ${articles.length}`);

    if (articles.length !== TARGET_COUNT) {
        console.error(`\n❌ FAIL — Expected exactly ${TARGET_COUNT} articles, got ${articles.length}.`);
        process.exit(1);
    }

    console.log(`✅ Count check passed (${TARGET_COUNT} articles)`);

    // —— Validate + Report —————————————————

    const violations = validateSortOrder(articles);
    const meta = { elapsedMs: Date.now() - startMs, ranAt };

    printConsoleReport(articles, violations, meta);
    writeHtmlReport(articles, violations, meta);

    if (violations.length > 0) process.exit(1);
}

(async () => {
    await sortHackerNewsArticles();
})();