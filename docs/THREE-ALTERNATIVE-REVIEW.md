# Three-alternative review — MONNA Agent Permission Diff

Date: 7 September 2026. Status: **Executed first-party comparison; not an independent evaluation.**

## Decision

MONNA has a demonstrated advantage on the small, tested workflow of reviewing declared Claude/MCP configuration changes while omitting configuration values. It is **not the overall winner** across agent security. Other tools cover important surfaces MONNA does not.

Position it as **“Review agent configuration changes without putting configuration values in the report.”** Retain the MONNA prefix: a separately authored project already uses Agent Permission Diff. The name alone is not differentiation. No claim about legal rights is made.

## Why these three

The initial comparison with Inspector, Agent Scan and agent-permissions was too indirect for a competitive verdict. Fresh discovery identified closer alternatives by workflow overlap, not popularity:

| Alternative and pinned revision | Why selected | Scope evidence |
|---|---|---|
| [DebadityaHait/agent-permission-diff](https://github.com/DebadityaHait/agent-permission-diff/tree/77b8fae90e0662633ae471636ee13eec9f785e83), v0.3.0 | Direct configuration permission-delta alternative | Local provider snapshots, broadening review, Claude/Codex/Cursor adapters |
| [formalcore/mcp-diff](https://github.com/formalcore/mcp-diff/tree/b1a044e40d77e8a5d53c2dbc679514a0aaccaafc), v0.1.0 | Closely related MCP authority-change review | Compares declared server manifests after introspection, not pairs of client configuration files |
| [kriskimmerle/agentdrift](https://github.com/kriskimmerle/agentdrift/tree/e4564d11d4f1f3fb822fc9275298e5eea5dbd6c0), v1.0.0 | Change-history security review that includes agent configurations | Git history and line-pattern rules; also handles agent instruction files |

This is a bounded selection from the research, not proof these are the only or universally closest products.

## Executed change-signal checks

MONNA source revision: `a80c77f7ce08f5ff874e58f600e4f6ac8d6fd84c`, runtime Node 24.20.0 on Windows. Product runtime code was not changed for this comparison.

Fourteen authored cases were defined before execution: eleven non-cosmetic changes and three unchanged/reordered controls. Identical pretty-printed JSON bytes went to MONNA and the direct alternative; agentdrift received the exact added/removed lines via a documented adapter. The test asks **whether any finding appears**, not whether its severity, explanation or effective-permission judgment is correct.

| Engine | Changed cases producing any finding | Benign cases producing findings | Matches to authored expectations |
|---|---:|---:|---:|
| MONNA | 11/11 | 0/3 | 14/14 |
| DebadityaHait alternative | 4/11 | 0/3 | 7/14 |
| agentdrift | 4/11 | 0/3 | 7/14 |

Examples: MONNA flagged approval-rule removal, nested bypass-mode changes, directory addition and reordered executable arguments where the two alternatives produced no finding in these exact fixtures. Unknown-field changes count as reviewable in this protocol; another product may deliberately choose a different scope. Deny addition is a tightening change, not an attack, and is included only because this protocol reviews all declared changes. Do **not** advertise these counts as vulnerability-detection accuracy or “twice as secure.”

mcp-diff is **not scored on incompatible configuration input**. Its separate native-manifest suite matched 5/5 expectations: tool addition, read-only annotation loss, input-schema change, identical manifests and schema-key reordering. Those first three are outside MONNA's supported input model. Only its pure parser/diff/report functions were exercised; no actual MCP server or tool was run.

Native strengths were also checked separately: the direct alternative reported a Codex sandbox change from read-only to danger-full-access as critical; agentdrift flagged removal of a human-approval sentence in AGENTS.md. MONNA does not accept these native formats. These positives are not mixed into the common denominator.

## Secret handling

Two fixtures contain one unmistakably synthetic credential marker, in an environment value and a URL query parameter. No real credential was used.

- MONNA: marker absent from JSON, Markdown and SARIF in both fixtures.
- Direct alternative: marker present in JSON for the endpoint-change fixture, absent in its Markdown/SARIF outputs. Its documented redaction is heuristic, not a universal secret-removal guarantee.
- agentdrift: marker present in serialized findings for the endpoint fixture. Finding lines retain source evidence; its specific secret rule masks recognized patterns, which does not make every finding value-free.
- mcp-diff: client-configuration secret handling **not assessed** by a manifest-only test. No privacy ranking is assigned to it.

These are exact output observations, not claims of exploitation or universal leakage. MONNA's omission also costs usability: reviewers must reopen source lines to see the actual changed values. It does not sanitize the original files or prevent them being committed.

## Ease of use — observable workflow, not user-study scores

| Product | Practical strength | Cost or boundary |
|---|---|---|
| MONNA | Static Arabic/English controls; two files; CLI without npm install | Node 22+ for CLI; manually prepare before/after files; findings remain English; completed browser downloads unverified, text fallback available |
| Direct alternative | Project discovery, persistent baseline, npm entry point | Snapshot/baseline workflow; heuristic provider semantics; no timed novice study performed |
| mcp-diff | Baseline pinning, structured verdict and ruleset provenance, MCP-native review | Normal stdio introspection starts configured server processes; “never calls tools” is not “never starts servers” |
| agentdrift | Single Python file without pip dependencies; Git-history/instruction review | Requires Git history for normal workflow; line-pattern behavior can depend on formatting |

Competitor source builds succeeded with install scripts disabled. A broken global npm installation on this host required using the bundled npm CLI path; this was an environment issue, not a competitor defect. No installation-speed or adoption conclusions are drawn.

## Evidence and reproduction

- [Harness](../benchmark/compare-three.mjs), [agentdrift adapter](../benchmark/compare-agentdrift.py), [fixtures and raw results](../benchmark/comparison-results.json).
- Raw-results SHA-256: `51be946c3ed2f65dbca612fca00515872933c3a10f97099a0e4b6bf2892837aa`.
- Check out the exact revisions above in sibling folders named `agent-permission-diff`, `mcp-diff`, `agentdrift`. Inspect source first. In each TypeScript project run `npm ci --ignore-scripts --no-audit --no-fund`, then `node node_modules/typescript/lib/tsc.js -p tsconfig.json`. For mcp-diff also run its inspected `node scripts/postbuild.mjs` to copy the ruleset asset.
- On Windows with Node and the `py` launcher available, run `node benchmark/compare-three.mjs <parent-of-checkouts>`. The harness checks source revisions and rejects tracked modifications. It creates only synthetic temporary fixture directories. Do not point it at real configurations. Generated evidence replaces comparison-results.json; timestamps and synthetic-root normalization mean the byte hash can change on rerun.
- PASS: MONNA's existing 32 tests still pass. No competitor CLI end-to-end, hosted integration, packet capture, independent audit, representative customer corpus or human usability study was performed.

## Recommendation

Keep the value-free, line-linked pre-merge review as the differentiator. Do not expand into server introspection or all-provider policy evaluation merely to imitate competitors. Validate usefulness with a small developer pilot before making demand or revenue claims. Any public comparison should retain pinned versions, raw evidence, selection limits and native competitor strengths.
