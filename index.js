// @ts-check
// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");

const TARGET_COUNT = 100;

/**
 * Collects article data from the current page.
 * Uses the 'title' attribute of 'span.age' for precise ISO timestamps
 * rather than the relative "N minutes ago" display text.
 * 
 * @param {import('playwright').Page} page
 * @returns {Promise<Array<{rank: number, title: string, raw: string }>>}
 */

async function collectArticlesFromPage(page) {
    return page.$$eval('tr.athing', rows =>
        rows.map(row => {
            const rankEl = row.querySelector('span.rank');
            const titleEl = row.querySelector('span.titleline > a');
            // The age span sits in the *next* sibling row (the subtext row)
            const subtext = row.nextElementSibling;
            const ageEl = subtext?.querySelector('span.age');

            const rank = rankEl ? parseInt(rankEl.textContent, 10) : -1;
            const title = titleEl?.textContent?.trim() ?? '(no title)';
            const raw = ageEl?.getAttribute('title') ?? ''; // e.g. "2024-01-15T14:23:07"

            return { rank, title, raw };
        })
    );
}

/**
 * Main validation function.
 */

async function sortHackerNewsArticles() {
    // launch browser
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('QA Wolf — Hacker News Sort Validator');
    console.log('-'.repeat(52));
    console.log(`Collecting the first ${TARGET_COUNT} articles from /newest...\n`)

    // go to Hacker News
    await page.goto("https://news.ycombinator.com/newest");

    const articles = [];


    // -- Pagination loop -----------
    while (articles.length < TARGET_COUNT) {
        const pageArticles = await collectArticlesFromPage(page);

        for (const a of pageArticles) {
            if (articles.length >= TARGET_COUNT) break;

            const timestamp = a.raw ? new Date(a.raw.split(' ')[0]) : null;

            if (!timestamp || isNaN(timestamp.getTime())) {
                console.warn(`Rank ${a.rank}: could not parse timestamp "${a.raw}" — skipping`);
                continue
            }

            articles.push({
                rank: a.rank,
                title: a.title,
                timestamp,
                raw: a.raw.split(' ')[0],
            });
        }

        if (articles.length >= TARGET_COUNT) break;

        // Navigate to the next page via the "More" link

        const moreLink = page.locator('a.morelink');
        const moreVisible = await moreLink.isVisible();

        if (!moreVisible) {
            console.warn('"More" link not found — stopping early.');
            break;
        }

        console.log(` Collected ${articles.length} so far — loading next page...`);
        await moreLink.click();
        await page.waitForLoadState('domcontentloaded');
    }

    await browser.close();

    // -- Count check -----------------
    console.log(`\nArticles collected: ${articles.length}`);

    if (articles.length !== TARGET_COUNT) {
        console.error(`\n FAIL — Expected exactly ${TARGET_COUNT} articles, got ${articles.length}.`);
        process.exit(1);
    }

    console.log(`Count check passed (${TARGET_COUNT} articles)\n`);

    const violations = [];

    for (let i = 0; i < articles.length -1; i++) {
        const current = articles[i];
        const next = articles[i + 1];

        // A violation is when an earlier-ranked articles is *older* than the one after it.
        // Equal timestamps are allowed (two articles submitted in the same second).

        if (current.timestamp < next.timestamp) {
            violations.push({
                position: i + 1,
                current,
                next,
            });
        }
    }

    if (violations.length === 0) {
        console.log(' PASS — ALL 100 articles are sorted from newest to oldest.\n');    
    } else {
        console.error(` FAIL — Found ${violations.length} sort violation(s):\n`);

        for (const v of violations) {
            console.error(
                ` Position ${v.position} -> ${v.position + 1}: \n` +
                ` [${v.position}] "${v.current.title}"\n` +
                ` timestamp: ${v.current.raw}\n` +
                ` [${v.position + 1}] "${v.next.title}"\n` +
                ` timestamp: ${v.next.raw}\n` +
                ` Article at position ${v.position} is OLDER than article at position ${v.position + 1}\n`
            );
        }
    }

    console.log('-'.repeat(52));
    console.log('Timestamp spot-check:\n');

    const spots = [
        ...articles.slice(0, 5),
        null, // separator sentinel
        ...articles.slice(-5),
    ];

    for (const a of spots) {
        if (a === null) {
            console.log('   ...');
            continue;
        }
        console.log(`  [${String(a.rank).padStart(3)}] ${a.raw} -> "${a.title.slice(0, 55)}${a.title.length > 55 ? '...' : ''}"`);
    }

    console.log('\n' + '-'.repeat(52));

    if (violations.length > 0) process.exit(1);
}

(async () => {
    await sortHackerNewsArticles();
})();
