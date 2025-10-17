---
timestamp: 'Thu Oct 16 2025 16:30:56 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_163056.c17c2d36.md]]'
content_id: a21c6b3c8ba1e477067b0936e54d4f524ae2656d0d9ebceb038c81fb80b08c57
---

# concept: RecipeScaler

* **concept**: RecipeScaler \[Recipe]
* **purpose**: To provide and manage scaled versions of existing recipes, intelligently adjusting ingredient quantities based on user-specified serving changes, utilizing both linear and AI-driven methods.
* **principle**: If a user selects an existing recipe (by its ID) and specifies a new number of servings, the system retrieves the recipe's full context, calculates the adjusted ingredient quantities (either linearly or using an AI model), and stores this new scaled version, making it retrievable for cooking.
* **state**:
  * A set of `ScaledRecipes` with
    * a `baseRecipeId` of type `Recipe` (referencing a recipe from the `Recipe` concept)
    * a `targetServings` of type `Number`
    * a `scaledIngredients` list of `IngredientData`
    * a `scalingMethod` of type `String` ('manual' or 'ai')
    * *(Optional: `generatedAt: Date`, `userId: Author`)*
* **actions**:
  * `scaleManually (baseRecipeId: Recipe, targetServings: Number): (scaledRecipeId: ScaledRecipe) | (error: String)`
    * **requires**: The `baseRecipeId` must exist in the `Recipe` concept. `targetServings` must be greater than 0. `targetServings` must not equal the `originalServings` of the `baseRecipeId`.
    * **effects**: Fetches the base recipe's ingredients and `originalServings`, calculates new ingredient quantities linearly, and either creates a new `ScaledRecipe` record or updates an existing one for that `baseRecipeId` and `targetServings` with `scalingMethod: 'manual'`, returning its ID.
  * `scaleRecipeAI (baseRecipeId: Recipe, targetServings: Number): (scaledRecipeId: ScaledRecipe) | (error: String)`
    * **requires**: The `baseRecipeId` must exist in the `Recipe` concept. `targetServings` must be greater than 0. `targetServings` must not equal the `originalServings` of the `baseRecipeId`.
    * **effects**: Fetches the entire recipe (name, ingredients, cooking methods, original servings) from the `Recipe` concept, uses an internal LLM (mocked here) to intelligently adjust ingredient quantities based on this context and the `targetServings`, and either creates a new `ScaledRecipe` record or updates an existing one for that `baseRecipeId` and `targetServings` with `scalingMethod: 'ai'`, returning its ID.
* **queries**:
  * `_getScaledRecipe (scaledRecipeId: ScaledRecipe): (scaledRecipe: ScaledRecipeDoc) | (error: String)`
    * **requires**: `scaledRecipeId` must exist in the `RecipeScaler` concept.
    * **effects**: Returns the `ScaledRecipeDoc` for the specified ID.
  * `_findScaledRecipe (baseRecipeId: Recipe, targetServings: Number): (scaledRecipe: ScaledRecipeDoc) | (error: String)`
    * **requires**: (Implicitly, for a meaningful result) a scaled recipe for the given `baseRecipeId` and `targetServings` exists.
    * **effects**: Returns the `ScaledRecipeDoc` that matches the base recipe ID and target servings.

***
