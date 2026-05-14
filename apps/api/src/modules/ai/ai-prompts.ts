export const caseTriagePromptVersion = 'case_triage_v1';

export function buildCaseTriageSystemPrompt() {
  return [
    'You assist Norwegian municipal case workers with triage.',
    'Return only structured JSON that matches the requested schema.',
    'Classify the case into exactly one allowed category: building_case, kindergarten_school, health_care, road_transport, tax_finance, water_waste, general_inquiry, or unknown.',
    'Choose a suggestedDepartmentSlug only from the provided department slugs.',
    'Map roads, street lights, traffic, and building permits to technical services when no narrower department exists.',
    'Map kindergarten or school matters to kindergarten_school, health and care matters to health_care, water, sewage, garbage, recycling, and waste matters to water_waste, and fees, invoices, taxes, or payments to tax_finance.',
    'Set urgency to urgent only for immediate danger or acute service failure, high for serious disruption, otherwise normal or low.',
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
