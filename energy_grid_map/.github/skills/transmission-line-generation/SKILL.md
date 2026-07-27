---
name: transmission-line-generation
summary: Workflow for generating, transforming, and integrating state-level transmission line data into the map with proper citation.
description: |
  This skill provides a step-by-step workflow for adding new state transmission line data to the energy grid map project, from data acquisition to map integration and citation. It ensures consistency, deduplication, and proper source attribution for each new dataset.
---

# Transmission Line Generation & Integration Skill

## Workflow Steps

1. **Define State Bounding Box**
   - Identify the geographic bounding box for the target state (lat/lon min/max).

2. **Fetch OSM Transmission Data**
   - Use Overpass API to fetch all `power=line`, `power=minor_line`, and `power=cable` features within the bounding box.
   - Use multiple endpoints for redundancy.

3. **Deduplicate and Merge**
   - Merge all fetched elements.
   - Deduplicate by OSM `way id`.

4. **Assemble Metadata**
   - Record fetch details: endpoint, class, counts, timestamp, license, bounding box.
   - Structure output as `{ version, generator, source, elements }`.

5. **Output Data File**
   - Save as `public/grid/<state>-transmission.json`.

6. **Map Integration**
   - Add the new file to the `transmissionFileByState` mapping in the main map code.
   - Ensure the state is selectable and displays the new data.

7. **Source Citation**
   - Ensure the `source` object in the JSON includes Overpass/OSM attribution, license, and query details.
   - Confirm the map's sources popover displays this metadata for the new state.

## Quality Criteria
- Data is deduplicated and complete for the state.
- Output matches the California/standard format.
- Map displays new lines and sources popover shows correct citation.

## Example Prompts
- "Add transmission lines for [State] to the map."
- "Update citation for [State] transmission data."
- "Regenerate [State] transmission data from OSM."

## Related Customizations
- Substation/plant/consumer data integration skills
- OSM Overpass query templates
- Map layer configuration skills
