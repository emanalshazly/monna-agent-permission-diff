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

Recorded 2026-09-07: 32 local tests pass. No packet-capture or independent audit claim. See [release notes](RELEASE-v0.1.0.md).

## Follow-up: official SARIF schema validation

PASS on 2026-09-07: five generated reports (empty, permission expansion, partial coverage, server addition and endpoint change) validate against the [official OASIS SARIF 2.1.0 schema](https://github.com/oasis-tcs/sarif-spec/blob/ed71d4f62db866ce3698a08a5ec3f7f2e775545d/sarif-2.1/schema/sarif-schema-2.1.0.json). An invalid-version negative control is rejected.

Schema SHA-256: `c3b4bb2d6093897483348925aaa73af03b3e3f4bd4ca38cef26dcb4212a2682e`. Validator: Python `jsonschema==4.23.0`, `Draft4Validator` with `FormatChecker`.

Reproduce with `python benchmark/validate-sarif.py` in an isolated environment containing `jsonschema==4.23.0` and Node on PATH. This optional maintainer audit downloads the public pinned schema and verifies its digest. It sends no configuration data. Normal product use remains dependency-installation-free and performs no analysis network requests.

This follow-up closes the schema-validation gap recorded in the original v0.1.0 release notes. It does not prove all SARIF semantic requirements, GitHub ingestion, security effectiveness or market superiority. The five cases are authored tests, not an independent audit.
