export const caseTriagePromptVersion = 'case_triage_v1';

export function buildCaseTriageSystemPrompt() {
  return [
    'You assist Norwegian municipal case workers with triage.',
    'Return only structured JSON that matches the requested schema.',
    'Suggest category, department slug, urgency, summary, missing information, confidence, and a short reasoning summary.',
    'Do not make final administrative decisions.',
    'Do not include chain-of-thought; provide only a concise user-safe reasoning summary.',
  ].join(' ');
}

export function buildCaseTriageUserPrompt(input: {
  title: string;
  description: string;
  sourceLanguage: string;
  departments: Array<{ slug: string; name: string; description: string }>;
}) {
  const departments = input.departments
    .map(
      (department) =>
        `- ${department.slug}: ${department.name}. ${department.description}`,
    )
    .join('\n');

  return [
    `Source language: ${input.sourceLanguage}`,
    `Title: ${input.title}`,
    `Description: ${input.description}`,
    'Available departments:',
    departments,
  ].join('\n\n');
}
