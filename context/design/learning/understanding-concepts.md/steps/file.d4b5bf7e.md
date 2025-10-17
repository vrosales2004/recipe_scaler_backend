---
timestamp: 'Thu Oct 16 2025 13:15:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_131521.c2409be3.md]]'
content_id: d4b5bf7e0ba3d0f918f4959001226e0a5ae4d97bd8d736b3e31b95f2b2d68cdc
---

# file: src/recipe/RecipeConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation in MongoDB
const PREFIX = "Recipe" + ".";

// Generic type for the external entity that authors recipes
type Author = ID;
// Internal ID type for a recipe within this concept
type Recipe = ID;

/**
 * @typedef IngredientData
 * Represents a single ingredient within a recipe.
 * This is treated as a plain data structure, not a separate concept,
 * as it doesn't have independent user-facing functionality.
 */
interface IngredientData {
  name: string;
  quantity: number;
  unit: string;
  scalingContext?: string; // e.g., "to taste", "optional", for LLM guidance
}

/**
 * @interface RecipeDoc
 * Represents the structure of a recipe document stored in MongoDB.
 * Corresponds to "A set of Recipes" in the concept state.
 */
interface RecipeDoc {
  _id: Recipe; // MongoDB's primary key for the recipe
  author: Author;
  name: string;
  originalServings: number; // e.g., "serves 4"
  ingredients: IngredientData[];
  cookingMethods: string[]; // e.g., ["bake", "fry", "boil"]
}

/**
 * @concept Recipe
 * @purpose To manage the canonical definition and storage of cooking recipes,
 * enabling users to maintain their collection of culinary instructions.
 *
 * @principle After a user adds a recipe with its ingredients and cooking steps,
 * they can later retrieve or modify that recipe as a complete, definitive record
 * of their culinary creation.
 */
export default class RecipeConcept {
  // MongoDB collection for storing recipe documents
  recipes: Collection<RecipeDoc>;

  constructor(private readonly db: Db) {
    // Initialize the 'recipes' collection with the defined document interface
    this.recipes = this.db.collection<RecipeDoc>(PREFIX + "recipes");
  }

  /**
   * Action: Creates a new recipe record.
   *
   * @param {Object} params - The parameters for adding a recipe.
   * @param {Author} params.author - The ID of the author creating the recipe.
   * @param {string} params.name - The name of the recipe.
   * @param {number} params.originalServings - The original number of servings the recipe yields.
   * @param {IngredientData[]} params.ingredients - A list of ingredients for the recipe.
   * @param {string[]} params.cookingMethods - A list of cooking methods/steps.
   * @returns {Promise<{recipe: Recipe} | {error: string}>} The ID of the newly created recipe on success, or an error message.
   *
   * @requires originalServings must be greater than 0.
   * @requires ingredients must not be empty.
   * @requires name is unique for the given author.
   * @effects A new recipe document is inserted into the 'recipes' collection.
   */
  async addRecipe(
    { author, name, originalServings, ingredients, cookingMethods }: {
      author: Author;
      name: string;
      originalServings: number;
      ingredients: IngredientData[];
      cookingMethods: string[];
    },
  ): Promise<{ recipe: Recipe } | { error: string }> {
    // Precondition: originalServings must be greater than 0
    if (originalServings <= 0) {
      return { error: "originalServings must be greater than 0." };
    }
    // Precondition: ingredients list must not be empty
    if (ingredients.length === 0) {
      return { error: "Recipe must have at least one ingredient." };
    }

    // Precondition: Check for unique name per author
    const existingRecipe = await this.recipes.findOne({ author, name });
    if (existingRecipe) {
      return { error: `A recipe named '${name}' already exists for this author.` };
    }

    // Effect: Create a new recipe document
    const recipeId = freshID() as Recipe; // Generate a fresh ID for the new recipe
    await this.recipes.insertOne({
      _id: recipeId,
      author,
      name,
      originalServings,
      ingredients,
      cookingMethods,
    });

    return { recipe: recipeId }; // Return the ID of the new recipe
  }

  /**
   * Action: Removes an existing recipe record.
   *
   * @param {Object} params - The parameters for removing a recipe.
   * @param {Recipe} params.recipeId - The ID of the recipe to remove.
   * @returns {Promise<Empty | {error: string}>} An empty object on success, or an error message.
   *
   * @requires The recipe with recipeId must exist.
   * @effects The specified recipe document is deleted from the 'recipes' collection.
   */
  async removeRecipe({ recipeId }: { recipeId: Recipe }): Promise<Empty | { error: string }> {
    // Precondition: The recipe with recipeId must exist (implied by checking deletion count)
    const result = await this.recipes.deleteOne({ _id: recipeId });
    if (result.deletedCount === 0) {
      return { error: `Recipe with ID ${recipeId} not found.` };
    }

    return {}; // Success
  }

