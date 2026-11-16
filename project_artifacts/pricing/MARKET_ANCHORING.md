# Demo pricing — market anchoring note

- **Checked:** 2026-11-14, with web search and page fetches (free, read-only).
- **Purpose:** to make NAKHLA's **illustrative** prices plausible.
- **Not:** an appraisal, a valuation or an offer. NAKHLA is a fictional concept that is not for sale.
- **None of these listings is related to NAKHLA.**

## 1. Sources found

| # | Source | Location | Size | Price (asking) | IQD / m² (computed) | Date | Quality |
|---|---|---|---|---|---|---|---|
| S1 | Numbeo, "Property Prices in Basra" (numbeo.com/property-investment/in/Basra) | Basra, city centre | per m² | **2,090,650 IQD/m²** (range 1.36–3.00 M) | 2.09 M | updated 2 Oct 2026 | weak to moderate: 30 entries from 6 contributors over 18 months, crowd-sourced |
| S2 | Numbeo (same page) | Basra, outside centre | per m² | **1,064,250 IQD/m²** (range 0.75–1.50 M) | 1.06 M | same | same |
| S3 | OpenSooq listing (via search summary) | Al-Jawhara residential city, 5th floor | 112 m² | 163,000,000 IQD | 1.46 M | late 2026 | weak: asking price; read through a search engine (OpenSooq refused a direct fetch, HTTP 403) |
| S4 | OpenSooq listing (via search summary) | Al-Jawhara, 5th floor | 139 m² | 186,000,000 IQD | 1.34 M | late 2026 | weak (same) |
| S5 | OpenSooq listing (via search summary) | Al-Amal complex, furnished | 110 m² | 175,000,000 IQD | 1.59 M | late 2026 | weak (same) |
| S6 | OpenSooq listing (via search summary) | Sa'fat Al-Basra, unfurnished | 120 m² | 185,000,000 IQD | 1.54 M | late 2026 | weak (same) |
| S7 | OpenSooq listing (via search summary) | Al-Amal complex, furnished 2-bed | 120 m² | 138,000,000 IQD | 1.15 M | Oct 2026 | weak (same) |
| S8 | OpenSooq listing (via search summary) | Al-Muwafaqiya, 3.5 rooms | 190 m² | 245,000,000 IQD | 1.29 M | late 2026 | weak (same) |
| S9 | OpenSooq listing (via search summary) | Sahat Saad, ground floor, freehold | 147 m² | 130,000,000 IQD | 0.88 M | late 2026 | weak (same) |
| S10 | Wise cost-of-living page | Basra | per m² | $1,583 (centre), $793 (outside) | — | "2026" | weak: no method given; not used |

**Reading.**
- New-build complex flats (S3–S8) ask about **1.15–1.6 M IQD/m²**; the median is about **1.4 M**.
- Numbeo's city-centre figure is about **2.1 M**.
- The weakest numbers were left out: S9 (an older ground-floor flat) and one OpenSooq entry of 18 M IQD for 200 m², which is clearly a typo.

## 2. Assumption used for NAKHLA (hypothetical)

| Assumption | Value | Why |
|---|---|---|
| Base rate, Type A, standard finish | **1,850,000 IQD per m²** of saleable area | A new 12-storey tower with a wellness club, pool, restaurant, concierge lobby and generous balconies would plausibly ask above the complex median (≈1.4 M) and close to Numbeo's city-centre figure (≈2.1 M). Chosen as a round figure in between, nearer the top |
| Saleable area | model net internal area + 50 % of the balcony | A common simple convention; stated, not legal. Areas come from the model (`unitNetArea`, `unitBalconyArea`) |
| Size factor | Type B rate × 0.97 | Larger flats usually ask a slightly lower rate per m² |
| Floor premium | +1.0 % per floor above F01 (F09 = +8 %) | Height, views, less street noise |
| Aspect | Type A (south, main-street frontage, hero balcony) × 1.00; Type B (north, quieter rear) × 0.99 | Small, explained adjustment |
| Finishing packages (optional extras, shown separately) | Standard included; Premium +130,000 IQD/m²; Luxury +290,000 IQD/m² | Packages exist in the app's finish configurator; the amounts are invented |
| Rounding | nearest 1,000,000 IQD | Avoids false precision |
| Currency | IQD by default. Optional USD equivalent at a **hypothetical 1,500 IQD = 1 USD** | Reports conflict. The official rate was 1,300–1,320 through mid-2026, and a reported change to ≈1,510–1,520 in October 2026 could not be confirmed on cbi.iq. The conversion is therefore labelled a hypothetical assumption, not a quote |

**Not included or implied:** taxes, fees, service charges, payment plans, loans, availability or legal title. None of these exist for a fictional project.

**If the comparables are judged too weak:** change `base.ratePerSqm` in `src/data/pricing-demo.json`. Every price, chart, comparison and AI answer recalculates from that one file.
