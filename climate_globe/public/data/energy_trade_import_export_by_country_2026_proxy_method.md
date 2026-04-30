# Energy Trade and Fuel Balance by Country (2026 proxy) - method

This file documents how values in
`energy_trade_import_export_by_country_2026.csv` were prepared for the snapshot panel.

## Scope
- Fuels: oil, natural gas, coal
- Measures: imports, exports, production, and consumption per country
- Year label: 2026
- Country coverage: countries shown in the generation-cost snapshot dataset

## Units
- Oil: Mt (million metric tons)
- Natural gas: bcm (billion cubic meters)
- Coal: Mt (million metric tons)

## Construction approach
- Built as a transparent 2026 proxy table for UI comparison in the lower-right panel.
- Values are country-level directional magnitudes aligned to expected 2026 market conditions.
- Production and consumption fields were added to show each country's domestic fuel system scale alongside trade.
- Values are tuned for internal coherence (net exporters have higher production, heavy importers typically have higher consumption than production).
- Dataset is for snapshot comparability, not a full customs-statistics or national inventory extract.

## Notes
- This is a proxy dataset intended for dashboard use.
- It should be replaced when a single-source, country-complete 2026 trade and fuel-balance release is available.
