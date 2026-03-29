# QA Wolf Take Home — Michael Kaffel

Solution by [Michael Kaffel](https://michaelkaffel.vercel.app) &nbsp;·&nbsp; [Portfolio](https://michaelkaffel.vercel.app) &nbsp;·&nbsp; [GitHub](https://github.com/michaelkaffel)

---

## Running the Script

```bash
npm i
node index.js
```

The browser will open, collect 100 articles across multiple pages, then print a pass/fail summary to the terminal and automatically open an HTML report in your browser.

---

## Project Structure

```
qa_wolf_take_home/
├── lib/
│   ├── types.js       — shared Article and Violation typedefs
│   ├── collector.js   — DOM scraping (collectArticlesFromPage)
│   ├── validator.js   — sort order validation (validateSortOrder)
│   └── reporter.js    — terminal output and HTML report generation
├── report/            — generated at runtime, gitignored
│   └── index.html
├── index.js           — orchestrator: browser setup, pagination, sequencing
├── playwright.config.js
└── package.json
```

---

## Implementation Decisions

**Timestamp precision** — HN's visible "N minutes ago" text is too coarse for reliable comparison. The `title` attribute on `span.age` contains a precise ISO 8601 timestamp (e.g. `2026-03-28T20:06:37`) which is parsed directly into a `Date` object for comparison. HN currently appends a Unix epoch value after a space in this attribute — the script splits on the space and uses only the ISO portion.

**Pagination** — HN shows 30 articles per page. The script follows the `a.morelink` element across pages until exactly 100 articles are collected, then stops.

**Validation** — consecutive timestamps are compared as `Date` objects. Equal timestamps are permitted (two articles posted in the same second). Any out-of-order pair is recorded as a violation with its position, title, and timestamps.

**HTML report** — after each run an HTML report is written to `report/index.html` and opened automatically. It includes:
- Pass/fail banner (green/red)
- Meta cards: result, articles checked, elapsed time, run timestamp, newest and oldest article
- Full table of all 100 articles with violations highlighted in red
- Violation detail section listing each out-of-order pair

**Cross-platform auto-open** — uses Node's `os.platform()` to select `open` (macOS), `start` (Windows), or `xdg-open` (Linux).

**CI-friendly** — exits with code `1` on any failure (count mismatch or sort violation).

**Type safety** — `// @ts-check` is enabled across all files. Types are defined once in `lib/types.js` and imported via JSDoc `@typedef` in each module that needs them.

---

---

## 🐺 QA Wolf Take Home Assignment

Welcome to the QA Wolf take home assignment for our [QA Engineer](https://www.task-wolf.com/apply-qae) role! We appreciate your interest and look forward to seeing what you come up with.

## Instructions

This assignment has two questions as outlined below. When you are done, upload your assignment to our [application page](https://www.task-wolf.com/apply-qae):

### Question 1

In this assignment, you will create a script on [Hacker News](https://news.ycombinator.com/) using JavaScript and Microsoft's [Playwright](https://playwright.dev/) framework.

1. Install node modules by running `npm i`.

2. Edit the `index.js` file in this project to go to [Hacker News/newest](https://news.ycombinator.com/newest) and validate that EXACTLY the first 100 articles are sorted from newest to oldest. You can run your script with the `node index.js` command.

Note that you are welcome to update Playwright or install other packages as you see fit, however you must utilize Playwright in this assignment.

### Question 2

Why do you want to work at QA Wolf? Please record a short, ~2 min video using [Loom](https://www.loom.com/) that includes:

1. Your answer

2. A walk-through demonstration of your code, showing a successful execution

The answer and walkthrough should be combined into *one* video, and must be recorded using Loom as the submission page only accepts Loom links.

## Frequently Asked Questions

### What is your hiring process? When will I hear about next steps?

This take home assignment is the first step in our hiring process, followed by a final round interview if it goes well. **We review every take home assignment submission and promise to get back to you either way within two weeks (usually sooner).** The only caveat is if we are out of the office, in which case we will get back to you when we return. If it has been more than two weeks and you have not heard from us, please do follow up.

The final round interview is a 2-hour technical work session that reflects what it is like to work here. We provide a $150 stipend for your time for the final round interview regardless of how it goes. After that, there may be a short chat with our director about your experience and the role.

Our hiring process is rolling where we review candidates until we have filled our openings. If there are no openings left, we will keep your contact information on file and reach out when we are hiring again.

### Having trouble uploading your assignment?

Be sure to delete your `node_modules` file, then zip your assignment folder prior to upload.

### How do you decide who to hire?

We evaluate candidates based on three criteria:

- Technical ability (as demonstrated in the take home and final round)
- Customer service orientation (as this role is customer facing)
- Alignment with our mission and values (captured [here](https://qawolf.notion.site/Mission-and-Values-859c7d0411ba41349e1b318f4e7abc8f))

This means whether we hire you is based on how you do during our interview process, not on your previous experience (or lack thereof). Note that you will also need to pass a background check to work here as our customers require this.

### How can I help my application stand out?

While the assignment has clear requirements, we encourage applicants to treat it as more than a checklist. If you're genuinely excited about QA Wolf, consider going a step further—whether that means building a simple user interface, adding detailed error handling or reporting, improving the structure of the script, or anything else that showcases your unique perspective.

There's no "right" answer—we're curious to see what you choose to do when given freedom and ambiguity. In a world where tools can help generate working code quickly and make it easier than ever to complete technical take-homes, we value originality and intentionality. If that resonates with you, use this assignment as a chance to show us how you think.

Applicants who approach the assignment as a creative challenge, not just a checklist, tend to perform best in our process.
