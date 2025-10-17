---
timestamp: 'Thu Oct 16 2025 16:30:56 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_163056.c17c2d36.md]]'
content_id: a25586c5f1d8e47bd91105670f63dd6981f8ce7b7a3a76e04fefe684a88086b2
---

# file: src/recipescaler/RecipeScalerConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Import the RecipeConcept to interact with its queries
// In a real application, this would be managed via dependency injection
// or a shared context, allowing the Scaler to query Recipe data without direct import coupling.
// For this example, we'll demonstrate accessing it if passed.
import RecipeConcept from "../recipe/RecipeConcept.ts";

// Collection prefix to ensure namespace separation in MongoDB
const PREFIX = "RecipeScaler" + ".";

// Generic types: Recipe is an ID from the Recipe concept
type Recipe = ID;
// Internal ID type for a scaled recipe within this concept
type ScaledRecipe = ID;

/**
 * @typedef IngredientData
 * Re-using the IngredientData structure from the Recipe concept.
 * Represents a single ingredient with its name, quantity, unit, and scaling context.
 */
interface IngredientData {
  name: string;
  quantity: number;
  unit: string;
  scalingContext?: string; // e.g., "to taste", "optional", for LLM guidance
}

/**
 * @interface ScaledRecipeDoc
 * Represents the structure of a scaled recipe document stored in MongoDB.
 * Corresponds to "A set of ScaledRecipes" in the concept state.
 */
interface ScaledRecipeDoc {
  _id: ScaledRecipe; // MongoDB's primary key for the scaled recipe instance
  baseRecipeId: Recipe; // Reference to the original Recipe concept's ID
  targetServings: number;
  scaledIngredients: IngredientData[]; // The list of ingredients after scaling
  scalingMethod: "manual" | "ai"; // Indicates how this scaling was performed
  // Optional: generatedAt: Date; // Timestamp of when this scaled recipe was generated
  // Optional: userId: ID; // User who requested this scaling (if applicable)
}

/**
 * Mock LLM interaction function.
 * In a real application, this would involve API calls to an actual LLM service.
 * It takes the full recipe context and returns intelligently scaled ingredients.
 */
const mockLLMScale = (
  recipeName: string,
  originalServings: number,
  targetServings: number,
  ingredients: IngredientData[],
  cookingMethods: string[], // Included for context, though this mock won't use it much
): IngredientData[] => {
  console.log(`[Mock LLM] Scaling recipe: '${recipeName}' from ${originalServings} to ${targetServings} servings.`);
  console.log(`[Mock LLM] Ingredients received:`, ingredients);
  console.log(`[Mock LLM] Cooking methods received:`, cookingMethods);

  const scaleFactor = targetServings / originalServings;
  const scaled: IngredientData[] = ingredients.map((ing) => {
    let scaledQuantity = ing.quantity * scaleFactor;

    // Example LLM-like logic for intelligent scaling based on context
    if (ing.scalingContext?.toLowerCase().includes("taste") || ing.scalingContext?.toLowerCase().includes("optional")) {
      // LLM might decide not to scale "to taste" or "optional" items significantly
      console.log(`[Mock LLM] Adjusting for scalingContext: '${ing.scalingContext}' for '${ing.name}'`);
      scaledQuantity = ing.quantity; // Keep original quantity for "to taste"
    } else if (ing.unit.toLowerCase().includes("clove") && targetServings > originalServings && scaleFactor < 2) {
      // For small, discrete items like garlic cloves, LLM might round up conservatively
      console.log(`[Mock LLM] Rounding up small discrete item: '${ing.name}'`);
      scaledQuantity = Math.ceil(scaledQuantity > ing.quantity ? scaledQuantity : ing.quantity);
    } else if (ing.unit.toLowerCase().includes("pinch") || ing.unit.toLowerCase().includes("dash")) {
       // Very small units might not scale linearly or might have a floor/cap
       console.log(`[Mock LLM] Adjusting for very small unit: '${ing.name}'`);
       if (scaledQuantity < ing.quantity && scaledQuantity < 0.25) scaledQuantity = 0.25; // Don't go below a quarter pinch
       else if (scaledQuantity > ing.quantity && scaledQuantity > ing.quantity * 3) scaledQuantity = ing.quantity * 3; // Cap at 3x for dashes
    } else {
      scaledQuantity = parseFloat(scaledQuantity.toFixed(2)); // General rounding for other items
    }

    return {
      ...ing,
      quantity: scaledQuantity,
    };
  });

  console.log(`[Mock LLM] Scaled ingredients generated:`, scaled);
  return scaled;
};

