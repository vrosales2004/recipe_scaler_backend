---
timestamp: 'Thu Oct 16 2025 13:15:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_131521.c2409be3.md]]'
content_id: 147a3a61ed9a25a767d92a9e3c52fef3e423bebaf08b2fc8110cc674480998d2
---

# concept: Recipe

* **concept**: Recipe \[Author]
* **purpose**: To manage the canonical definition and storage of cooking recipes, enabling users to maintain their collection of culinary instructions.
* **principle**: If a user adds a recipe with its ingredients and cooking steps, then they can later retrieve or modify that recipe as a complete, definitive record of their culinary creation.
* **state**:
  * A set of `Recipes` with
    * an `author` of type `Author`
    * a `name` of type `String`
    * an `originalServings` of type `Number`
    * an `ingredients` list of `IngredientData`
    * a `cookingMethods` list of `String`
  * `IngredientData` (internal data structure, not a concept):
    * `name`: `String`
    * `quantity`: `Number`
    * `unit`: `String`
    * `scalingContext`: `String` (optional context for LLM scaling)
* **actions**:
  * `addRecipe (author: Author, name: String, originalServings: Number, ingredients: IngredientData[], cookingMethods: String[]): (recipe: Recipe)`
    * **requires**: `name` is unique for the given `author`. `originalServings` must be greater than 0. `ingredients` must not be empty.
    * **effects**: Creates a new recipe record and returns its ID.
  * `removeRecipe (recipeId: Recipe)`
    * **requires**: The recipe with `recipeId` must exist.
    * **effects**: Deletes the specified recipe record.
  * `editRecipe (recipeId: Recipe, newName: String?, newOriginalServings: Number?, newIngredients: IngredientData[]?, newCookingMethods: String[]?)`
    * **requires**: The recipe with `recipeId` must exist. `newName` (if provided) must be unique for the author (excluding the current recipe's name). `newOriginalServings` (if provided) must be greater than 0. `newIngredients` (if provided) must not be empty.
    * **effects**: Updates the specified fields of the recipe.
