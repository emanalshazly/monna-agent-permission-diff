# Contributing

Contributions are welcome under the MIT license. Start with an issue containing a redacted minimal before/after pair, the expected finding and the official documentation supporting that expectation. Do not post real credentials or private hostnames.

Run `node --test` and `node benchmark/run.mjs` with Node 22+. No dependency installation required. Add a failing fixture before fixing a missed change. Preserve stable rule codes; bump the schema version for incompatible report changes. Unknown behavior must remain explicit.

Do not add telemetry, config uploads, runtime MCP execution or automatic permission modifications to the static evaluator. Propose a separate opt-in design for any expanded trust boundary. Keep AI-generated contributions subject to the same review and tests as any other code.
