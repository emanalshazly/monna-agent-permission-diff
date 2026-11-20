import { ConfigError, parseConfig } from './json.mjs';

const needs = new Set(['required', 'approval_required', 'out_of_scope']);
const advice = {
  ALLOW_ADDED: {
    required: 'The task requires this rule. Confirm that its scope is as narrow as the task needs.',
    approval_required: 'Replace the direct allow with an approval rule and review how it is enforced.',
    out_of_scope: 'Remove the added allow. Keep the rules the task requires.'
  },
  ALLOW_REMOVED: {
    required: 'Check how the task will retain the required access before accepting the removal.',
    approval_required: 'Keep an approval rule for this capability so the task can request it when needed.',
    out_of_scope: 'Keep the unused allow removed. Review other grants separately.'
  },
  ASK_ADDED: {
    required: 'Confirm this approval step fits the task workflow.',
    approval_required: 'Keep the approval rule and check for overlapping allows in the effective policy.',
    out_of_scope: 'Keep this capability outside the task scope. An approval rule alone does not establish a task need.'
  },
  ASK_REMOVED: {
    required: 'Confirm the task policy permits removing this approval checkpoint.',
    approval_required: 'Restore the required approval checkpoint.',
    out_of_scope: 'Keep the previous approval requirement until this capability is excluded from the task configuration.'
  },
  DENY_ADDED: {
    required: 'Check whether this restriction blocks a required step and narrow it if policy permits.',
    approval_required: 'Check whether this restriction blocks the route that requires approval.',
    out_of_scope: 'Keep the restriction for this out-of-scope capability.'
  },
  DENY_REMOVED: {
    required: 'Confirm removing this restriction is necessary and permitted by policy.',
    approval_required: 'Confirm an approval rule governs the capability before removing the restriction.',
    out_of_scope: 'Keep the restriction unless the capability is excluded by another verified control.'
  }
};

const evidenceRequests = {
  UNMODELED_CHANGE: 'Provide the client or provider documentation for the changed field and the relevant redacted policy.',
  MODE_CHANGED: 'Provide the task approval requirements and effective client settings for this mode.',
  DIRECTORY_ADDED: 'Provide the directories the task needs and the client rules for resolving path access.',
  DIRECTORY_REMOVED: 'Check which task resources depend on the removed directory.',
  ENVIRONMENT_CHANGED: 'Provide the credential purpose and granted scopes with secret values redacted.',
  HEADERS_CHANGED: 'Provide the authorization purpose and granted scopes with header values redacted.'
};

export function parseTask(text) {
  const { data, locations } = parseConfig(text);
  if (Object.keys(data).some(key => key !== 'goal' && key !== 'rules')) {
    throw new ConfigError('Task policy accepts only goal and rules.');
  }
  if (typeof data.goal !== 'string' || !data.goal.trim()) {
    throw new ConfigError('Task policy requires a nonblank goal.');
  }
  if (Object.hasOwn(data, 'rules') && !Array.isArray(data.rules)) {
    throw new ConfigError('Task policy rules must be an array.');
  }

  const rules = new Map();
  for (const [index, entry] of (data.rules ?? []).entries()) {
    if (!entry || typeof entry !== 'object' || Object.keys(entry).length !== 2 ||
        typeof entry.rule !== 'string' || !entry.rule.trim() || !needs.has(entry.need)) {
      throw new ConfigError('Each task rule needs a nonblank rule and a need of required, approval_required, or out_of_scope.');
    }
    if (rules.has(entry.rule)) throw new ConfigError('Task policy contains a repeated rule.');
    rules.set(entry.rule, { need: entry.need, evidence: locations.get(`/rules/${index}/need`) });
  }
  return { goalEvidence: locations.get('/goal'), rules };
}

export function reviewTaskChange(policy, code, rule) {
  const ruleAdvice = advice[code];
  if (ruleAdvice) {
    const match = policy.rules.get(rule);
    if (!match) {
      return { need: 'unknown', recommendation: 'Provide the task policy for this exact permission rule.' };
    }
    return {
      need: match.need,
      recommendation: ruleAdvice[match.need],
      policy_evidence: match.evidence
    };
  }
  return {
    need: 'unknown',
    recommendation: evidenceRequests[code] ?? 'Provide the client or provider documentation and the task-scoped tool inventory and authorization policy.'
  };
}
