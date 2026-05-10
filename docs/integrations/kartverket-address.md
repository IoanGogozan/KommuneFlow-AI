# Kartverket Address Integration

## Purpose

KommuneFlow AI uses Kartverket's address API through Geonorge to support address search and address validation during citizen case intake.

This supports the municipal case workflow by:

- helping citizens find a normalized address
- enriching cases with municipality code and municipality name
- enabling SSB analytics enrichment through municipality code
- recording integration health without storing unnecessary raw API payloads
- keeping external API calls mocked in tests and CI

## Source API

Initial API:

- Source: Kartverket / Geonorge
- API: Adresse-API
- Base URL: `https://ws.geonorge.no/adresser/v1`
- Endpoint used: `GET /sok`
- Authentication: not required for the public API
- Internal default timeout: `3000` ms
- Maximum normalized results returned by KommuneFlow AI: `8`

References:

- https://ws.geonorge.no/adresser/v1/
- https://kartverket.no/api-og-data/adresse-api

## API Usage

The backend calls Kartverket with:

```http
GET https://ws.geonorge.no/adresser/v1/sok?sok={query}
```

KommuneFlow AI also requests a limited field set through `filtrer`:

```txt
adresser.adressetekst
adresser.adressekode
adresser.nummer
adresser.bokstav
adresser.kommunenummer
adresser.kommunenavn
adresser.postnummer
adresser.poststed
adresser.representasjonspunkt
```

The query is normalized before the request:

- trim whitespace
- collapse repeated whitespace
- minimum length: `3`
- maximum length: `120`

## Internal Endpoints

Authenticated internal address search:

```http
GET /api/v1/integrations/kartverket/address-search?q=Storgata%2012
```

Public citizen-intake address search:

```http
GET /api/v1/public/tenants/{tenantSlug}/integrations/kartverket/address-search?q=Storgata%2012
```

The public endpoint is rate-limited:

```txt
20 requests / minute
```

## Stored Fields

Validated intake addresses are stored in `CaseAddress`.

Stored fields:

- original citizen input
- normalized address
- municipality code
- municipality name
- postal code
- latitude
- longitude
- source: `kartverket`
- source reference ID
- validation status
- validation timestamp

Validation statuses:

- `validated`
- `not_found`
- `failed`
- `skipped`

## Fields Not Stored

The application does not store the full raw Kartverket response for case addresses.

It also does not store:

- the full search result list for every query
- raw upstream error payloads
- external request headers
- citizen search session history

Internal authenticated searches create an audit event with safe metadata only:

- query length
- result count

## Privacy Behavior

Address data can identify a person or household when combined with other case data. The integration therefore stores only the fields needed for case handling and analytics enrichment.

Privacy constraints:

- public address search is rate-limited
- raw upstream payloads are not persisted
- logs and operational events store query length, not the full query
- analytics uses municipality code/population aggregates, not full addresses
- address enrichment is tenant-scoped through the case record

## Failure Behavior

Search failures return a safe generic API response:

```txt
Address lookup is unavailable.
```

Failure details are recorded internally as:

- `IntegrationHealthEvent`
- `OperationalEvent` with event type `integration.kartverket.failed`

Recorded safe metadata includes:

- query length
- safe error code such as `timeout`, `invalid_response`, or `http_500`
- latency where available

During citizen intake, address validation is best-effort by default. If Kartverket is unavailable, case creation can continue and the address row is stored with validation status `failed`.

## Operational Events

Every address search attempts to write an `IntegrationHealthEvent`.

Examples:

- successful search: `integrationName=kartverket_address`, `eventType=address_search`, `status=success`
- failed search: `integrationName=kartverket_address`, `eventType=address_search`, `status=failed`

Operations metrics read these events for:

- lookup count
- failure count
- average latency

Failures also create operational events so the operations dashboard is backed by persisted operational data.

## Test Mocking

CI must not call real Kartverket.

Tests mock `global.fetch` and return a minimal Kartverket-shaped response:

```json
{
  "adresser": [
    {
      "adressetekst": "Storgata 12",
      "adressekode": "12345",
      "nummer": 12,
      "kommunenummer": "4203",
      "kommunenavn": "Arendal",
      "postnummer": "4836",
      "poststed": "Arendal",
      "representasjonspunkt": {
        "lat": 58.4612,
        "lon": 8.7724
      }
    }
  ]
}
```

Covered behavior:

- normalized address results
- public endpoint throttling
- safe errors when upstream fails
- address validation during citizen intake
- business-flow e2e with mocked Kartverket

## Manual Verification

Use the public endpoint locally after starting the API:

```bash
curl "http://localhost:3101/api/v1/public/tenants/arendal/integrations/kartverket/address-search?q=Storgata%2012"
```

Expected result:

- HTTP `200`
- response includes `query`
- response includes `results`
- each result includes normalized address fields

Example shape:

```json
{
  "query": "Storgata 12",
  "results": [
    {
      "sourceReferenceId": "4203-12345-12",
      "normalizedAddress": "Storgata 12, 4836, Arendal",
      "municipalityCode": "4203",
      "municipalityName": "Arendal",
      "postalCode": "4836",
      "latitude": 58.4612,
      "longitude": 8.7724
    }
  ]
}
```

## Environment Variables

Optional overrides:

```txt
KARTVERKET_ADDRESS_BASE_URL
KARTVERKET_ADDRESS_TIMEOUT_MS
```

Defaults:

```txt
KARTVERKET_ADDRESS_BASE_URL=https://ws.geonorge.no/adresser/v1
KARTVERKET_ADDRESS_TIMEOUT_MS=3000
```

## Current Limitations

- Address validation currently uses the first normalized search result.
- There is no scheduled revalidation of stored addresses.
- Public address search is rate-limited in memory through the API process.
- Municipality analytics depends on municipality code being present on the case address.
