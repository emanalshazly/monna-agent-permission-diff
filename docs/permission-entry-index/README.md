# Index first permission entries once

Source baseline: `7555911a4990338791853c7f363c01941a2fd376`.

Permission-set comparison built unique sets but called `Array.indexOf` for
every added or removed value to recover its source index. Disjoint admitted
lists therefore repeatedly scanned each original list. The measured fictional
case has 40,000 strings in each input, 360,027 ASCII bytes/characters and 40,003
parsed nodes per file, within the existing 2 MB, 1 million character and 50,000
node limits. Both versions produce all 80,000 findings.

The fix stores the first occurrence index in a Map while visiting each list
once. The same Map supplies membership and source indices. Sorted unique keys
retain finding order; later duplicates do not overwrite the first evidence
location. This adds an index value per distinct entry in exchange for removing
the repeated linear searches. Sorting and parsing remain part of the work;
this does not claim that the entire comparator is linear for every input.

## Measured before and after

Windows x64, Node v24.15.0. Core timings use five interleaved samples after one
unmeasured warm-up per version. CLI timings use three fresh-process samples
per version and format, interleaving their order. CLI time includes input
reads, comparison, rendering and output writes; subsequent byte comparison and
hashing are outside its timer. Full samples are in `measurement.json`.

| Operation | Baseline median ms | Indexed median ms | Ratio |
|---|---:|---:|---:|
| Production `compare` | 1677.6490 | 99.3564 | 16.89x |
| JSON CLI | 1642.4577 | 270.4161 | 6.07x |
| Markdown CLI | 1571.4868 | 207.0673 | 7.59x |
| SARIF CLI | 1804.5587 | 455.7551 | 3.96x |

All three CLI formats were compared byte-for-byte using bounded read buffers
on every sample. JSON is 31,176,019 bytes; Markdown 9,040,671 bytes; SARIF
80,336,465 bytes. Each format's hash is recorded. Large fictional input/output
files are temporary and deleted; they are not committed or uploaded. Cleanup
checks the resolved temporary parent and the generated directory prefix first.

Reproduce from the candidate checkout, with the baseline available locally:

```sh
git worktree add --detach ../monna-entry-index-base 7555911a4990338791853c7f363c01941a2fd376
node benchmark/permission-entry-index.mjs ../monna-entry-index-base
node --test
node benchmark/run.mjs
```

The reproducer verifies four baseline source hashes and executes the actual
baseline and candidate modules/CLIs. It asserts output equivalence and accepted
input bounds, not a timing ratio. Functional controls cover all four permission
lists, first duplicate locations, index zero, lexical ordering, redaction and
unchanged-list behavior. These controls also pass on the baseline; the defect
being measured is repeated work, not a missed finding. No timing assertion is
added to CI. Required checks pass 42/42 tests and 10/10 authored benchmark cases
(`checks.json`). No dependency installation was needed.

This is one local synthetic workload, not independent validation, a general
performance guarantee or a browser timing measurement. Smaller, overlapping
or duplicate-heavy lists can have different ratios. No schema, rule, cap,
redaction behavior, source-line contract or effective-permission claim changes.
