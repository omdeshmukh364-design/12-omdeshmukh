import { createServer } from "node:http";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";

const issues = [
    {
        number: 6,
        title: "Implement pagination on the game list page",
        body: "The catalog currently loads every game on one page. Pagination would keep the list fast and easier to browse as the number of games grows, with helper, accessibility, unit-test, and Playwright requirements.",
        why: "Highest urgency because it addresses a growth-related performance problem and establishes a scalable list pattern before more catalog features land.",
        url: "https://github.com/omdeshmukh364-design/om-Tailspin_Toys/issues/6",
        priority: "High",
    },
    {
        number: 1,
        title: "Add a search box to find games by title",
        body: "Players who already know what they want should be able to narrow the catalog by title. The issue calls for case-insensitive matching, an accessible testable control, and an empty state.",
        why: "High user value and a natural companion to the existing category and publisher filters, improving discoverability for every catalog visitor.",
        url: "https://github.com/omdeshmukh364-design/om-Tailspin_Toys/issues/1",
        priority: "High",
    },
    {
        number: 5,
        title: "Show a catalog summary on the home page",
        body: "The landing page should show the total number of games and the average star rating, including graceful handling for empty and unrated catalogs.",
        why: "Likely a focused, low-risk improvement that can quickly make the landing page more informative while reusing data already in the database.",
        url: "https://github.com/omdeshmukh364-design/om-Tailspin_Toys/issues/5",
        priority: "Medium",
    },
    {
        number: 4,
        title: "Add a publisher page listing that publisher's games",
        body: "Add prerendered publisher pages with publisher metadata and a reusable game-card listing, then link publisher names into those pages.",
        url: "https://github.com/omdeshmukh364-design/om-Tailspin_Toys/issues/4",
        priority: "Medium",
    },
    {
        number: 3,
        title: "Show category and publisher descriptions on the game detail page",
        body: "Surface the existing category and publisher descriptions on game details, hiding missing descriptions and covering the data layer and UI with tests.",
        url: "https://github.com/omdeshmukh364-design/om-Tailspin_Toys/issues/3",
        priority: "Low",
    },
    {
        number: 2,
        title: "Allow users to sort the game list",
        body: "Add accessible sorting by title in both directions and by highest star rating, with documented handling for unrated games.",
        url: "https://github.com/omdeshmukh364-design/om-Tailspin_Toys/issues/2",
        priority: "Low",
    },
];

const attached = new Set();
const servers = new Map();

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function renderCard(issue, isTop) {
    const isAttached = attached.has(issue.number);
    return `
      <article class="card ${isTop ? "top-card" : ""}" data-issue="${issue.number}">
        <div class="card-heading">
          <span class="issue-number">#${issue.number}</span>
          <span class="priority priority-${issue.priority.toLowerCase()}">${issue.priority}</span>
        </div>
        <h3><a href="${escapeHtml(issue.url)}" target="_blank" rel="noreferrer">${escapeHtml(issue.title)}</a></h3>
        <p>${escapeHtml(issue.body)}</p>
        ${isTop ? `<div class="why"><strong>Why it is top three</strong><br>${escapeHtml(issue.why)}</div>` : ""}
        <button class="attach" data-issue-number="${issue.number}" ${isAttached ? "disabled" : ""}>
          ${isAttached ? "Added to current context" : "Add to current context"}
        </button>
      </article>`;
}

