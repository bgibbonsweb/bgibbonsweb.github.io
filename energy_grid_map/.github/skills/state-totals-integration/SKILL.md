---
name: state-totals-integration
summary: Workflow for gathering, projecting, and integrating state-wide electricity totals into the map and sources popover.
description: |
  This skill provides a step-by-step workflow for adding or updating state-wide electricity generation and consumption totals (including projections) in the energy grid map project. It covers data acquisition, projection, JSON update, UI validation, and citation in the sources popover.
---

# State Totals Data Integration Skill

## Workflow Steps

1. **Gather Latest Data**
   - Retrieve the most recent actuals for the target state (EIA, SEIA, or other authoritative source).
   - Download or extract net generation, retail sales, direct use, and breakdown by source.

2. **Project Future Years (if needed)**
   - If projections (e.g., 2025/2026) are not available, use a linear trend fit on recent years (e.g., 2019–2024) to estimate.
   - Document the projection method in the metadata.

3. **Format for Integration**
   - Match the JSON structure in `public/grid/state-global-totals.json`:
     - meta, baseYear, projectionYears, projectionMethod, totalConsumptionGWh, totalBatteryStorageGWh, generationByTypeGWh, projectionByYearGWh
   - Include a clear citation and source URL in the meta field.

4. **Update the Data File**
   - Add or update the state entry in `state-global-totals.json`.
   - Validate JSON syntax and structure.

5. **UI Validation**
   - Confirm the new totals appear in the state totals UI (left popover) when the state is selected.
   - Check that projections and breakdowns are displayed correctly.

6. **Sources Popover Citation**
   - Ensure the meta/source/citation is shown in the sources popover for the state.
   - Confirm the license and projection method are visible if present.

## Quality Criteria
- Data is up-to-date, accurate, and properly cited.
- Projections are reasonable and method is documented.
- UI and sources popover reflect the new data without errors.

## Example Prompts
- "Update state totals for [State] with latest EIA data."
- "Add 2025/2026 projections for [State] electricity."
- "Cite the source for [State] state-wide totals."

## Related Customizations
- Transmission line generation skill
- OSM/energy data integration skills
- State-level energy reporting templates
