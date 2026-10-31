# Reject named-pipe inputs before waiting for content

Base: `7555911a4990338791853c7f363c01941a2fd376`.

The CLI promises regular-file input admission, but opens the path before checking
the descriptor's type. On POSIX a FIFO with no writer blocks that open, so the
regular-file check is never reached. This is a local CLI input-handling defect;
configuration commands are not executed.

The regression creates an empty named pipe and invokes the real CLI with it in
each input position. On the base implementation the first invocation exceeds
the two-second test deadline with no report or invalid-input response. Opening
with `O_RDONLY | O_NONBLOCK` reaches the existing descriptor check instead. Both
positions return exit 2, empty stdout and redacted `invalid_input` JSON. The
regular-file comparison still returns exit 0 with no findings.

Reproduce from the repository root with Node 22+:

```sh
node --test test/cli-special-files.test.mjs
node --test
node benchmark/run.mjs
```

Observed with Node 24.15.0:

| Environment | Base with regression | Fixed | Benchmark |
|---|---|---|---|
| Ubuntu / WSL2, native POSIX FIFO | 40 pass, 1 timeout failure | 41 pass, no skips | 10/10 before and after |
| Windows | FIFO case not applicable | 40 pass, 1 POSIX skip | 10/10 after |

The native test uses the system `mkfifo` utility, fictional configuration text,
temporary files and the actual CLI process. No parser/file-read mocks or package
installation are used. Where `O_NONBLOCK` is not available, flags fall back to
the existing read-only open; Windows regular-file behavior is covered by the
executed suite. No macOS run, hosted CI, runtime-agent or security-scanner result
is claimed. No permission-change rules, source coordinates or report schema change.
