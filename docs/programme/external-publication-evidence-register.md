# External Publication Evidence Register

Status: verified repository evidence
Reviewed: 7 August 2026
Scope: metadata and links only; publisher article bodies are not copied

| Publication | Publisher | Date | Canonical evidence | Translation evidence | Repository decision |
|---|---|---:|---|---|---|
| Why Onshoring Alone Won’t Secure Pharma Supply Chains | Pharmaceutical Commerce | 31 July 2026 | [Publisher page](https://www.pharmaceuticalcommerce.com/view/why-onshoring-alone-wont-secure-pharma-supply-chains) | None verified or represented | Publish exact supplied title, byline metadata and an original concise portfolio abstract |
| UK–EU Pharmaceutical Market Access and Compliance in the Post-Brexit Era — 4. Compliance-Driven Approaches to Cross-Border Market Entry | Yakuji Nippo | 23 July 2026 | [English publisher page](https://www.yakuji.co.jp/entry136963.html) | [Japanese publisher page](https://www.yakuji.co.jp/entry136964.html), directly verified | Publish both publisher links; retain NovaPharm's canonical `Chief Executive Officer` title independently of the external byline |
| Parallel Import Frameworks and Risk Considerations | Yakuji Nippo | 12 May 2026 | [English publisher page](https://www.yakuji.co.jp/entry133526.html) | [Japanese publisher page](https://www.yakuji.co.jp/entry133527.html) | Retain as verified external publication |
| Regulatory and Compliance Considerations Post-Brexit | Yakuji Nippo | 12 March 2026 | [English publisher page](https://www.yakuji.co.jp/entry131265.html) | [Japanese publisher page](https://www.yakuji.co.jp/entry131266.html) | Retain as verified external publication |
| UK and EU Pharmaceutical Market Access Pathways After Brexit | Yakuji Nippo | 6 February 2026 | [English publisher page](https://www.yakuji.co.jp/entry129529.html) | [Japanese publisher page](https://www.yakuji.co.jp/entry129530.html) | Retain as verified external publication |

External availability was checked directly against all nine publisher URLs on 7 August 2026. Every URL returned HTTP 200 from an approved publisher host and contained its expected identifying author or title evidence. Automated repository tests enforce exact metadata, HTTPS, uniqueness, chronology, approved translations, feed inclusion, schema linkage and knowledge-corpus inclusion. The bounded release check `npm run founder:test:publication-links` additionally verifies HTTP success, approved publisher origins after redirects and identifying publisher text. It is deliberately separate from deterministic CI because continued publisher availability remains external; run it at release and scheduled content review.
