---
timestamp: 'Wed Oct 15 2025 19:44:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_194426.268ac437.md]]'
content_id: c549e9669b1329047ca7f5070bfdcc1f040b976a616d969468cb682d5f74a88e
---

# Concept: Recipe

**Purpose**: Stores an original recipe. \
**Principle**: A recipe is manually inputted or uploaded with its original ingredients and serving size. It is then stored to be accessed by the Scaler.

### Core State

* **recipes**: A set of recipes, each containing:
  * **name**: string (must be unique)
  * **servings**: number
  * **cookingMethods**: A set of strings
  * **ingredients**: A set of ingredients, each with:
    * **quantity**: number
    * **unit**: string
    * **scalingContext**: string

### Core Actions

* `enterRecipe(name: string, originalPeople: number, ingredients: Ingredient[], cookingMethods: string[]): void` - Adds a new recipe to the database.
  * *Requires*: `name` must be unique.
  * *Effect*: A new recipe object is created and stored in the set of recipes.
* `removeRecipe(name: string): void` - Removes a recipe.
  * *Requires*: `name` must exist in the set of recipes.
  * *Effect*: Removes the specified recipe from the set of recipes.
* `getIngredients(name: string): Ingredient[]` - Retrieves the ingredients for a recipe.
  * *Requires*: `name` must exist in the set of recipes.
  * *Effect*: Returns the list of ingredients for the stored recipe.
* `getServings(name: string): number` - Retrieves the number of servings for a recipe.
  * *Requires*: `name` must exist in the set of recipes.
  * *Effect*: Returns the number of servings of the associated recipe.
* `getCookingMethods(name: string): string[]` - Retrieves the cooking methods for a recipe.
  * *Requires*: `name` must exist in the set of recipes.
  * *Effect*: Returns the list of cooking methods for the stored recipe.
