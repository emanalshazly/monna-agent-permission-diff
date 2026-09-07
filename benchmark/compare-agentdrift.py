"""Adapt exact JSON line changes to the reviewed agentdrift pure rules engine."""
import difflib
import importlib.util
import json
import sys

spec = importlib.util.spec_from_file_location("agentdrift", sys.argv[1])
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
case = json.load(sys.stdin)
a, b = case["before"].splitlines(), case["after"].splitlines()
added, removed = [], []
for tag, i, j, k, l in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
    if tag in ("replace", "delete"):
        removed.extend(a[i:j])
    if tag in ("replace", "insert"):
        added.extend(b[k:l])
hunk = module.DiffHunk(file=case["file"], added_lines=added,
    removed_lines=removed, change_type="M", commit="synthetic",
    commit_date="2026-09-07", author="synthetic")
print(json.dumps([f.to_dict() for f in module.analyze_hunks([hunk])]))
