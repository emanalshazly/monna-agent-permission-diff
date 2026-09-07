# MONNA Agent Permission Diff v0.1.0

Review declared agent permission changes locally, without API keys or executing configured servers.

- CLI, static English/Arabic demo, and GitHub Action.
- Claude permission settings and MCP configuration comparisons.
- Source-line evidence with configuration values omitted.
- JSON, Markdown, SARIF and configurable review thresholds.
- Strict bounded JSON input, explicit partial coverage, MIT license.

Start with the README's worked example or the [public demo](https://emanalshazly.github.io/monna-agent-permission-diff/).

Evidence: 32 local automated tests; six hosted OS/Node combinations green on initial commit e3e7ca3; ten authored synthetic benchmark fixtures. [Hosted evidence](https://github.com/emanalshazly/monna-agent-permission-diff/actions/runs/34076919616).

Public browser sample: six expected findings. Arabic controls and invalid-input handling checked. Copyable JSON fallback observed locally. Completed file downloads were not confirmed through browser automation.

Known limits: literal rule/path comparison only, no effective permission evaluation or policy-layer merging, no JSONC. Findings remain English. SARIF has not undergone external schema validation. No npm publication or Marketplace listing is claimed.

Feedback sought: sanitized fixtures, unsupported formats and reproducible false positives. Never post secrets or private configurations in public issues. This release is not an independent audit or proof of superiority over the whole market.