  /**
   * Action: Updates specified fields of an existing recipe.
   *
   * @param {Object} params - The parameters for editing a recipe.
   * @param {Recipe} params.recipeId - The ID of the recipe to update.
   * @param {string} [params.newName] - The new name for the recipe (optional).
   * @param {number} [params.newOriginalServings] - The new original servings count (optional).
   * @param {IngredientData[]} [params.newIngredients] - The new list of ingredients (optional).
   * @param {string[]} [params.newCookingMethods] - The new list of cooking methods (optional).
   * @returns {Promise<Empty | {error: string}>} An empty object on success, or an error message.
   *
   * @requires The recipe with recipeId must exist.
   * @requires newName (if provided) must be unique for the author (excluding the current recipe's name).
   * @requires newOriginalServings (if provided) must be greater than 0.
   * @requires newIngredients (if provided) must not be empty.
   * @effects The specified fields of the recipe are updated in the 'recipes' collection.
   */
  async editRecipe(
    { recipeId, newName, newOriginalServings, newIngredients, newCookingMethods }: {
      recipeId: Recipe;
      newName?: string;
      newOriginalServings?: number;
      newIngredients?: IngredientData[];
      newCookingMethods?: string[];
    },
  ): Promise<Empty | { error: string }> {
    // Precondition: The recipe with recipeId must exist
    const existingRecipe = await this.recipes.findOne({ _id: recipeId });
    if (!existingRecipe) {
      return { error: `Recipe with ID ${recipeId} not found.` };
    }

    // Precondition: If newName is provided, it must be unique for the author (excluding the current recipe's name)
    if (newName !== undefined && newName !== existingRecipe.name) {
      const nameConflict = await this.recipes.findOne({ author: existingRecipe.author, name: newName });
      if (nameConflict) {
        return { error: `A recipe named '${newName}' already exists for this author.` };
      }
    }

    // Precondition: If newOriginalServings is provided, it must be greater than 0
    if (newOriginalServings !== undefined && newOriginalServings <= 0) {
      return { error: "newOriginalServings must be greater than 0." };
    }

    // Precondition: If newIngredients is provided, it must not be empty
    if (newIngredients !== undefined && newIngredients.length === 0) {
      return { error: "newIngredients cannot be empty." };
    }

    // Construct the update document dynamically based on provided optional fields
    const updateDoc: Partial<RecipeDoc> = {};
    if (newName !== undefined) updateDoc.name = newName;
    if (newOriginalServings !== undefined) updateDoc.originalServings = newOriginalServings;
    if (newIngredients !== undefined) updateDoc.ingredients = newIngredients;
    if (newCookingMethods !== undefined) updateDoc.cookingMethods = newCookingMethods;

    // If no fields were provided for update, return an error
    if (Object.keys(updateDoc).length === 0) {
      return { error: "No fields provided for update." };
    }

    // Effect: Update the specified fields of the recipe
    const result = await this.recipes.updateOne({ _id: recipeId }, { $set: updateDoc });
    if (result.matchedCount === 0) {
      // This case should ideally not be hit due to the initial findOne check
      return { error: `Recipe with ID ${recipeId} not found during update (concurrency issue?).` };
    }

    return {}; // Success
  }

  // --- Queries (start with an underscore '_') ---

  /**
   * Query: Retrieves a single recipe by its ID.
   *
   * @param {Object} params - The query parameters.
   * @param {Recipe} params.recipeId - The ID of the recipe to retrieve.
   * @returns {Promise<RecipeDoc | null>} The recipe document if found, otherwise null.
   */
  async _getRecipeById({ recipeId }: { recipeId: Recipe }): Promise<RecipeDoc | null> {
    return await this.recipes.findOne({ _id: recipeId });
  }

  /**
   * Query: Retrieves all recipes for a given author.
   *
   * @param {Object} params - The query parameters.
   * @param {Author} params.author - The ID of the author whose recipes to retrieve.
   * @returns {Promise<RecipeDoc[]>} An array of recipe documents.
   */
  async _getRecipesByAuthor({ author }: { author: Author }): Promise<RecipeDoc[]> {
    return await this.recipes.find({ author }).toArray();
  }

  /**
   * Query: Retrieves recipes that contain a specific ingredient name (case-insensitive search).
   *
   * @param {Object} params - The query parameters.
   * @param {string} params.ingredientName - The name of the ingredient to search for.
   * @returns {Promise<RecipeDoc[]>} An array of recipe documents matching the ingredient.
   */
  async _searchRecipesByIngredient({ ingredientName }: { ingredientName: string }): Promise<RecipeDoc[]> {
    return await this.recipes.find({ "ingredients.name": { $regex: new RegExp(ingredientName, "i") } }).toArray();
  }
}
```
