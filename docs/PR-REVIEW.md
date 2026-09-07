# Automatic pull-request review

This Action discovers supported configuration files changed by a PR, loads their Git blobs at the merge base and PR head, and writes a source-linked review to the Actions job summary. No manual before/after files are needed. It does not post comments, approve or merge PRs, or modify branch protection.

## Supported paths

At repository root or nested project roots: `.claude/settings.json`, `.claude/settings.local.json`, `.mcp.json`, `.cursor/mcp.json`.

Recognized but not parsed: `.codex/config.toml`, `.vscode/mcp.json`, and Claude `settings.jsonc` variants. A change to one of these produces **incomplete** and exit 2, requiring manual review. Other filenames are outside discovery scope; absence of a supported file never means the repository is safe.

The report gives an immutable source link, source line, change identifier, why it needs review, and an action for the reviewer. Configuration values are withheld; repository paths are necessarily visible in source links. Added/deleted files use explicit synthetic empty states, never fake source-line links. Renames are treated as deletion plus addition.

## Integration requirements

Copy [the complete pinned workflow](../.github/workflows/permission-review.yml) into `.github/workflows/permission-review.yml` in the repository being reviewed. No API key, input file paths or write permission is required. The reviewer is pinned to `0f0be5d4df066dec37856fbb014ac8d8a5009f0c`.

Use a `pull_request` workflow, `contents: read`, full-history checkout (`fetch-depth: 0`) and Node 22+. Invoke the `pr-review` action from a reviewed immutable commit, not from the proposed checkout. Never use `pull_request_target` with untrusted code. The runner rejects that event.

The event's base/head SHAs are read automatically. A single merge base must be available; shallow or ambiguous history fails visibly. There is no fallback to comparing the wrong branch tip. Missing objects, invalid UTF-8/JSON, symlinks, oversized files and more than 100 recognized changed configs cannot produce a clean gate.

Exit codes: 0 below configured threshold or no recognized changes; 1 findings at threshold; 2 incomplete. Default threshold is medium so unknown-field changes require review. Tightening findings are normally informational. Make the job a required check through repository settings if enforcement is desired; this installation does not alter settings automatically.

Git reads only; no config commands, hooks, PR modules or MCP servers are executed by the reviewer. Use normal complete Git objects, not a partial clone whose Git object reads may trigger network retrieval. Reports are local job summaries, with no write token needed. Changes to workflow controls still need owner review; this Action is not tamper-proof enforcement against maintainers who can edit those controls.

## Measured pilot

Executed on two **selected historical commits**, not live customer PRs:

| Repository | All changed files | Recognized configurations | Findings | Review specificity |
|---|---:|---:|---:|---|
| everything-claude-code | 3 | 1 | 2 | Unknown-field changes; manual interpretation required |
| MCP Inspector | 53 | 1 | 1 | Unknown-field change; manual interpretation required |

Across these two commits, discovery narrowed 56 changed files to 2 configuration files. This is selection evidence, **not measured time saved**. All three findings were UNMODELED_CHANGE; none is a confirmed vulnerability or proof of useful permission-risk detection. Coverage is partial. Extraction/comparison took roughly 0.39 and 0.51 seconds on this host, excluding repository fetch; not a performance benchmark.

[Raw pilot metrics](pr-pilot/results.json), [first review](pr-pilot/affaan-m--everything-claude-code.md), [second review](pr-pilot/modelcontextprotocol--inspector.md). Reproduce with `node benchmark/pr-history-pilot.mjs`; it fetches the pinned public history into fresh temporary bare repositories and never executes project code or contacts their maintainers.

Local tests: 40 pass, including eight PR-specific scenarios. These cover automatic discovery, additions/deletions, merge-base divergence, invalid/unsupported input, rename behavior, unsafe refs, source-link escaping, summary output, and privileged-event refusal.

## Live integration evidence

[Synthetic draft PR #1](https://github.com/emanalshazly/monna-agent-permission-diff/pull/1) exercised automatic discovery on GitHub. [Run 34079470067](https://github.com/emanalshazly/monna-agent-permission-diff/actions/runs/34079470067) returned `review_required` and exit 1 as expected for the deliberately added allow rule and bypass mode. [The six-platform/runtime jobs passed](https://github.com/emanalshazly/monna-agent-permission-diff/actions/runs/34079469987). The draft is marked do-not-merge; this is our own integration fixture, not an independent customer pilot.

The installed workflow also saves the value-free Markdown report as a 14-day artifact, even when the review gate fails. Artifact download requires GitHub sign-in. Source paths remain visible. No source configuration file is uploaded as an artifact.

Verified artifact delivery: [run 34079623177](https://github.com/emanalshazly/monna-agent-permission-diff/actions/runs/34079623177) uploaded `permission-review-report` successfully despite the expected review failure. The artifact was downloaded and read: it contains ALLOW_ADDED at head line 3 and MODE_CHANGED at head line 4, each with source links, a reason and an action. Base/head were extracted automatically. The red review check is intentional for this synthetic fixture; it is not a failed test of the integration.

## Next user evidence

The next useful pilot is a consenting maintainer's real PR: record whether each finding was relevant, whether it changed their decision, and how long review took with and without this report. Until then, usefulness and time savings remain unverified. The present pilot specifically exposes weak guidance for plugin/hook/provider-extension changes; adding another generic warning is not evidence that this gap is solved.
