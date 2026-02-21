/**
 * Claude API service.
 * Used exclusively for evaluating natural language property filters.
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001'; // Fast + cheap for filter evaluation

/**
 * Evaluate whether a property satisfies a natural language filter.
 *
 * @param {object} property - Parsed property object
 * @param {string} filterText - e.g. "good natural light", "quiet neighborhood"
 * @param {string} apiKey - Claude API key
 * @returns {{ passes: boolean, reason: string }}
 */
export async function evaluateNaturalLanguageFilter(property, filterText, apiKey) {
  if (!apiKey) throw new Error('Claude API key not set. Add it in Settings.');

  const propertyContext = buildPropertyContext(property);

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 150,
      system:
        'You evaluate real estate listing filters. Given a property description and facts, determine if the property satisfies a filter criterion. Respond with a JSON object: {"passes": true/false, "reason": "one brief sentence"}. Be strict but fair — only pass if there is clear evidence.',
      messages: [
        {
          role: 'user',
          content: `Property:\n${propertyContext}\n\nFilter: "${filterText}"\n\nDoes this property satisfy the filter? Respond with JSON only.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message ?? `Claude API error (HTTP ${response.status})`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text ?? '';

  try {
    // Extract JSON from response (Claude may wrap it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      passes: Boolean(parsed.passes),
      reason: String(parsed.reason ?? ''),
    };
  } catch {
    // If parsing fails, fall back to text analysis
    const lower = text.toLowerCase();
    const passes = lower.includes('"passes": true') || lower.startsWith('yes');
    return { passes, reason: text.slice(0, 100) };
  }
}

/**
 * Build a concise text summary of the property for the prompt.
 * Keeps token usage low while covering what matters for filters.
 */
function buildPropertyContext(property) {
  const lines = [];

  if (property.address) lines.push(`Address: ${property.address}`);
  if (property.homeType) lines.push(`Type: ${property.homeType}`);
  if (property.bedrooms != null) lines.push(`Bedrooms: ${property.bedrooms}`);
  if (property.bathrooms != null) lines.push(`Bathrooms: ${property.bathrooms}`);
  if (property.sqft != null) lines.push(`Living area: ${property.sqft} sqft`);
  if (property.lotSize != null) lines.push(`Lot: ${property.lotSize} ${property.lotSizeUnit ?? 'sqft'}`);
  if (property.yearBuilt != null) lines.push(`Year built: ${property.yearBuilt}`);

  if (property.facts?.length) {
    lines.push('Facts & features:');
    property.facts.slice(0, 20).forEach((f) => {
      lines.push(`  - ${f.label}: ${f.value}`);
    });
  }

  if (property.description) {
    // Truncate to ~600 chars to keep prompt small
    const desc = property.description.slice(0, 600);
    lines.push(`Description: ${desc}${property.description.length > 600 ? '...' : ''}`);
  }

  return lines.join('\n');
}