/**
 * @concept RecipeScaler
 * @purpose To provide and manage scaled versions of existing recipes, intelligently
 * adjusting ingredient quantities based on user-specified serving changes,
 * utilizing both linear and AI-driven methods.
 *
 * @principle If a user selects an existing recipe and specifies a new number of
 * servings, the system retrieves the recipe's full context, calculates the
 * adjusted ingredient quantities (either linearly or using an AI model), and
 * stores this new scaled version, making it retrievable for cooking.
 */
export default class RecipeScalerConcept {
  scaledRecipes: Collection<ScaledRecipeDoc>;
  private recipeConcept: RecipeConcept; // Dependency on RecipeConcept

  constructor(private readonly db: Db, recipeConceptInstance: RecipeConcept) {
    this.scaledRecipes = this.db.collection<ScaledRecipeDoc>(PREFIX + "scaledRecipes");
    this.recipeConcept = recipeConceptInstance; // Inject the RecipeConcept instance
  }

  /**
   * Action: Scales a recipe linearly based on the target servings.
   *
   * @param {Object} params - The parameters for manual scaling.
   * @param {Recipe} params.baseRecipeId - The ID of the original recipe to scale.
   * @param {number} params.targetServings - The desired number of servings.
   * @returns {Promise<{scaledRecipeId: ScaledRecipe} | {error: string}>} The ID of the newly created/updated scaled recipe on success, or an error.
   *
   * @requires The baseRecipeId must exist in the Recipe concept.
   * @requires targetServings must be greater than 0.
   * @requires targetServings must not equal the originalServings of the baseRecipeId.
   * @effects Calculates new ingredient quantities linearly, creates/updates a
   *          ScaledRecipe record with 'manual' scalingMethod, and stores it.
   */
  async scaleManually(
    { baseRecipeId, targetServings }: { baseRecipeId: Recipe; targetServings: number },
  ): Promise<{ scaledRecipeId: ScaledRecipe } | { error: string }> {
    // 1. Precondition: Fetch the base recipe from the Recipe concept
    const baseRecipe = await this.recipeConcept._getRecipeById({ recipeId: baseRecipeId });
    if (!baseRecipe) {
      return { error: `Base recipe with ID ${baseRecipeId} not found.` };
    }

    // 2. Preconditions: targetServings validation
    if (targetServings <= 0) {
      return { error: "targetServings must be greater than 0." };
    }
    if (targetServings === baseRecipe.originalServings) {
      return { error: `targetServings (${targetServings}) cannot be equal to originalServings (${baseRecipe.originalServings}).` };
    }

    // 3. Effect: Calculate scaled ingredients linearly
    const scaleFactor = targetServings / baseRecipe.originalServings;
    const scaledIngredients: IngredientData[] = baseRecipe.ingredients.map((ing) => ({
      ...ing,
      quantity: parseFloat((ing.quantity * scaleFactor).toFixed(2)), // Round to 2 decimal places
    }));

    // 4. Effect: Create or update the ScaledRecipe record
    let scaledRecipeDoc = await this.scaledRecipes.findOne({ baseRecipeId, targetServings, scalingMethod: 'manual' });
    let scaledRecipeId: ScaledRecipe;

    if (scaledRecipeDoc) {
      // Update existing record
      await this.scaledRecipes.updateOne(
        { _id: scaledRecipeDoc._id },
        { $set: { scaledIngredients, generatedAt: new Date() } },
      );
      scaledRecipeId = scaledRecipeDoc._id;
    } else {
      // Create new record
      scaledRecipeId = freshID() as ScaledRecipe;
      await this.scaledRecipes.insertOne({
        _id: scaledRecipeId,
        baseRecipeId,
        targetServings,
        scaledIngredients,
        scalingMethod: "manual",
        // generatedAt: new Date(), // Uncomment if you add this field to interface
        // userId: (/* obtain current user ID from a Session concept if needed */)
      });
    }

    return { scaledRecipeId };
  }

