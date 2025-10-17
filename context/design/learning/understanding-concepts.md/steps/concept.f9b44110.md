---
timestamp: 'Thu Oct 16 2025 23:47:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_234725.cefbd4c7.md]]'
content_id: f9b44110b4d5d7311c85fa88e6003a53fd862d40b26a71757db3e31b337741ad
---

# concept: ScalingTips

* **concept**: ScalingTips \[Recipe, Author]
* **purpose**: To store, manage, and generate context-specific practical tips related to scaling recipes up or down, providing intelligent and user-contributed advice for better culinary outcomes.
* **principle**: If a user scales a specific recipe up or down, the system, using the full recipe context and an AI model, generates relevant scaling tips for that recipe's cooking methods, making them immediately available alongside manually contributed tips.
* **state**:
  * A set of `Tips` with
    * a `tipId` of type `ID`
    * a `text` of type `String`
    * a `cookingMethod` of type `String` (e.g., "baking", "frying")
    * a `direction` of type `String` ('up' or 'down')
    * a `source` of type `String` ('manual' or 'generated')
    * a `relatedRecipeId` of type `Recipe` (optional, for generated tips)
    * a `generatedContextHash` of type `String` (optional, a hash of the input context used to generate the tip, to avoid regenerating identical tips for the same context)
    * an `addedBy` of type `Author` (optional, for manual tips)
    * a `dateAdded` of type `Date`
* **actions**:
  * `addManualScalingTip (cookingMethod: String, direction: String, tipText: String, addedBy?: Author): (tipId: ID) | (error: String)`
    * **requires**: `direction` is 'up' or 'down'. `cookingMethod` is not empty. `tipText` is not empty.
    * **effects**: Adds a new `Tip` record with `source: 'manual'` and the provided details. Returns the `tipId`.
  * `requestTipGeneration (recipeContext: RecipeGenerationContext): (tipIds: ID[]) | (error: String)`
    * **requires**: `recipeContext` is a valid object containing recipe details. `recipeContext.targetServings` must not equal `recipeContext.originalServings`. `recipeContext.originalServings` and `targetServings` must be greater than 0.
    * **effects**: Determines scaling `direction` from `recipeContext`. Calls an internal LLM using `recipeContext` to generate tips. Stores new tips with `source: 'generated'`, `relatedRecipeId`, and a `generatedContextHash`. Returns the IDs of the newly generated tips.
  * `removeScalingTip (tipId: ID): Empty | (error: String)`
    * **requires**: The `tipId` must exist.
    * **effects**: Deletes the specified `Tip` record.
* **queries**:
  * `_getScalingTips (cookingMethod: String, direction: String, relatedRecipeId?: Recipe): (tips: TipDoc[])`
    * **effects**: Returns a list of `TipDoc` matching the criteria.
  * `_getRandomScalingTip (cookingMethod: String, direction: String, relatedRecipeId?: Recipe): (tip: TipDoc | null)`
    * **effects**: Returns a single random `TipDoc` matching the criteria, or null if none found.

***
