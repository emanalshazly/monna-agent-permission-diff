# Quality gates

| Requirement | Evidence required | Current verification |
|---|---|---|
| No server execution | Source dependency review; executable strings remain data | Core imports only strict parser; tests include arbitrary command strings |
| No analysis network | No fetch/network dependency in evaluator, CLI or reporters | Source inspection; browser network behavior requires UI verification |
| No values leaked | Canary in values, keys, credentials, commands and error inputs | Automated JSON/Markdown/SARIF/error canary tests |
| Input ambiguity rejected | Duplicate, escaped duplicate, invalid UTF-8 and malformed fields | Parser/CLI tests; expand cases with independent contributions |
| Reviewable unknowns | Unknown changed fields create findings; unchanged fields reduce coverage | Automated tests including new-server extensions |
| Reproducible output | Key reorder invariance, stable order and no clock-dependent fields | 100 reorder cases plus repeated comparisons |
| GitHub usability | Job summary, exit threshold, workspace-bound file access | PASS: local Action runner tests and hosted CI |
| Cross-platform | Node 22/24 on Linux, macOS and Windows | PASS: all six jobs in [run 34076919616](https://github.com/emanalshazly/monna-agent-permission-diff/actions/runs/34076919616) |
| Browser workflow | Compare sample, invalid input, language switch, exports | PASS: public sample with six findings, language switch and invalid input; local copyable JSON fallback. Download completion UNVERIFIED in browser automation |

The benchmark's ten authored fixtures are transparent engineering checks, not independent evidence of superiority. Keep this distinction in announcements.

Recorded 2026-09-07: 32 local tests pass. SARIF structure and locations tested; external schema validation unverified. No packet-capture or independent audit claim. See [release notes](RELEASE-v0.1.0.md).