  /**
   * Action: Scales a recipe using an internal LLM for intelligent adjustments.
   *
   * @param {Object} params - The parameters for AI scaling.
   * @param {Recipe} params.baseRecipeId - The ID of the original recipe to scale.
   * @param {number} params.targetServings - The desired number of servings.
   * @returns {Promise<{scaledRecipeId: ScaledRecipe} | {error: string}>} The ID of the newly created/updated scaled recipe on success, or an error.
   *
   * @requires The baseRecipeId must exist in the Recipe concept.
   * @requires targetServings must be greater than 0.
   * @requires targetServings must not equal the originalServings of the baseRecipeId.
   * @effects Fetches the entire recipe context, uses an internal LLM (mocked) to
   *          intelligently adjust ingredient quantities, and either creates a new
   *          ScaledRecipe record or updates an existing one for that baseRecipeId
   *          and targetServings with 'ai' scalingMethod, and stores it.
   */
  async scaleRecipeAI(
    { baseRecipeId, targetServings }: { baseRecipeId: Recipe; targetServings: number },
  ): Promise<{ scaledRecipeId: ScaledRecipe } | { error: string }> {
    // 1. Precondition: Fetch the base recipe from the Recipe concept
    const baseRecipe = await this.recipeConcept._getRecipeById({ recipeId: baseRecipeId });
    if (!baseRecipe) {
      return { error: `Base recipe with ID ${baseRecipeId} not found.` };
    }

    // 2. Preconditions: targetServings validation
    if (targetServings <= 0) {
      return { error: "targetServings must be greater than 0." };
    }
    if (targetServings === baseRecipe.originalServings) {
      return { error: `targetServings (${targetServings}) cannot be equal to originalServings (${baseRecipe.originalServings}).` };
    }

    // 3. Effect: Use LLM for intelligent scaling
    // The mockLLMScale function simulates this internal LLM interaction.
    const scaledIngredients: IngredientData[] = mockLLMScale(
      baseRecipe.name,
      baseRecipe.originalServings,
      targetServings,
      baseRecipe.ingredients,
      baseRecipe.cookingMethods,
    );

    // 4. Effect: Create or update the ScaledRecipe record
    let scaledRecipeDoc = await this.scaledRecipes.findOne({ baseRecipeId, targetServings, scalingMethod: 'ai' });
    let scaledRecipeId: ScaledRecipe;

    if (scaledRecipeDoc) {
      // Update existing record
      await this.scaledRecipes.updateOne(
        { _id: scaledRecipeDoc._id },
        { $set: { scaledIngredients, generatedAt: new Date() } },
      );
      scaledRecipeId = scaledRecipeDoc._id;
    } else {
      // Create new record
      scaledRecipeId = freshID() as ScaledRecipe;
      await this.scaledRecipes.insertOne({
        _id: scaledRecipeId,
        baseRecipeId,
        targetServings,
        scaledIngredients,
        scalingMethod: "ai",
        // generatedAt: new Date(), // Uncomment if you add this field to interface
        // userId: (/* obtain current user ID from a Session concept if needed */)
      });
    }

    return { scaledRecipeId };
  }

  // --- Queries (start with an underscore '_') ---

  /**
   * Query: Retrieves a single scaled recipe by its ScaledRecipe ID.
   *
   * @param {Object} params - The query parameters.
   * @param {ScaledRecipe} params.scaledRecipeId - The ID of the scaled recipe to retrieve.
   * @returns {Promise<ScaledRecipeDoc | {error: string}>} The scaled recipe document if found, or an error.
   *
   * @requires scaledRecipeId must exist in the RecipeScaler concept.
   * @effects Returns the ScaledRecipeDoc for the specified ID.
   */
  async _getScaledRecipe({ scaledRecipeId }: { scaledRecipeId: ScaledRecipe }): Promise<ScaledRecipeDoc | { error: string }> {
    const scaledRecipe = await this.scaledRecipes.findOne({ _id: scaledRecipeId });
    if (!scaledRecipe) {
      return { error: `Scaled recipe with ID ${scaledRecipeId} not found.` };
    }
    return scaledRecipe;
  }

  /**
   * Query: Finds a scaled recipe for a given base recipe ID and target servings.
   *
   * @param {Object} params - The query parameters.
   * @param {Recipe} params.baseRecipeId - The ID of the original recipe.
   * @param {number} params.targetServings - The target number of servings for the scaled recipe.
   * @returns {Promise<ScaledRecipeDoc | null>} The scaled recipe document if found, otherwise null.
   *
   * @requires (Implicitly, for a meaningful result) a scaled recipe for the given
   *           baseRecipeId and targetServings exists.
   * @effects Returns the ScaledRecipeDoc that matches the base recipe ID and target servings.
   */
  async _findScaledRecipe(
    { baseRecipeId, targetServings }: { baseRecipeId: Recipe; targetServings: number },
  ): Promise<ScaledRecipeDoc | null> {
    return await this.scaledRecipes.findOne({ baseRecipeId, targetServings });
  }

    /**
   * Query: Retrieves all scaled recipes associated with a specific base recipe.
   *
   * @param {Object} params - The query parameters.
   * @param {Recipe} params.baseRecipeId - The ID of the base recipe.
   * @returns {Promise<ScaledRecipeDoc[]>} An array of scaled recipe documents.
   */
  async _getScaledRecipesByBaseRecipe({ baseRecipeId }: { baseRecipeId: Recipe }): Promise<ScaledRecipeDoc[]> {
    return await this.scaledRecipes.find({ baseRecipeId }).toArray();
  }
}
```
