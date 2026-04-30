# Global Sea Level Annual (1993-2026) - method

This file documents how `ocean_sea_level_global_annual_2026_proxy.csv` was built.

## Primary source
- NOAA Laboratory for Satellite Altimetry (LSA) global sea-level time series:
  - https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/LSA_SLR_timeseries.php
  - Raw feed used: `https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_keep_ref_90.csv`

## Construction
1. Read all non-comment rows from the NOAA raw feed.
2. For each row, take the available satellite anomaly value (mm).
3. Convert decimal time to calendar year via floor (e.g., `2024.83` -> `2024`).
4. Compute annual mean anomaly (mm) for each year from 1993 onward.
5. Add a 2026 estimate (because observed feed currently ends in 2025):
   - `sea_level_2026 = last_observed_mm + 3.11 * (2026 - last_observed_decimal_year)`
   - 3.11 mm/year is the trend published in the NOAA feed header.

## Columns
- `year`: calendar year
- `sea_level_anomaly_mm`: annual mean anomaly in millimeters
- `source_type`:
  - `observed`
  - `estimated_from_trend_3p11_mm_per_year`

## Notes
- This is a visualization-oriented annual summary for the globe dashboard.
- Replace the 2026 estimated row with observed NOAA data when 2026 observations are available in the source feed.
