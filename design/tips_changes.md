#### `ScalingTips` Concept (from "tipsPage" to "context-specific generated tips")

**Original Idea (`TipsPage` Concept):**
*   **Purpose:** "stores an increasing number of tips for certain aspects of cooking."
*   **State:** "a set of Cooking Methods", "a scaling up tip (optional)", "a scaling down tip (optional)" (implying one tip per category).
*   **Actions:** `addTip` (general), `requestTip` (general query).
*   **LLM Role:** Unclear how LLM would integrate or if it would generate tips at all.

**Current `ScalingTips` Concept:**
*   **Purpose Refined & Expanded:** "To store, manage, and **generate context-specific practical tips** related to scaling recipes..." This explicitly includes LLM generation and contextual relevance.
*   **State Refined:** `Tips` now allows for:
    *   Multiple `TipDoc` records for each `cookingMethod` and `direction`.
    *   Rich metadata per tip: `source` (`'manual'` or `'generated'`), `relatedRecipeId` (for generated tips), `generatedContextHash` (to prevent duplicate AI generation), `addedBy`, `dateAdded`.
*   **Actions Refined:**
    *   `addManualScalingTip`: For user-contributed tips.
    *   `requestTipGeneration`: This is a powerful new action that:
        *   Takes a `RecipeGenerationContext` (the full recipe details from `Recipe`).
        *   Internally calls the `llmClient` to generate tips based on this context.
        *   Stores these generated tips in its own state.
    *   `removeScalingTip`: For managing tips.
*   **Key Design Changes:**
    *   **Scope Refinement:** Sharpened the focus from general "tips" to "scaling tips."
    *   **Active LLM Integration:** The concept is no longer passive; it actively *generates* tips based on input context, fully encapsulating that complex behavior.
    *   **Completeness:** It owns the LLM prompting and parsing logic for tip generation.
    *   **Contextual Tips:** The `relatedRecipeId` and `generatedContextHash` fields ensure that AI-generated tips are specific and avoid redundant regeneration.
    *   **Composition via Syncs:** Designed to be triggered by other concepts (like `RecipeScaler`) via `syncs`, demonstrating robust inter-concept communication.