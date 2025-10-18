#### `RecipeScaler` Concept (from "scale to input factor" to "manage scaled instances")

**Original Idea (Part of initial `Scaler` class):**
*   **Purpose:** Implicitly about generating scaled ingredients.
*   **State:** The `Scaler` class managed an internal `Map<string, Recipe>`. This conflated the original recipe with its scaled state.
*   **Actions:** `scaleManually`, `scaleRecipe` (AI).

**Current `RecipeScaler` Concept:**
*   **Purpose Defined:** "To provide and manage scaled versions of existing recipes, intelligently adjusting ingredient quantities..." Focus on *providing* and *managing instances* of scaled recipes.
*   **State Introduced:** A new dedicated state, `ScaledRecipes`, which stores records of:
    *   `scaledRecipeId` (a reference ID for this scaled recipe)
    *   `baseRecipeId` (a reference to the `Recipe` concept).
    *   `targetServings` (the desired new serving size).
    *   `scaledIngredients` (the calculated/AI-adjusted ingredient list).
    *   `scalingMethod` (`'manual'` or `'ai'`).
*   **Actions Centralized:** `scaleManually` and `scaleRecipeAI` are the core actions.
*   **Key Design Changes:**
    *   **Separation of Concerns:** Explicitly separated scaling logic and state from the base `Recipe` definition. The `RecipeScaler` now manages *derived* versions, not the original.
    *   **Completeness of Functionality:** The `scaleRecipeAI` action now fully encapsulates the LLM interaction (prompt creation, API call via `ILLMClient`, response parsing), ensuring the concept is self-contained in its scaling logic.
    *   **Dependency Injection for LLM:** Instead of directly instantiating `GeminiLLM` or passing it directly to an action, the `RecipeScalerConcept` now accepts an `ILLMClient` interface in its constructor. This significantly improves testability and flexibility.
    *   **Queries:** Dedicated queries like `_getScaledRecipe` and `_findScaledRecipe` were added to retrieve the results of scaling.