// @ts-check
'use strict';

/**
 * Collects article data from the current page.
 * Uses the 'title' attribute of 'span.age' for precise ISO timestamps
 * rather than the relative "N minutes ago" display text.
 * 
 * @param {import('playwright').Page} page
 * @returns {Promise<Array<{ rank: number, title: string, raw: string}>>}
 */

async function collectArticlesFromPage(page) {
    return page.$$eval('tr.athing', rows => 
        rows.map(row => {
            const rankEl = row.querySelector('span.rank');
            const titleEl = row.querySelector('span.titleline > a');
            const subtext = row.nextElementSibling;
            const ageEl = subtext?.querySelector('span.age');

            const rank = rankEl ? parseInt(rankEl.textContent, 10) : -1;
            const title = titleEl?.textContent?.trim() ?? '(no title)';
            const raw = ageEl?.getAttribute('title') ?? '';

            return { rank, title, raw }
        })
    );
}

module.exports = { collectArticlesFromPage };