# Security policy

Do not submit secrets or exploitable private configurations in public issues. Use GitHub private vulnerability reporting on this repository when enabled. For ordinary false positives, use a synthetic public fixture.

Trust boundary: configuration text is untrusted input. The evaluator reads declared data and produces a review report; it must never execute command strings, expand environment variables, follow evidence URLs, grant permissions or interpret embedded instructions. Browser output uses textContent, not raw HTML.

Reports intentionally omit all configuration values and keys derived from user input. Source locations, rule identifiers and fixed descriptions remain. This reduces report disclosure; it is not a substitute for reviewing artifacts before publication. The tool cannot authenticate config provenance or detect all secrets elsewhere in a repository.
