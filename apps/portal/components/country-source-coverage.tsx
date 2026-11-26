"use client";

import { useMemo, useState } from "react";
import directory from "../../../docs/intelligence/country-101-client-catalog-20261118.json";
import ownerNationalBrief from "../../../docs/intelligence/owner-national-pharma-source-brief-20261120.json";
import styles from "./country-source-coverage.module.css";

type Filter = "all" | "candidate" | "research";
const nationalRows = directory.countries;
const summary = directory.summary;
const ownerBriefByCountry = new Map(ownerNationalBrief.countries.map((brief) => [brief.country, brief] as const));

export function CountrySourceCoverage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleLimit, setVisibleLimit] = useState(32);

  const matches = useMemo(() => {
    const term = query.trim().normalize("NFKC").toLocaleLowerCase();
    return nationalRows.filter((country) => {
      if (filter === "candidate" && country.candidateSourceCount === 0) return false;
      if (filter === "research" && country.candidateSourceCount !== 0) return false;
      return !term || [
        country.country, country.iso2, country.region,
        country.publisherResearchLead?.publisherName ?? "",
        country.publisherResearchLead?.leadType ?? "",
        ownerBriefByCountry.get(country.country)?.pharmaceuticalDataRequired ?? "",
        ownerBriefByCountry.get(country.country)?.sourceAccessAsSupplied ?? "",
        ...country.candidateSources.map((source) => [source.provider, source.domains, source.candidateKey].join(" "))
      ].join(" ").normalize("NFKC").toLocaleLowerCase().includes(term);
    });
  }, [filter, query]);
  const visible = matches.slice(0, visibleLimit);

  return (
    <section className={styles.root} aria-labelledby="country-source-coverage-heading">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Global source evidence</p>
        <h2 id="country-source-coverage-heading">101-country research coverage</h2>
        <p>Country research is not a pharmaceutical data integration. This view contains official-publisher references and candidate metadata only; no medicine records, licensed feeds or customer-live country access.</p>
      </header>
      <dl className={styles.metrics}>
        <div><dt>National scope</dt><dd>{summary.distinctNationalCountries}</dd></div>
        <div><dt>Countries with source candidates</dt><dd>{summary.registeredNationalCountries}</dd></div>
        <div><dt>Source discovery still required</dt><dd>{summary.addedResearchOnlyNationalCountries}</dd></div>
        <div><dt>Customer-live countries</dt><dd>{summary.customerLiveNationalCountries}</dd></div>
      </dl>
      <div className={styles.notice} role="note">
        <strong>Source release not approved</strong>
        <p>All 101 discovery sources across national, EU/EEA and global groups still require independent rights review and accepted ingestion. The 24 additional national research scopes have zero registered medicine datasets. Regulatory listings must not be presented as current stock, sales or prescribing.</p>
      </div>
      <div className={styles.controls}>
        <label>
          Search country, regulator or candidate dataset
          <input type="search" autoComplete="off" maxLength={120} value={query}
            onChange={(event) => { setQuery(event.currentTarget.value); setVisibleLimit(32); }}
            placeholder="Country, ISO code or publisher" />
        </label>
        <label>
          Source state
          <select value={filter} onChange={(event) => { setFilter(event.currentTarget.value as Filter); setVisibleLimit(32); }}>
            <option value="all">All countries</option>
            <option value="candidate">Has candidate source</option>
            <option value="research">National source not identified</option>
          </select>
        </label>
      </div>
      <p className={styles.resultCount} aria-live="polite">
        Showing {visible.length} of {matches.length} matching countries. No customer-live feeds.
      </p>
      <div className={styles.grid}>
        {visible.map((country) => (
          <article className={styles.country} key={country.iso2}>
            <div className={styles.countryHeading}>
              <div><h3>{country.country}</h3><p>{country.region} · {country.iso2}</p></div>
              <span className={styles.status}>{country.candidateSourceCount ? "Candidate only" : "Discovery needed"}</span>
            </div>
            <p>{country.candidateSourceCount
              ? `${country.candidateSourceCount} unlicensed source candidate${country.candidateSourceCount === 1 ? "" : "s"}; no validated production data.`
              : "No national pharmaceutical dataset registered. Source discovery is required."}</p>
            {ownerBriefByCountry.has(country.country) && (
              <details className={styles.details}>
                <summary>Owner-supplied pharmaceutical research brief · not verified</summary>
                <p>{ownerBriefByCountry.get(country.country)?.pharmaceuticalDataRequired}</p>
                <p>{ownerBriefByCountry.get(country.country)?.sourceAccessAsSupplied}</p>
                <ul>{ownerBriefByCountry.get(country.country)?.references.map((reference) => (
                  <li key={reference.url}>
                    <a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.label}</a>
                    <span>Owner reference · access unverified · API not connected</span>
                  </li>
                ))}</ul>
              </details>
            )}
            {country.candidateSources.length ? (
              <details className={styles.details}>
                <summary>Inspect candidate publishers</summary>
                <ul>{country.candidateSources.map((source) => (
                  <li key={source.candidateKey}>
                    <a href={source.referenceUrl} target="_blank" rel="noopener noreferrer">{source.provider}</a>
                    <span>{source.mode} · Rights not reviewed · Not connected</span>
                    <small>{source.domains}</small>
                  </li>
                ))}</ul>
              </details>
            ) : country.publisherResearchLead ? (
              <div className={styles.details}>
                <p className={styles.next}>Official publisher research lead — not integrated</p>
                <a href={country.publisherResearchLead.referenceUrl} target="_blank" rel="noopener noreferrer">{country.publisherResearchLead.publisherName}</a>
                <p className={styles.next}>{country.publisherResearchLead.caveat}</p>
                <p className={styles.next}>Reference only · Rights not reviewed · No verified medicine API or live feed</p>
              </div>
            ) : <p className={styles.next}>Next: verify official regulator, approved dataset and access terms.</p>}
          </article>
        ))}
      </div>
      {!matches.length && <p className={styles.empty}>No countries match this search. No result is inferred or fabricated.</p>}
      {visible.length < matches.length &&
        <button className={styles.more} type="button" onClick={() => setVisibleLimit((n) => n + 32)}>Show more countries</button>}
      <p className={styles.footer}>Registry dated {directory.asOf}; owner-supplied national source brief dated {ownerNationalBrief.asOf}. References, source claims and API availability are unverified. No clinical, commercial or medicine-data rights have been granted.</p>
    </section>
  );
}
