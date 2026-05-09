export type NormalizedAddress = {
  sourceReferenceId: string | null;
  normalizedAddress: string;
  municipalityCode: string | null;
  municipalityName: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type KartverketAddressSearchResult = {
  query: string;
  results: NormalizedAddress[];
};

export type AddressValidationMode = 'required' | 'best_effort' | 'skip';

export type AddressValidationResult =
  | {
      status: 'validated';
      address: NormalizedAddress;
    }
  | {
      status: 'not_found' | 'failed' | 'skipped';
      address: null;
      safeMessage?: string;
    };

export type KartverketAddressCandidate = {
  adressetekst?: unknown;
  adressekode?: unknown;
  nummer?: unknown;
  bokstav?: unknown;
  kommunenummer?: unknown;
  kommunenavn?: unknown;
  postnummer?: unknown;
  poststed?: unknown;
  representasjonspunkt?: {
    lat?: unknown;
    lon?: unknown;
  };
};
