"""Optional maintainer audit. Requires jsonschema==4.23.0 and network access.

Downloads only the official schema pinned to a commit; no configuration is sent.
This is schema conformance evidence, not a runtime security audit.
"""
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import subprocess
import urllib.request

from jsonschema import Draft4Validator, FormatChecker

SCHEMA_URL = (
    "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/"
    "ed71d4f62db866ce3698a08a5ec3f7f2e775545d/"
    "sarif-2.1/schema/sarif-schema-2.1.0.json"
)
root = Path(__file__).resolve().parent.parent
with urllib.request.urlopen(SCHEMA_URL, timeout=30) as response:
    raw = response.read(2_000_001)
if len(raw) > 2_000_000:
    raise RuntimeError("Unexpected schema size")
schema_digest = hashlib.sha256(raw).hexdigest()
if schema_digest != "c3b4bb2d6093897483348925aaa73af03b3e3f4bd4ca38cef26dcb4212a2682e":
    raise RuntimeError("Official schema digest differs from audited version")
schema = json.loads(raw)
Draft4Validator.check_schema(schema)
validator = Draft4Validator(schema, format_checker=FormatChecker())
generator = r"""
import {compare} from './src/diff.mjs';
import {sarif} from './src/report.mjs';
const cases = [
 ['empty', {permissions:{}}, {permissions:{}}],
 ['expansion', {permissions:{deny:['Read(.env)'],ask:['Bash']}},
  {permissions:{allow:['Bash(*)'],defaultMode:'bypassPermissions'}}],
 ['partial', {permissions:{futureMode:'a'}}, {permissions:{futureMode:'b'}}],
 ['server', {mcpServers:{}}, {mcpServers:{demo:{command:'never-execute'}}}],
 ['endpoint', {mcpServers:{demo:{url:'https://example.com/a'}}},
  {mcpServers:{demo:{url:'https://example.com/b'}}}]
];
console.log(JSON.stringify(cases.map(([name,a,b]) => ({name,
 report:sarif(compare(JSON.stringify(a,null,2),JSON.stringify(b,null,2)))}))));
"""
completed = subprocess.run(
    ["node", "--input-type=module", "-e", generator], cwd=root,
    capture_output=True, text=True, check=True, timeout=30,
)
reports = json.loads(completed.stdout)
for entry in reports:
    validator.validate(entry["report"])

# A deliberately invalid version must fail; prevents a vacuous validator pass.
invalid = {"version": "not-sarif", "runs": []}
if validator.is_valid(invalid):
    raise RuntimeError("Negative control unexpectedly passed")
print(json.dumps({
    "schema_url": SCHEMA_URL,
    "schema_sha256": schema_digest,
    "validator": f"jsonschema {version('jsonschema')} / Draft4Validator with FormatChecker",
    "passed_cases": [entry["name"] for entry in reports],
    "negative_control": "rejected",
    "scope": "Five generated reports; schema conformance only, not all SARIF semantics or GitHub ingestion",
}, indent=2))
