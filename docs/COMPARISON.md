# Comparison evidence — 7 September 2026

No market-wide superiority claim is made. This is a scoped feature comparison using primary project documentation, not a head-to-head accuracy experiment. Undocumented behavior is unknown, not absent. Stars, vendor adoption numbers and self-reported performance are not evidence of our product's superiority.

| Project | Documented purpose | Relationship to MONNA |
|---|---|---|
| [MCP Inspector](https://github.com/modelcontextprotocol/inspector) | Interactive testing/debugging of MCP servers; client/proxy architecture | Complement: Inspector tests a running server; MONNA compares files without starting one. No comparison of vulnerability detection accuracy is meaningful. |
| [Snyk Agent Scan](https://github.com/snyk/agent-scan) | Discovery/security analysis of agents, MCP servers and skills; scan documentation describes starting configured stdio servers and using the analysis API | MONNA's narrower static review does not need server execution or an analysis service. Snyk offers analysis outside MONNA's scope. Inspect-only and other modes must not be conflated with scan mode. |
| [agent-permissions](https://github.com/Mearman/agent-permissions/) | Cross-agent policy, codecs, evaluation and synchronization | Complement: MONNA reviews changes; it does not replace policy synchronization or the policy evaluator. |

## Standards we can demonstrate

- Strict duplicate-key rejection and bounded parsing.
- Zero configuration values in default JSON/Markdown/SARIF, including hostile key names and credential canaries.
- Per-finding source-line evidence rather than unsupported risk scores.
- Explicit partial coverage and changed-unknown-field warnings.
- Stable versioned output structure, deterministic results, reproducible fixtures.
- No dependency installation, runtime server execution, model or analysis-network access.
- Read-only-token GitHub integration; shell-free input passing; pinned CI dependencies.

These are concrete acceptance criteria. They are not a claim that no other tool implements them. Local tests and hosted CI establish only their tested coverage. Actual effectiveness against representative user configurations and competitor versions requires a separately maintained, independently labeled corpus.

## Source-grounded format boundaries

Claude settings sources have precedence and merged lists: [settings documentation](https://code.claude.com/docs/en/settings). Two files cannot reconstruct the effective policy across all sources.

Permission mode, allow/ask/deny rules and additional directories are described in [Claude permission documentation](https://code.claude.com/docs/en/permissions). The initial tool recognizes changes to these declared fields; it does not implement the provider's complete evaluator.

## Next evidence needed

Solicit anonymized regression cases and independent review. Publish false-positive and missed-change cases without deleting failures from the benchmark. Add a format only with official references, realistic fixtures and error-path tests. Universal superiority remains unproven and must never appear in launch copy.
