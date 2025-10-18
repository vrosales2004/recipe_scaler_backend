#### `Recipe` Concept (from "stores recipe and scale" to "canonical definition")

**Original Idea (Initial `Ingredient` & `Scaler` Class):**
*   **Purpose:** "Meant to store recipe and scale to the input factor."
*   **State:** `Recipes` (with name, `scaleFactor`, `ingredients`, `cookingMethods`)
*   **Actions:** `addRecipe`, `removeRecipe`, `scaleManually`, `scaleRecipe` (AI version).
*   **Implied Structure:** A single recipe object might contain a `scaleFactor` or the `Scaler` would take an *existing* recipe from its internal map and scale it.

**New `Recipe` Concept:**
*   **Purpose Refined:** Focuses **solely** on "To manage the definition and storage of cooking recipes." The scaling concern has been completely removed.
*   **State Refined:**
    *   `Recipes` now contains `author`, `name`, `originalServings` (the canonical serving size), `ingredients` (list of `IngredientData`), and `cookingMethods`.
    *   `IngredientData` is explicitly defined as a **data structure** (an entity type *within* the state of `Recipe`), not a separate concept. This aligns with the rule that concepts provide user-facing functionality, which a raw ingredient typically doesn't in isolation.
    *   The `scaleFactor` is no longer part of the `Recipe`'s state, as scaling is a separate concern.
*   **Actions Refined:** Only core management actions remain: `addRecipe`, `removeRecipe`. Actions related to scaling have been moved.
*   **Key Design Changes:**
    *   **Separation of Concerns:** This is the most significant change. The `Recipe` concept is now purely about defining and managing the *master record* of a recipe, separate from how it might be used (e.g., scaled).
    *   **Ownership:** The `author` field was added, making recipes distinct and ownable, which supports user-specific collections and allows for later integration with `UserAuthentication` via generic `ID` types and synchronizations.