function renderHtml() {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Issue triage board</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--background-color-default, #ffffff);
      --surface: var(--background-color-muted, #f6f8fa);
      --border: var(--border-color-default, #d0d7de);
      --text: var(--text-color-default, #1f2328);
      --muted: var(--text-color-muted, #656d76);
      --blue: var(--true-color-blue, #0969da);
      --blue-muted: var(--true-color-blue-muted, #ddf4ff);
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; background: var(--bg); color: var(--text); font: 14px/1.5 var(--font-sans, system-ui, sans-serif); }
    main { max-width: 1100px; margin: 0 auto; }
    header { margin-bottom: 24px; }
    h1 { margin: 0 0 6px; font-size: 26px; }
    .subtitle { margin: 0; color: var(--muted); }
    section { margin-top: 26px; }
    .section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    h2 { margin: 0; font-size: 18px; }
    .section-heading span { color: var(--muted); font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
    .card { display: flex; flex-direction: column; gap: 10px; padding: 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
    .top-card { border-color: color-mix(in srgb, var(--blue) 45%, var(--border)); box-shadow: 0 2px 10px color-mix(in srgb, var(--blue) 12%, transparent); }
    .card-heading { display: flex; justify-content: space-between; align-items: center; }
    .issue-number { color: var(--muted); font-family: var(--font-mono, monospace); font-size: 12px; }
    .priority { border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
    .priority-high { background: #ffebe9; color: #cf222e; }
    .priority-medium { background: #fff8c5; color: #9a6700; }
    .priority-low { background: var(--blue-muted); color: var(--blue); }
    h3 { margin: 0; font-size: 16px; line-height: 1.3; }
    h3 a { color: var(--text); text-decoration: none; }
    h3 a:hover, h3 a:focus { color: var(--blue); text-decoration: underline; }
    .card p { margin: 0; color: var(--muted); }
    .why { margin-top: 2px; padding: 10px; border-left: 3px solid var(--blue); background: color-mix(in srgb, var(--blue-muted) 50%, transparent); color: var(--text); }
    .why strong { color: var(--blue); }
    button { margin-top: auto; border: 1px solid var(--blue); border-radius: 6px; padding: 8px 10px; background: var(--blue); color: white; font: inherit; font-weight: 600; cursor: pointer; }
    button:hover:not(:disabled) { filter: brightness(1.1); }
    button:focus-visible, a:focus-visible { outline: 2px solid var(--color-focus-outline, var(--blue)); outline-offset: 2px; }
    button:disabled { cursor: default; opacity: .7; }
    @media (max-width: 600px) { body { padding: 16px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Issue triage board</h1>
      <p class="subtitle">A quick prioritization pass for the open Tailspin Toys backlog. Add any issue to this session's context to start work immediately.</p>
    </header>
    <section aria-labelledby="top-heading">
      <div class="section-heading"><h2 id="top-heading">Needs attention now</h2><span>Top 3 recommended next moves</span></div>
      <div class="grid">${issues.slice(0, 3).map((issue) => renderCard(issue, true)).join("")}</div>
    </section>
    <section aria-labelledby="remaining-heading">
      <div class="section-heading"><h2 id="remaining-heading">Remaining backlog</h2><span>${issues.length - 3} more open issues</span></div>
      <div class="grid">${issues.slice(3).map((issue) => renderCard(issue, false)).join("")}</div>
    </section>
  </main>
  <script>
    document.querySelectorAll('.attach').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Adding...';
        const response = await fetch('/attach', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ issueNumber: Number(button.dataset.issueNumber) })
        });
        const result = await response.json();
        button.textContent = result.ok ? 'Added to current context' : 'Could not add issue';
        button.disabled = result.ok;
      });
    });
  </script>
</body>
</html>`;
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
            try { resolve(JSON.parse(body || "{}")); } catch (error) { reject(error); }
        });
        req.on("error", reject);
    });
}

async function startServer() {
    const server = createServer(async (req, res) => {
        if (req.method === "POST" && req.url === "/attach") {
            try {
                const input = await readJson(req);
                const issue = issues.find((candidate) => candidate.number === Number(input.issueNumber));
                if (!issue) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(JSON.stringify({ ok: false, error: "Issue not found" }));
                    return;
                }
                attached.add(issue.number);
                await session.send({
                    prompt: `Add issue #${issue.number} to the current working context. Issue title: ${issue.title}. Issue details: ${issue.body}`,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ ok: true, issueNumber: issue.number }));
            } catch (error) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Invalid request" }));
            }
            return;
        }
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(renderHtml());
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

let session;
session = await joinSession({
    canvases: [
        createCanvas({
            id: "issue-triage-board",
            displayName: "Issue triage board",
            description: "A Kanban board that highlights the three open issues most likely to need attention now.",
            actions: [
                {
                    name: "attach_issue",
                    description: "Add an issue from the board to the current session context.",
                    inputSchema: {
                        type: "object",
                        properties: { issueNumber: { type: "integer", minimum: 1 } },
                        required: ["issueNumber"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const issueNumber = Number(ctx.input?.issueNumber);
                        const issue = issues.find((candidate) => candidate.number === issueNumber);
                        if (!issue) throw new CanvasError("issue_not_found", `Issue #${issueNumber} is not on this board.`);
                        attached.add(issue.number);
                        await session.send({ prompt: `Add issue #${issue.number} to the current working context. Issue title: ${issue.title}. Issue details: ${issue.body}` });
                        return { ok: true, issueNumber: issue.number };
                    },
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer();
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "Issue triage board", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
