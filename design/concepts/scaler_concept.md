# Concept: Scaler

**Purpose**: Manages an instance of a Recipe being scaled by a certain factor. \
**Principle**: Given a recipe name, it uses an LLM with the entire recipe as context to scale the ingredients and stores the new version for later access.

### Core State
- **scaledRecipes**: A set of scaled recipes, each containing:
    - **name**: string
    - **servings**: number
    - **ingredients**: A set of ingredients

### Core Actions
- `scaleManually(name: string, targetPeople: number): Ingredient[]` - Scales ingredients linearly as a fallback.
    - *Requires*: `name` must exist in the recipe database and `targetPeople` cannot equal the recipe's original serving size.
    - *Effect*: Returns and stores a list of ingredients scaled linearly by the factor `targetPeople / originalServings`.
- `scaleRecipeAI(name: string, targetPeople: number): Ingredient[]` - Scales ingredients using an LLM for context-aware adjustments.
    - *Requires*: `name` must exist in the recipe database and `targetPeople` cannot equal the recipe's original serving size.
    - *Effect*: Uses an LLM to scale each ingredient, returns the new list, and stores it.
- `getScaledRecipe(name: string, targetPeople: number): Ingredient[]` - Retrieves a previously scaled recipe.
    - *Requires*: A scaled recipe with the specified `name` and `targetPeople` must already exist.
    - *Effect*: Returns the list of ingredients for the stored scaled recipe.

# Concept: Recipe

**Purpose**: Stores an original recipe. \
**Principle**: A recipe is manually inputted or uploaded with its original ingredients and serving size. It is then stored to be accessed by the Scaler.

### Core State
- **recipes**: A set of recipes, each containing:
    - **name**: string (must be unique)
    - **servings**: number
    - **cookingMethods**: A set of strings
    - **ingredients**: A set of ingredients, each with:
        - **quantity**: number
        - **unit**: string
        - **scalingContext**: string

### Core Actions
- `enterRecipe(name: string, originalPeople: number, ingredients: Ingredient[], cookingMethods: string[]): void` - Adds a new recipe to the database.
    - *Requires*: `name` must be unique.
    - *Effect*: A new recipe object is created and stored in the set of recipes.
- `removeRecipe(name: string): void` - Removes a recipe.
    - *Requires*: `name` must exist in the set of recipes.
    - *Effect*: Removes the specified recipe from the set of recipes.
- `getIngredients(name: string): Ingredient[]` - Retrieves the ingredients for a recipe.
    - *Requires*: `name` must exist in the set of recipes.
    - *Effect*: Returns the list of ingredients for the stored recipe.
- `getServings(name: string): number` - Retrieves the number of servings for a recipe.
    - *Requires*: `name` must exist in the set of recipes.
    - *Effect*: Returns the number of servings of the associated recipe.
- `getCookingMethods(name: string): string[]` - Retrieves the cooking methods for a recipe.
    - *Requires*: `name` must exist in the set of recipes.
    - *Effect*: Returns the list of cooking methods for the stored recipe.