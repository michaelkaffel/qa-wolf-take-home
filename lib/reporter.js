// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { platform } = require('os');

/** @typedef {import('./types').Article} Article */
/** @typedef {import('./types').Violation} Violation */

/**
 * Prints a summary to the terminal.
 * 
 * @param {Article[]} articles
 * @param {Violation[]} violations
 * @param {{ elapsedMs: number, ranAt: Date }} meta
 */

function printConsoleReport(articles, violations, meta) {
    const passed = violations.length === 0;
    const oldest = articles[articles.length - 1].raw.split(' ')[0];
    const newest = articles[0].raw.split(' ')[0];

    console.log('\n' + '-'.repeat(52));
    console.log(passed
        ? `✅ PASS — ALL ${articles.length} articles are sorted newest to oldest.`
        : `❌ FAIL — Found ${violations.length} sort violation(s).`
    );
    console.log(`   Ran at:     ${meta.ranAt.toISOString()}`);
    console.log(`   Elapsed:    ${(meta.elapsedMs / 1000).toFixed(2)}s`);
    console.log(`   Newest:     ${newest}`);
    console.log(`   Oldest:     ${oldest}`);

    if (!passed) {
        console.log('\nViolations:\n');
        for (const v of violations) {
            console.error(
                `   Position ${v.position} -> ${v.position + 1}:\n` +
                `       [${v.position}] "${v.current.title}"\n` +
                `           ${v.current.raw}\n` +
                `       [${v.position + 1}] "${v.next.title}"\n` +
                `           ${v.next.raw}\n`
            );
        }
    }

    console.log('\nTimestamp spot-check:\n');
    const spots = [...articles.slice(0, 5), null, ...articles.slice(-5)];
    for (const a of spots) {
        if (a === null) { console.log(' ...'); continue; }
        const iso = a.raw.split(' ')[0];
        const truncated = a.title.length > 55 ? a.title.slice(0, 55) + '...' : a.title;
        console.log(`   [${String(a.rank).padStart(3)}] ${iso} -> "${truncated}"`);
    }
    console.log('-'.repeat(52) + '\n');
}


/**
 * Writes an HTML report to report/index.html and opens it in the browser.
 * 
 * @param {Article[]} articles
 * @param {Violation[]} violations
 * @param {{ elapsedMs: number, ranAt: Date }} meta
 */
