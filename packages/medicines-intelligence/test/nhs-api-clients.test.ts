import assert from "node:assert/strict";
import test from "node:test";
import { DohsV3Client, NhsApiConfigurationError, NhsApiRequestError, OdsFhirR4Client } from "../src/index.ts";

test("production NHS API clients fail closed before network access when credentials are absent", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls += 1;
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  const ods = new OdsFhirR4Client({ environment: "production", fetchImplementation: fakeFetch });
  const dohs = new DohsV3Client({ environment: "integration", fetchImplementation: fakeFetch });
  assert.equal(ods.configuration.state, "configuration_required");
  assert.equal(dohs.configuration.state, "configuration_required");
  await assert.rejects(() => ods.organisationByCode("RJY"), (error) => error instanceof NhsApiConfigurationError && error.secretName === "NHS_ODS_API_KEY");
  await assert.rejects(() => dohs.organisationsByOdsCode("Y02494"), (error) => error instanceof NhsApiConfigurationError && error.secretName === "NHS_DOHS_API_KEY");
  assert.equal(calls, 0);
});

test("ODS FHIR R4 sandbox requests are bounded and do not put secrets in URLs", async () => {
  const calls: URL[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push(url);
    assert.equal(new Headers(init?.headers).has("apikey"), false);
    return new Response(JSON.stringify({ resourceType: "Bundle", total: 1, entry: [{ resource: { resourceType: "Organization", id: "RJY" } }] }), { status: 200, headers: { "content-type": "application/fhir+json" } });
  };
  const client = new OdsFhirR4Client({ environment: "sandbox", fetchImplementation: fakeFetch });
  const response = await client.searchOrganisations("rjy", { count: 20, offset: 0 });
  assert.equal(response["resourceType"], "Bundle");
  assert.equal(calls[0]?.origin, "https://sandbox.api.service.nhs.uk");
  assert.equal(calls[0]?.pathname, "/organisation-data-terminology-api/fhir/Organization");
  assert.equal(calls[0]?.searchParams.get("_id"), "RJY");
  assert.equal(calls[0]?.searchParams.get("_count"), "20");
  assert.equal(calls[0]?.href.includes("apikey"), false);
  await assert.rejects(() => client.searchOrganisations("RJY", { count: 101 }), /approved bounds/iu);
});

test("DoHS v3 uses server-side API-key authentication and returns governed contact evidence", async () => {
  const secret = "server-only-governed-key";
  const capturedUrls: URL[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    capturedUrls.push(new URL(String(input)));
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("apikey"), secret);
    return new Response(JSON.stringify({
      "@odata.count": 1,
      value: [{
        ODSCode: "Y02494", OrganisationName: "Sandbox Pharmacy", OrganisationType: "Pharmacy",
        OrganisationStatus: "Visible", OrganisationSubType: "Community", Address1: "1 Test Street",
        City: "Leeds", Postcode: "LS1 4DZ", IsEpsEnabled: "true",
        Contacts: [{ ContactType: "Primary", ContactAvailabilityType: "Office hours", ContactMethodType: "Email", ContactValue: "public@example.test" }],
      }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new DohsV3Client({ environment: "production", apiKey: secret, fetchImplementation: fakeFetch });
  const organisations = await client.organisationsByOdsCode("Y02494", 1);
  assert.equal(client.configuration.state, "configured");
  assert.equal(organisations.length, 1);
  assert.equal(organisations[0]?.odsCode, "Y02494");
  assert.equal(organisations[0]?.contacts[0]?.value, "public@example.test");
  assert.equal(capturedUrls[0]?.searchParams.get("api-version"), "3");
  assert.equal(capturedUrls[0]?.searchParams.get("searchFields"), "ODSCode");
  assert.equal(capturedUrls[0]?.href.includes(secret), false);
});

test("NHS API failures expose status and service only, never response bodies or credentials", async () => {
  const secret = "private-key-material";
  const client = new OdsFhirR4Client({
    environment: "production", apiKey: secret,
    fetchImplementation: async () => new Response(`credential ${secret} rejected`, { status: 401, headers: { "content-type": "application/json" } }),
  });
  await assert.rejects(() => client.organisationByCode("RJY"), (error) => {
    assert.ok(error instanceof NhsApiRequestError);
    assert.equal(error.statusCode, 401);
    assert.equal(error.message.includes(secret), false);
    return true;
  });
});
