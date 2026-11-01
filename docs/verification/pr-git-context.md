# Explicit PR repository under an ambient Git context

Base: `7555911a4990338791853c7f363c01941a2fd376`.

The PR reviewer accepts `cwd` as the repository to inspect. Git's inherited
repository/object-store routing variables override that directory. Calling the
reviewer from another repository's Git context therefore rejects an available,
valid PR comparison as missing history.

The regression creates two synthetic repositories and adds one fictional allow
entry to the selected repository. It checks three ambient contexts: `GIT_DIR`
with `GIT_WORK_TREE`, `GIT_OBJECT_DIRECTORY`, and `GIT_COMMON_DIR`. Each must return
the selected repository's `ALLOW_ADDED` finding. An ordinary-context control
still discovers the selected configuration. The parent environment is unchanged.

Before the source change, the new regression fails with `Git objects unavailable
or repository limit exceeded` at the first routed context. After the change,
all three contexts and the ordinary control pass. Only the child Git commands'
repository/object-store routing variables are removed; threshold, source-link,
redaction, and comparison behavior stay the same.

Executed on Windows x64 / Node v24.15.0:

```text
node --test --test-name-pattern="selected repository" test/pr-review.test.mjs
before: 1 test, 0 pass, 1 fail

node --test
after: 41 tests, 41 pass, 0 fail, 0 skip

node benchmark/run.mjs
after: 10/10 synthetic fixtures, 1000 iterations
```

No configured command, external service, hosted workflow, Linux/macOS runner,
or effective-permission evaluation was exercised. These results show the local
declared-configuration review workflow only.
