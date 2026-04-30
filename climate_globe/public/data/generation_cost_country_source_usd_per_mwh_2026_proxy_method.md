# Generation cost by source (2026 proxy) – method

This file documents how `generation_cost_country_source_usd_per_mwh_2026_proxy.csv` was created.

## Baseline
- Baseline country/source values come from:
  - `oecd_nea_lcoe_2020_country_source_usd_per_mwh.csv`
- Those values are OECD-NEA/IEA LCOE tool-derived country/source proxies prepared earlier in this project.
- Baseline rows are relabeled to `Year = 2026` for the snapshot panel's latest-year view.

## 2026 proxy update
To provide a fresher 2026 view, fossil fuel-linked columns were updated using World Bank Commodity Markets Outlook (October 2025) 2025f→2026f forecast ratios from the "PRICES" table:

- Coal (`Coal, Australia`): `100.0 / 107.0` → multiplier `0.934579`
- Oil (`Crude oil, Brent`): `60.0 / 68.0` → multiplier `0.882353`
- Gas (average of three gas benchmarks):
  - Europe: `10.8 / 12.1`
  - U.S.: `3.9 / 3.5`
  - LNG Japan: `11.5 / 12.5`
  - Average multiplier: `0.975616`

Applied columns:
- `Coal` × `0.934579`
- `Gas` × `0.975616`
- `Oil` × `0.882353`

Unchanged columns:
- `Hydro`
- `Solar`
- `Wind`
- `Nuclear` (kept at baseline value)
- `Other renewables`

All rows are set to `Year = 2026` to indicate proxy year labeling for the snapshot tab.

## Source links
- OECD-NEA Projected Costs (2025 edition page): https://www.oecd-nea.org/jcms/pl_108100/projected-costs-of-generating-electricity-2025-edition
- World Bank Commodity Markets Outlook (Oct 2025) data and charts: https://bit.ly/CMO-October-2025-Data
- World Bank press summary with 2026 energy outlook context: https://www.worldbank.org/en/news/press-release/2025/10/28/commodity-markets-outlook-october-2025-press-release

## Notes
This is a transparent proxy, not an official single-source 2026 observed country dataset.
