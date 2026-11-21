# Apple HIG owner-attachment raw-file recheck — 21 November 2026

**Scope:** Source/asset integrity only, performed on the owner's original Library uploads. **No Apple installer was mounted or executed; no assets were redistributed, incorporated into NovaPharm code, or approved for web/Android licensing.** No HIG guideline or production route is certified by an archive hash.

## Directly inspected original owner files

**24 of the canonical 32 attachments** were re-accessed as original raw bytes or directly parsed during this checkpoint: four ZIPs, the official-index CSV, the section-wise guide, the 10-tab XLSX workbook and 17 smaller Apple UDIF disk-image containers.

| Original file | SHA-256 | Observed evidence |
| --- | --- | --- |
| `Apple_HIG_Complete_Sectionwise_Index_2026-11-18.csv` | `77d4d437a42835b83c30ea4378cf65d70d9e8c814750246c1440b36f79abbbca` | 172 rows, 172 distinct canonical Apple HIG URLs |
| `Apple_HIG_Complete_Sectionwise_Index_2026-11-18.xlsx` | `ff77bde57dbeb93628672236b1ba491de450512eb583be56a817d31d086b6887` | 10 tabs, 172 primary records, 30 article anchors, 5 supporting resource links |
| `Apple_HIG_Sectionwise_Guide_2026-11-18.md` | `40b53b346d424785e685d025796a3804914cd7401c347bb12a3e2317ae5d2583` | 270-line source guide, reference descriptions not independently certified product behavior |
| `IMDF.zip` | `d40e5fa749a0d0ae013a77984e90531d8a4f44b429638e86b843847cae20cf64` | 10 ZIP entries, CRC passed, no unsafe entry paths |
| `ComposingCustomLayoutsWithSwiftUI(1).zip` | `0fe4ce8ac081e1d7e9248022e2ffc59f94ccafe5ff8846a0964e419d8aa1fd35` | 104 entries, CRC passed, no unsafe paths |
| `AnimatingViewsAndTransitions.zip` | `4335b52757b8ce3933c769cf14494873a4530914063cb1092c46b4d39a5c061f` | 181 entries, CRC passed, no unsafe paths |
| `apple-ios-27-ui-kit_assets_2026-10-27_v32(1).zip` | `df3518b0ee2cdf7e4facf984e88b5df5ec8e5a97b8787d73eb55c589a7019c28` | 151 entries, CRC passed, no unsafe paths; not licensed for arbitrary web reuse |

**Seventeen smaller DMGs:** all 17 original raw bytes freshly hashed and all 17 end with the expected `koly` marker at the start of the 512-byte UDIF footer. They represent **nine distinct hashes**; the exact byte-identical pairs are `Icons-Siri-AI(1)/(2)`, `iOS-27-Icon-Templates-Photoshop-Illustrator(1)/(2)`, `Logo-Sign-in-with-Apple.dmg` / `Logo-Sign-in-with-Apple(1).dmg`, `NY(1)/(2)`, `SF-Arabic(1)/(2)`, `SF-Hebrew(1)/(2)`, `SF-Armenian(1)/(2)`, `SF-Georgian(1)/(2)`; `SF-Mono(1).dmg` is the ninth unique container. A valid UDIF footer proves **neither** installer authenticity nor installed application behavior or asset permissions.

**Not newly byte-inspected in this checkpoint (8/32):** `SF-Symbols-27(1).dmg`, `SF-Pro(1).dmg`, `SF-Compact(1).dmg`, `Core_AI_Debugger(1).dmg`, `Bezel-MacBook-Air-M5.dmg`, `Icon_Composer_27.3_beta(1).dmg`, `Download-on-the-App-Store(1).zip`, `Download-on-the-Mac-App-Store(1).zip`. Previous file metadata inventory is not a fresh executable, archive, or licensing audit.

## Apple link health and release boundary

The independent read-only GitHub Actions run [44830167681](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44830167681) finished **successfully** for the complete **210 reference target** set (172 official article Markdown URLs, 30 owner workbook section anchors, 5 Apple resources, 3 MapKit/IMDF references). The checker preserves the owner's obsolete Siri section anchor and recognizes its separately documented current heading. This is URL/status and heading **reachability**, not full current article interpretation or implementation evidence.

The protected Portal keyboard-search remediation is separately proposed in [PR #993](https://github.com/NovapharmHealthacre/novapharm-website/pull/993) and must pass latest exact-head browser and security checks and later authenticated deployment review.

**Production HIG acceptance remains 0/172** until the canonical source ledger is individually updated with platform-appropriate real-world release receipts and genuinely independent approval. Source archive checks, link checks, candidate PRs, browser tests against synthetic tenants and upstream GitHub green checks cannot alone change that number.


## Continuation — additional independently read original Apple disk-image bytes

A subsequent direct Library-byte inspection on 21 November 2026 successfully rechecked two of the eight previously outstanding files. Both entire files were streamed through SHA-256; the final 512-byte trailer begins with the UDIF \`koly\` signature, and the recorded UDIF footer version is 4.

| Additional original file | Size (bytes) | Complete-file SHA-256 | Container check |
| --- | ---: | --- | --- |
| \`Icon_Composer_27.3_beta(1).dmg\` | 20,005,376 | \`11ba21a40d028ea1c49cf81bb410c8acba361272fbd9e1816a8aaad628572939\` | UDIF v4, \`koly\` footer present |
| \`Bezel-MacBook-Air-M5.dmg\` | 46,121,412 | \`b6d7949b35b8bd407e23676a272c096731200418f291d11593d09f3b4ada9222\` | UDIF v4, \`koly\` footer present |

**Revised raw-byte recheck coverage: 26/32 original owner attachments** (24 in the earlier checkpoint above, plus these two). The other six were located and materialized, but a processing-runtime failure occurred before their independent complete-file hashes, UDIF footer or ZIP archive-structure/CRC tests could be finished. They therefore **remain explicitly unverified**: \`SF-Symbols-27(1).dmg\`, \`SF-Pro(1).dmg\`, \`SF-Compact(1).dmg\`, \`Core_AI_Debugger(1).dmg\`, \`Download-on-the-App-Store(1).zip\`, \`Download-on-the-Mac-App-Store(1).zip\`.

**Limitations:** A valid disk-image footer and whole-file SHA-256 establish limited container/file integrity, not Apple signature trust, licensing rights, installer execution, font deployment, native app behavior, webpage conformance, or independent approval. No proprietary contents, fonts or installer binaries were copied into this public source repository. HIG independently production-accepted topics remain **0/172**.