function writeHtmlReport(articles, violations, meta) {
    const passed = violations.length === 0;
    const violationPositions = new Set(violations.map(v => v.position));
    const oldest = articles[articles.length - 1].raw.split(' ')[0];
    const newest = articles[0].raw.split(' ')[0];

    const rows = articles.map(a => {
        const iso = a.raw.split(' ')[0];
        const isViolation = violationPositions.has(a.rank);
        return `
            <tr class="${isViolation ? 'violation' : ''}">
                <td>${a.rank}</td>
                <td>${escapeHtml(a.title)}</td>
                <td>${iso}</td>
                ${isViolation ? '<td class="badge-cell"><span class="badge">⚠ Out of order</span></td>' : '<td></td>'}
            </tr>`
    }).join('');

    const violationRows = violations.map(v => `
        <div class="violation-detail">
            <strong>Position ${v.position} -> ${v.position + 1}</strong>
            <div>[${v.position}] "${escapeHtml(v.current.title)}" — ${v.current.raw.split(' ')[0]}</div>
            <div>[${v.position + 1}] "${escapeHtml(v.next.title)}" — ${v.next.raw.split(' ')[0]}</div>
        </div>`).join('');

    const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>HN Sort Validator — ${passed ? 'PASS' : 'FAIL'}</title>
            <style>
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: #f5f5f5;
                    color: #1a1a1a;
                    padding: 2rem;
                }

                header {
                    background: ${passed ? '#166534' : '#7f1d1d'};
                    color: white;
                    border-radius: 12px;
                    padding: 2rem;
                    margin-bottom: 1.5rem;
                }

                header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
                header p { opacity: 0.85; font-size: 0.95rem; }

                .meta-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .meta-card {
                    background: white;
                    border-radius: 8px;
                    padding: 1rem 1.25rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                }

                .meta-card .label { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
                .meta-card .value { font-size: 1.1rem; font-weight: 600; margin-top: 0.25rem; }

                .violations-section {
                    background: #fef2f2;
                    border: 1px solid #fca5a5;
                    border-radius: 8px;
                    padding: 1.25rem;
                    margin-bottom: 1.5rem;
                }

                .violations-section h2 { color: #991b1b; margin-bottom: 1rem; }

                .violation-detail {
                    background: white;
                    border-radius: 6px;
                    padding: 0.75rem 1rem;
                    margin-bottom: 0.75rem;
                    font-size: 0.875rem;
                    line-height: 1.6;
                    border-left: 3px solid #ef4444;
                }

                .table-wrap {
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                    overflow: hidden;
                }

                .table-wrap h2 {
                    padding: 1rem 1.25rem;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 1rem;
                }

                table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
                th {
                    background: #f9fafb;
                    text-align: left;
                    padding: 0.6rem 1rem;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #6b7280;
                    border-bottom: 1px solid #e5e7eb;
                }

                td { padding: 0.6rem 1rem; border-bottom: 1px solid #f3f4f6; }
                tr:last-child td { border-bottom: none; }
                tr.violation { background: #fff5f5; }
                tr.violation td { color: #991b1b; }

                .badge {
                    background: #fee2e2;
                    color: #991b1b;
                    padding: 0.2rem 0.5rem;
                    border-radius: 999px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    white-space: nowrap;
                }

                .badge-cell { white-space: nowrap; }

                footer {
                    text-align: center;
                    margin-top: 2rem;
                    font-size: 0.8rem;
                    color: #9ca3af;
                }
            </style>
        </head>
        <body>
            <header>
                <h1>${passed ? '✅ PASS' : '❌ FAIL'} — Hacker News Sort Validator</h1>
                <p>Validated that the first 100 articles on HN /newest are sorted from newest to oldest.</p>
            </header>

            <div class="meta-grid">
                <div class="meta-card">
                    <div class="label">Result</div>
                    <div class="value">${passed ? 'All clear' : `${violations.length} violation${violations.length > 1 ? 's' : ''}`}</div>
                </div>
                <div class="meta-card">
                    <div class="label">Articles Checked</div>
                    <div class="value">${articles.length}</div>
                </div>
                <div class="meta-card">
                    <div class="label">Elapsed</div>
                    <div class="value">${(meta.elapsedMs / 1000).toFixed(2)}s</div>
                </div>
                <div class="meta-card">
                    <div class="label">Ran At</div>
                    <div class="value">${meta.ranAt.toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
                </div>
                <div class="meta-card">
                    <div class="label">Newest Article</div>
                    <div class="value">${newest}</div>
                </div>
                <div class="meta-card">
                    <div class="label">Oldest Article</div>
                    <div class="value">${oldest}</div>
                </div>
            </div>

            ${!passed ? `
                <div class="violations-section">
                    <h2>⚠ Sort Violations</h2>
                    ${violationRows}
                </div>` : ''}

                <div class="table-wrap">
                    <h2>All 100 Articles</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Title</th>
                                <th>Timestamp</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <footer>
                    Generated by qa-wolf-take-home &nbsp;·&nbsp; Michael Kaffel
                </footer>
        </body>
        </html>`;

            const reportDir = path.join(__dirname, '..', 'report');
            if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);

            const outPath = path.join(reportDir, 'index.html');
            fs.writeFileSync(outPath, html, 'utf8');
            console.log(`\nReport written to report/index.html`);

            /** @type {{ darwin: string, win32: string, linux: string }} */
            const openCmds = { darwin: 'open', win32: 'start', linux: 'xdg-open' };
            const p = /**@type {keyof typeof openCmds} */ (platform());
            const openCmd = openCmds[p] ?? 'open';
            const reportPath = platform() === 'win32' ? 'report\\index.html' : 'report/index.html';
            exec(`${openCmd} ${reportPath}`);
}

/**
 * Escapes characters that would break HTML rendering.
 * @param {string} str
 * @returns {string}
 */

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

module.exports = { printConsoleReport, writeHtmlReport };