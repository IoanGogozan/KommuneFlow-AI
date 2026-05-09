export type MunicipalityPopulationStatistic = {
  municipalityCode: string;
  municipalityName: string | null;
  year: number;
  value: number;
  unit: string;
  sourceDataset: string;
  importedAt: Date;
};

export type ImportMunicipalityPopulationResult = {
  importRunId: string;
  source: 'ssb';
  dataset: string;
  year: number;
  recordsImported: number;
};

export type JsonStat2Dataset = {
  id?: unknown;
  size?: unknown;
  label?: unknown;
  source?: unknown;
  updated?: unknown;
  value?: unknown;
  dimension?: unknown;
  extension?: unknown;
};
