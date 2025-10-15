---
timestamp: 'Wed Oct 15 2025 19:44:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_194426.268ac437.md]]'
content_id: aa67e2222ad51fd6a6e2cb2985a5a25f25b633df3640461d1eb17406c0402c0f
---

# Concept: Scaler

**Purpose**: Manages an instance of a Recipe being scaled by a certain factor. \
**Principle**: Given a recipe name, it uses an LLM with the entire recipe as context to scale the ingredients and stores the new version for later access.

### Core State

* **scaledRecipes**: A set of scaled recipes, each containing:
  * **name**: string
  * **servings**: number
  * **ingredients**: A set of ingredients

### Core Actions

* `scaleManually(name: string, targetPeople: number): Ingredient[]` - Scales ingredients linearly as a fallback.
  * *Requires*: `name` must exist in the recipe database and `targetPeople` cannot equal the recipe's original serving size.
  * *Effect*: Returns and stores a list of ingredients scaled linearly by the factor `targetPeople / originalServings`.
* `scaleRecipeAI(name: string, targetPeople: number): Ingredient[]` - Scales ingredients using an LLM for context-aware adjustments.
  * *Requires*: `name` must exist in the recipe database and `targetPeople` cannot equal the recipe's original serving size.
  * *Effect*: Uses an LLM to scale each ingredient, returns the new list, and stores it.
* `getScaledRecipe(name: string, targetPeople: number): Ingredient[]` - Retrieves a previously scaled recipe.
  * *Requires*: A scaled recipe with the specified `name` and `targetPeople` must already exist.
  * *Effect*: Returns the list of ingredients for the stored scaled recipe.
