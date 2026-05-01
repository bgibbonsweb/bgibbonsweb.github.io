---
name: set-default-state
description: Workflow for setting or changing the default state shown on map load in the energy grid map project. Ensures the map opens to the desired state for all users.
---

# Set Default State Workflow

This skill documents the process for changing the default state that is displayed when the map loads. Use this when you want the application to open to a specific state (e.g., Maine) by default.

## Step-by-Step Process

1. **Locate the Default State Variable**
   - Open `public/main.js`.
   - Find the line: `let selectedStateName = '...';` (usually near the top of the main variable declarations).

2. **Change the Default State**
   - Replace the value (e.g., `'Louisiana'`) with the desired state name (e.g., `'Maine'`).
   - Ensure the state name matches exactly as it appears in the state data (case-sensitive).

3. **Validate State Availability**
   - Confirm the state exists in the loaded state list (`stateMap`), which is populated from `us-states.json`.
   - If the state is not present, add it to the data files as needed.

4. **Test the Change**
   - Reload the application in the browser.
   - Verify the map opens to the new default state.
   - Check that the state selector and outline update accordingly.

5. **Quality Criteria**
   - The map loads with the desired state selected.
   - No errors in the browser console.
   - The state selector dropdown matches the default state.

## Completion Checklist
- [ ] `selectedStateName` is set to the correct state
- [ ] State exists in `us-states.json` and is loaded into `stateMap`
- [ ] Map and selector show the correct default state on load
- [ ] No errors or warnings in the browser

## Example Prompts
- "Set the default state to Maine."
- "Change the map to open with California selected by default."
- "How do I make Texas the default state on load?"

## Related Customizations
- Skill for adding a new state to the map
- Skill for updating state data files
- Skill for customizing the state selector UI

---
This skill ensures a consistent, error-free process for changing the default state in the energy grid map project. Use it whenever onboarding a new region or updating project focus.
