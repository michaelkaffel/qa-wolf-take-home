// @ts-check
'use strict';

/** @typedef {import('./types').Article} Article */
/** @typedef {import('./types').Violation} Violation */

/**
 * Checks that articles are sorted from newest to oldest.
 * Equal timestamps are allowed (two articles posted in the same second).
 * 
 * @param {Article[]} articles
 * @returns {Violation[]}
 */

function validateSortOrder(articles) {
    const violations = [];

    for (let i = 0; i < articles.length - 1; i++) {
        const current = articles[i];
        const next = articles[i + 1];

        if (current.timestamp < next.timestamp) {
            violations.push({ position: i + 1, current, next });
        }
    }

    return violations;
}

module.exports = { validateSortOrder };