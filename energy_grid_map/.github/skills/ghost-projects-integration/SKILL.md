# Ghost Projects Integration Skill

**Purpose:**
Standardized workflow for adding/updating state-level electricity generation queue ("ghost projects") data to the energy grid map, ensuring public sourcing, map integration, and proper citation in the sources popover. Mirrors the process used for California ghost projects.

---

## Workflow Steps

1. **Data Acquisition**
   - Identify a public, sourceable dataset for proposed/builder/planned generation projects for the target state.
   - Preferred: U.S. EIA Form 860 (Proposed Units) or equivalent ISO/RTO queue data.
   - Download the latest data (e.g., EIA ZIP/XLSX or ISO queue file).
   - Document the source URL and version/date for citation.

2. **Data Processing & Formatting**
   - Use or adapt an existing build script (e.g., `build_louisiana_ghost_projects.py`) to:
     - Filter for the target state (e.g., `STATE_FILTER = 'ME'` for Maine).
     - Extract project location (lat/lon), capacity (MW), fuel type, status, and other relevant fields.
     - Normalize fields to match the map's ghost project schema (see California example).
     - Output to `public/grid/{state}-ghost-power.json`.
   - Validate output: ensure all required fields are present and geocoding is reasonable.

3. **Map Integration**
   - Add the new state file to the `ghostPowerFileByState` mapping in `public/main.js`:
     - Example: `Maine: '/grid/maine-ghost-power.json',`
   - Reload the map and verify ghost projects appear for the state.

4. **Citation & Sources Popover**
   - Ensure the output JSON includes a `source` block with:
     - `name`, `url`, `source_page`, `sheet`, `workbook`, `generated_from`, `builtAt`, `sourceVersion`, etc.
   - Confirm the sources popover displays the dataset, original source, and verification info for the state.

5. **Quality & Completion Checks**
   - Data is public and sourceable, with a working citation link.
   - Map loads without errors and ghost projects are visible for the state.
   - Sources popover shows correct metadata for the new state.

---

## Example Prompts
- "Add ghost projects for [State] to the map."
- "Update Maine's ghost project queue and cite the EIA."
- "Integrate ISO-NE queue data for New England states."

---

## Related Skills
- transmission-line-generation
- state-totals-integration
- agent-customization

---

## Notes
- Always use the most recent public data available.
- If the state is covered by an ISO/RTO queue, prefer that over EIA if more granular.
- For new states, clone and adapt an existing build script.
- Validate output and citation before considering the workflow complete.
