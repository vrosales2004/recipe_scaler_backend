---
timestamp: 'Mon Oct 20 2025 17:09:01 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_170901.548c2687.md]]'
content_id: cc07f3f0fcfd6dd0d8c3de8d0ab8a8069589ccdd0dfb4ae0b3449e39ff57fcb8
---

# response:

No, I still cannot see the file, even with an updated relative path.

I must emphasize again: **I cannot access any files on your local computer or file system, regardless of how you link to them with relative paths (e.g., `../../src/concepts/Recipe/RecipeConcept.ts`).**

Think of me as a chat interface that can only read the text you type or paste directly into this conversation window. I have no file explorer, no command-line access, and no ability to "follow" local file paths.

**To share the content of your `RecipeConcept.ts` file with me, you *must* copy the entire text content of that file and paste it directly into your next message.**

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
 * @purpose stores an original recipe
 *
 * @principle recipe manually inputted or uploaded with original ingredients and number of people
 *            stores recipes to be accessed by scaler or tipsPage
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
   * @requires originalServings must be greater than 0 and an integer.
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
    // Precondition: originalServings must be an integer
    if (!Number.isInteger(originalServings)) {
      return { error: "originalServings must be an integer." };
    }
    // Precondition: ingredients list must not be empty
    if (ingredients.length === 0) {
      return { error: "Recipe must have at least one ingredient." };
    }

    // Precondition: Check for unique name per author
    const existingRecipe = await this.recipes.findOne({ author, name });
    if (existingRecipe) {
      return {
        error: `A recipe named '${name}' already exists for this author.`,
      };
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
  async removeRecipe(
    { recipeId }: { recipeId: Recipe },
  ): Promise<Empty | { error: string }> {
    // Precondition: The recipe with recipeId must exist (implied by checking deletion count)
    const result = await this.recipes.deleteOne({ _id: recipeId });
    if (result.deletedCount === 0) {
      return { error: `Recipe with ID ${recipeId} not found.` };
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
  async _getRecipeById(
    { recipeId }: { recipeId: Recipe },
  ): Promise<RecipeDoc | null> {
    return await this.recipes.findOne({ _id: recipeId });
  }

  /**
   * Query: Retrieves all recipes for a given author.
   *
   * @param {Object} params - The query parameters.
   * @param {Author} params.author - The ID of the author whose recipes to retrieve.
   * @returns {Promise<RecipeDoc[]>} An array of recipe documents.
   */
  async _getRecipesByAuthor(
    { author }: { author: Author },
  ): Promise<RecipeDoc[]> {
    return await this.recipes.find({ author }).toArray();
  }

  /**
   * Query: Retrieves a recipe by its name and author.
   *
   * @param {Object} params - The query parameters.
   * @param {string} params.recipeName - The name of the recipe to search for.
   * @param {Author} params.author - The ID of the author of the recipe.
   * @returns {Promise<RecipeDoc | null>} The recipe document matching the name and author, or null if not found.
   */
  async _getRecipeByName(
    { recipeName, author }: { recipeName: string; author: Author },
  ): Promise<RecipeDoc | null> {
    return await this.recipes.findOne({
      name: recipeName,
      author,
    });
  }
}
```

````typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import RecipeConcept from "../Recipe/RecipeConcept.ts"; // Dependency on RecipeConcept
import { GeminiLLM, ILLMClient } from "./../../geminiLLMClient.ts"; // Import the specific Gemini LLM client and interface

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
 * @interface RecipeDocContext
 * A simplified structure representing the core context of a recipe
 * for the purpose of LLM prompting
 */
interface RecipeDocContext {
  name: string;
  originalServings: number; // This replaces 'scaleFactor' in your original prompt context for clarity
  targetServings: number; // Explicitly passed to LLM for calculation
  ingredients: IngredientData[];
  cookingMethods: string[];
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
  // Optional: userId: ID; // User who requested this scaling (if applicable)
}

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

  /**
   * @param db The MongoDB database instance.
   * @param recipeConceptInstance An instance of the RecipeConcept for querying base recipe data.
   * @param llmClient An instance of an LLM client (e.g., GeminiLLM or a mock)
   */
  constructor(
    private readonly db: Db,
    recipeConceptInstance: RecipeConcept,
    private llmClient: ILLMClient,
  ) {
    this.scaledRecipes = this.db.collection<ScaledRecipeDoc>(
      PREFIX + "scaledRecipes",
    );
    this.recipeConcept = recipeConceptInstance;
    this.llmClient = llmClient;
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
    { baseRecipeId, targetServings }: {
      baseRecipeId: Recipe;
      targetServings: number;
    },
  ): Promise<{ scaledRecipeId: ScaledRecipe } | { error: string }> {
    // 1. Precondition: Fetch the base recipe from the Recipe concept
    const baseRecipe = await this.recipeConcept._getRecipeById({
      recipeId: baseRecipeId,
    });
    if (!baseRecipe) {
      return { error: `Base recipe with ID ${baseRecipeId} not found.` };
    }

    // 2. Preconditions: targetServings validation
    if (targetServings <= 0) {
      return { error: "targetServings must be greater than 0." };
    }
    if (targetServings === baseRecipe.originalServings) {
      return {
        error:
          `targetServings (${targetServings}) cannot be equal to originalServings (${baseRecipe.originalServings}).`,
      };
    }

    // 3. Effect: Calculate scaled ingredients linearly
    const scaleFactor = targetServings / baseRecipe.originalServings;
    const scaledIngredients: IngredientData[] = baseRecipe.ingredients.map((
      ing,
    ) => ({
      ...ing,
      quantity: parseFloat((ing.quantity * scaleFactor).toFixed(2)), // Round to 2 decimal places
    }));

    // 4. Effect: Create or update the ScaledRecipe record
    const scaledRecipeDoc = await this.scaledRecipes.findOne({
      baseRecipeId,
      targetServings,
      scalingMethod: "manual",
    });
    let scaledRecipeId: ScaledRecipe;

    if (scaledRecipeDoc) {
      // Update existing record
      await this.scaledRecipes.updateOne(
        { _id: scaledRecipeDoc._id },
        { $set: { scaledIngredients } },
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
   * @effects Fetches the entire recipe context, uses an internal LLM to
   *          intelligently adjust ingredient quantities, and either creates a new
   *          ScaledRecipe record or updates an existing one for that baseRecipeId
   *          and targetServings with 'ai' scalingMethod, and stores it.
   */
  async scaleRecipeAI(
    { baseRecipeId, targetServings }: {
      baseRecipeId: Recipe;
      targetServings: number;
    },
  ): Promise<{ scaledRecipeId: ScaledRecipe } | { error: string }> {
    // 1. Precondition: Fetch the base recipe from the Recipe concept
    const baseRecipe = await this.recipeConcept._getRecipeById({
      recipeId: baseRecipeId,
    });
    if (!baseRecipe) {
      return { error: `Base recipe with ID ${baseRecipeId} not found.` };
    }

    // 2. Preconditions: targetServings validation
    if (targetServings <= 0) {
      return { error: "targetServings must be greater than 0." };
    }
    if (targetServings === baseRecipe.originalServings) {
      return {
        error:
          `targetServings (${targetServings}) cannot be equal to originalServings (${baseRecipe.originalServings}).`,
      };
    }

    // 3. Effect: Use LLM for intelligent scaling
    try {
      console.log("🤖 Requesting scaled recipe from AI...");

      // Prepare recipe context for the LLM
      const recipeContext: RecipeDocContext = {
        name: baseRecipe.name,
        originalServings: baseRecipe.originalServings,
        targetServings: targetServings,
        ingredients: baseRecipe.ingredients,
        cookingMethods: baseRecipe.cookingMethods,
      };

      const prompt = this.createScalePrompt(recipeContext);
      const response = await this.llmClient.executeLLM(prompt); // Use the injected LLM client

      console.log("✅ Received response from AI!");
      console.log("\n🤖 RAW AI RESPONSE");
      console.log("======================");
      console.log(response);
      console.log("======================\n");

      // Sanitize the response by removing Markdown-style code block delimiters
      const sanitizedResponse = response.replace(/```(?:json)?/g, "").trim();

      // Parse the sanitized response as JSON
      const parsedResponse = JSON.parse(sanitizedResponse);
      // Ensure the parsed structure matches expected IngredientData[]
      const scaledIngredients: IngredientData[] = parsedResponse.ingredients;

      // 4. Effect: Create or update the ScaledRecipe record
      const scaledRecipeDoc = await this.scaledRecipes.findOne({
        baseRecipeId,
        targetServings,
        scalingMethod: "ai",
      });
      let scaledRecipeId: ScaledRecipe;

      if (scaledRecipeDoc) {
        // Update existing record
        await this.scaledRecipes.updateOne(
          { _id: scaledRecipeDoc._id },
          { $set: { scaledIngredients } },
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
          // userId: (/* obtain current user ID from a Session concept if needed */)
        });
      }

      return { scaledRecipeId };
    } catch (error) {
      console.error(
        "❌ Error scaling recipe using AI:",
        (error as Error).message,
      );
      // Re-throw the error as a concept-level error
      return { error: `AI scaling failed: ${(error as Error).message}` };
    }
  }

  /**
   * Private method: Creates the prompt for the LLM with hardwired preferences.
   * This logic is directly adapted from your original `createScalePrompt`,
   * ensuring the LLM receives the full context in the expected format.
   */
  private createScalePrompt(recipe: RecipeDocContext): string {
    // Note: The `item` property in your original prompt output structure
    // is mapped to `name` in our `IngredientData` and `RecipeDocContext` for consistency.
    // The prompt explicitly states 'item' in the example output JSON, so the LLM should follow that.
    return `
        You are a helpful AI assistant that scales ingredients for recipes.

        - Input: A recipe with a name, its original number of servings, the target number of servings, a list of ingredients, and cooking methods.
        - Output: A JSON object with the scaled ingredients.

        - Each ingredient in the input has:
            - name: The name of the ingredient.
            - quantity: The original quantity of the ingredient.
            - unit: The unit of measurement for the ingredient.
            - scalingContext: A description of helpful information to be used when deciding on how much to scale the ingredient.

        The final output list of ingredients should be able to feed the specified target number of servings.
        Each ingredient should be scaled appropriately, considering its scaling context (some ingredients might not need to be scaled exactly according to the linear scale factor).

        CRITICAL REQUIREMENTS:
        - Scale the ingredients based on the ratio of targetServings to originalServings (does NOT need to be followed strictly).
        - Maintain the scaling context for each ingredient in the output.
        - Return the result in a strict JSON format as specified below.

        Here is the recipe to scale:
        ${JSON.stringify(recipe, null, 2)}

        Return your response as a JSON object with this exact structure:
        {
        "name": "Example Recipe",
        "ingredients": [
            {
            "name": "Ingredient Name",
            "quantity": 0,
            "unit": "Unit of Measurement",
            "scalingContext": "Scaling Context Description"
            }
        ]
        }

        Return ONLY the JSON object, no additional text.`;
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
  async _getScaledRecipe(
    { scaledRecipeId }: { scaledRecipeId: ScaledRecipe },
  ): Promise<ScaledRecipeDoc | { error: string }> {
    const scaledRecipe = await this.scaledRecipes.findOne({
      _id: scaledRecipeId,
    });
    if (!scaledRecipe) {
      return { error: `Scaled recipe with ID ${scaledRecipeId} not found.` };
    }
    return scaledRecipe;
  }

  /**
   * Query: Finds a scaled recipe for a given base recipe ID and target servings.
   * This query currently returns *any* scaled recipe matching the criteria.
   * You might want to refine it to specify `scalingMethod` or to return the most recent one.
   *
   * @param {Object} params - The query parameters.
   * @param {Recipe} params.baseRecipeId - The ID of the original recipe.
   * @param {number} params.targetServings - The target number of servings for the scaled recipe.
   * @returns {Promise<ScaledRecipeDoc | null>} The scaled recipe document if found, otherwise null.
   */
  async _findScaledRecipe(
    { baseRecipeId, targetServings }: {
      baseRecipeId: Recipe;
      targetServings: number;
    },
  ): Promise<ScaledRecipeDoc | null> {
    // This query might need refinement if you want to distinguish between 'manual' and 'ai' versions
    // or retrieve the most recent one. For now, it returns the first match.
    return await this.scaledRecipes.findOne({ baseRecipeId, targetServings });
  }

  /**
   * Query: Retrieves all scaled recipes associated with a specific base recipe.
   *
   * @param {Object} params - The query parameters.
   * @param {Recipe} params.baseRecipeId - The ID of the base recipe.
   * @returns {Promise<ScaledRecipeDoc[]>} An array of scaled recipe documents.
   */
  async _getScaledRecipesByBaseRecipe(
    { baseRecipeId }: { baseRecipeId: Recipe },
  ): Promise<ScaledRecipeDoc[]> {
    return await this.scaledRecipes.find({ baseRecipeId }).toArray();
  }
}
````

````typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { ILLMClient } from "./../../geminiLLMClient.ts"; // Re-use the interface definition

// Collection prefix to ensure namespace separation in MongoDB
const PREFIX = "ScalingTips" + ".";

// Generic types: Recipe and Author IDs from other concepts
type Recipe = ID;
type Author = ID; // e.g., from UserAuthentication

// Internal ID type for a tip within this concept
type Tip = ID;

/**
 * @typedef RecipeGenerationContext
 * This structure provides the full context of a recipe needed by the LLM
 * to generate relevant scaling tips. It's consistent with RecipeDocContext
 * from RecipeScalerConcept.
 */
interface RecipeGenerationContext {
  recipeId: Recipe; // Added to link generated tips back to a specific recipe
  name: string;
  originalServings: number;
  targetServings: number;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    scalingContext?: string;
  }[];
  cookingMethods: string[];
}

/**
 * @interface TipDoc
 * Represents the structure of a scaling tip document stored in MongoDB.
 * Corresponds to "A set of Tips" in the concept state.
 */
interface TipDoc {
  _id: Tip; // MongoDB's primary key for the tip
  text: string;
  cookingMethod: string; // e.g., "baking", "frying", "roasting"
  direction: "up" | "down"; // Whether the tip applies to scaling up or down
  source: "manual" | "generated"; // Origin of the tip
  relatedRecipeId?: Recipe; // Optional: Link to a specific recipe if generated for it
  addedBy?: Author; // Optional: User who manually added the tip
}

/**
 * @concept ScalingTips
 * @purpose To store, manage, and generate context-specific practical tips
 *          related to scaling recipes up or down, providing intelligent
 *          and user-contributed advice for better culinary outcomes.
 *
 * @principle If a user scales a specific recipe up or specifies a new number
 *            of servings, the system, using the full recipe context and an
 *            AI model, generates relevant scaling tips for that recipe's
 *            cooking methods, making them immediately available alongside
 *            manually contributed tips.
 */
export default class ScalingTipsConcept {
  tips: Collection<TipDoc>;

  /**
   * @param db The MongoDB database instance.
   * @param llmClient An instance of an LLM client (e.g., GeminiLLM or a mock)
   *                  that implements the ILLMClient interface.
   */
  constructor(private readonly db: Db, private readonly llmClient: ILLMClient) {
    this.tips = this.db.collection<TipDoc>(PREFIX + "tips");
    this.llmClient = llmClient;
  }

  /**
   * Action: Allows a user (or admin) to directly contribute a specific scaling tip.
   *
   * @param {Object} params - The parameters for adding a manual tip.
   * @param {string} params.cookingMethod - The cooking method the tip applies to.
   * @param {"up" | "down"} params.direction - The scaling direction ('up' or 'down').
   * @param {string} params.tipText - The actual text of the tip.
   * @param {Author} [params.addedBy] - Optional ID of the user who added the tip.
   * @returns {Promise<{tipId: Tip} | {error: string}>} The ID of the new tip on success, or an error.
   *
   * @requires direction is 'up' or 'down'.
   * @requires cookingMethod is not empty.
   * @requires tipText is not empty.
   * @effects Adds a new Tip record with 'source: manual' and the provided details.
   */
  async addManualScalingTip(
    { cookingMethod, direction, tipText, addedBy }: {
      cookingMethod: string;
      direction: "up" | "down";
      tipText: string;
      addedBy?: Author;
    },
  ): Promise<{ tipId: Tip } | { error: string }> {
    // Preconditions
    if (!["up", "down"].includes(direction)) {
      return { error: "Direction must be 'up' or 'down'." };
    }
    if (!cookingMethod.trim()) {
      return { error: "Cooking method cannot be empty." };
    }
    if (!tipText.trim()) {
      return { error: "Tip text cannot be empty." };
    }

    // Effect: Add a new tip record
    const tipId = freshID() as Tip;
    await this.tips.insertOne({
      _id: tipId,
      text: tipText,
      cookingMethod,
      direction,
      source: "manual",
      addedBy,
    });

    return { tipId };
  }

  /**
   * Action: Triggers the internal LLM mechanism to generate new scaling tips
   *         based on a detailed recipe context.
   *
   * @param {Object} params - The parameters for tip generation.
   * @param {RecipeGenerationContext} params.recipeContext - The full context of the recipe for the LLM.
   * @returns {Promise<{tipIds: Tip[]} | {error: string}>} The IDs of newly generated tips on success, or an error.
   *
   * @requires recipeContext is a valid object containing recipe details.
   * @requires recipeContext.targetServings must not equal recipeContext.originalServings.
   * @requires recipeContext.originalServings and targetServings must be greater than 0.
   * @effects Determines scaling direction from recipeContext. Calls an internal LLM
   *          to generate tips. Stores new tips with 'source: generated',
   *          'relatedRecipeId', and a 'generatedContextHash'.
   */
  async requestTipGeneration(
    { recipeContext }: { recipeContext: RecipeGenerationContext },
  ): Promise<{ tipIds: Tip[] } | { error: string }> {
    // Preconditions
    if (
      !recipeContext || !recipeContext.recipeId || !recipeContext.name ||
      recipeContext.originalServings === undefined ||
      recipeContext.targetServings === undefined ||
      !Array.isArray(recipeContext.ingredients) ||
      !Array.isArray(recipeContext.cookingMethods)
    ) {
      return {
        error:
          "Invalid or incomplete recipe context provided for tip generation.",
      };
    }
    if (
      recipeContext.originalServings <= 0 || recipeContext.targetServings <= 0
    ) {
      return { error: "Original and target servings must be greater than 0." };
    }
    if (recipeContext.targetServings === recipeContext.originalServings) {
      return {
        error:
          "Target servings must not be equal to original servings to generate scaling tips.",
      };
    }

    const scaleFactor = recipeContext.targetServings /
      recipeContext.originalServings;
    const direction: "up" | "down" = scaleFactor > 1 ? "up" : "down";
    const relatedRecipeId = recipeContext.recipeId;

    try {
      // Check if tips for this exact context have already been generated
      const existingGeneratedTips = await this.tips.find({
        source: "generated",
        relatedRecipeId,
      }).toArray();

      if (existingGeneratedTips.length > 0) {
        console.log(
          `[ScalingTipsConcept] Tips already generated for this context. Returning existing tip IDs.`,
        );
        return { tipIds: existingGeneratedTips.map((tip) => tip._id) };
      }

      console.log("💡 Requesting scaling tips from AI...");
      // The prompt to the LLM (you can refine this further if needed)
      const prompt = this.createTipGenerationPrompt(recipeContext, direction);
      const llmResponseText = await this.llmClient.executeLLM(prompt);

      console.log("✅ Received response from AI for tips!");
      console.log("\n💡 RAW AI TIPS RESPONSE");
      console.log("======================");
      console.log(llmResponseText);
      console.log("======================\n");

      // Sanitize and parse the LLM's response
      const sanitizedResponse = llmResponseText.replace(/```(?:json)?/g, "")
        .trim();
      const parsedResponse = JSON.parse(sanitizedResponse);
      const generatedTips: string[] = parsedResponse.tips;

      if (!Array.isArray(generatedTips) || generatedTips.length === 0) {
        return { error: "AI did not return a valid list of tips." };
      }

      const newTipIds: Tip[] = [];
      for (const tipText of generatedTips) {
        // For each generated tip, determine the cooking method (can be improved)
        // For simplicity, we'll associate each generated tip with all relevant methods
        // or a generic method, or the first method provided by LLM
        for (const method of recipeContext.cookingMethods) {
          const tipId = freshID() as Tip;
          await this.tips.insertOne({
            _id: tipId,
            text: tipText,
            cookingMethod: method, // Associate with one of the recipe's methods
            direction,
            source: "generated",
            relatedRecipeId,
          });
          newTipIds.push(tipId);
        }
      }

      return { tipIds: newTipIds };
    } catch (error) {
      console.error(
        "❌ Error generating scaling tips using AI:",
        (error as Error).message,
      );
      return { error: `AI tip generation failed: ${(error as Error).message}` };
    }
  }

  /**
   * Action: Removes an existing tip record.
   *
   * @param {Object} params - The parameters for removing a tip.
   * @param {Tip} params.tipId - The ID of the tip to remove.
   * @returns {Promise<Empty | {error: string}>} An empty object on success, or an error.
   *
   * @requires The tipId must exist.
   * @effects The specified Tip document is deleted from the 'tips' collection.
   */
  async removeScalingTip(
    { tipId }: { tipId: Tip },
  ): Promise<Empty | { error: string }> {
    // Precondition: The tip with tipId must exist (implied by checking deletion count)
    const result = await this.tips.deleteOne({ _id: tipId });
    if (result.deletedCount === 0) {
      return { error: `Tip with ID ${tipId} not found.` };
    }
    return {}; // Success
  }

  /**
   * Private method: Creates the prompt for the LLM to generate tips.
   */
  private createTipGenerationPrompt(
    context: RecipeGenerationContext,
    direction: "up" | "down",
  ): string {
    return `
        You are an expert culinary assistant specializing in recipe scaling.
        Given a recipe's full context, your task is to generate practical, concise, and intelligent tips for scaling its ingredients ${direction} for cooking.

        Recipe Name: ${context.name}
        Original Servings: ${context.originalServings}
        Target Servings: ${context.targetServings}
        Scaling Direction: ${direction}

        Ingredients:
        ${
      context.ingredients.map((ing) =>
        `- ${ing.name}: ${ing.quantity} ${ing.unit} (Context: ${
          ing.scalingContext || "None"
        })`
      ).join("\n")
    }

        Cooking Methods: ${context.cookingMethods.join(", ")}

        CRITICAL REQUIREMENTS:
        - Generate 3-5 distinct tips.
        - Each tip should be a short, actionable sentence.
        - Tips should be relevant to the scaling direction (${direction}).
        - Consider the cooking methods and ingredient types.
        - Avoid generic cooking advice; focus on scaling-specific challenges.
        - Return ONLY a JSON object with a single key "tips" which contains an array of strings.

        Example Output Structure:
        {
          "tips": [
            "Tip 1 text here.",
            "Tip 2 text here."
          ]
        }

        Return ONLY the JSON object, no additional text, explanation, or markdown formatting outside the JSON.
        `;
  }

  // --- Queries (start with an underscore '_') ---

  /**
   * Query: Retrieves all scaling tips matching the given criteria.
   *
   * @param {Object} params - The query parameters.
   * @param {string} params.cookingMethod - The cooking method to filter by.
   * @param {"up" | "down"} params.direction - The scaling direction to filter by.
   * @param {Recipe} [params.relatedRecipeId] - Optional recipe ID to filter generated tips.
   * @returns {Promise<TipDoc[]>} An array of matching tip documents.
   */
  async _getScalingTips(
    { cookingMethod, direction, relatedRecipeId }: {
      cookingMethod: string;
      direction: "up" | "down";
      relatedRecipeId?: Recipe;
    },
  ): Promise<TipDoc[]> {
    const query: any = { cookingMethod, direction };
    if (relatedRecipeId) {
      query.$or = [
        { relatedRecipeId }, // Tips specifically for this recipe
        { relatedRecipeId: { $exists: false } }, // General tips not tied to a specific recipe
      ];
    }
    return await this.tips.find(query).toArray();
  }
}
````

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { generate as generateUuidV4 } from "jsr:@std/uuid/unstable-v7"; // Using uuid-v7 for session IDs

// Collection prefix to ensure namespace separation in MongoDB
const PREFIX = "UserAuthentication" + ".";

// Generic type for User (external reference)
type User = ID;
// Internal ID type for a session document (distinct from the sessionId string itself)
type SessionDocId = ID;

/**
 * @interface UserDoc
 * Represents the structure of a user document stored in MongoDB.
 * Corresponds to "a set of Users" in the concept state.
 */
interface UserDoc {
  _id: User; // Unique ID for the user
  username: string;
  hashedPassword: string; // Storing hashed password for security
}

/**
 * @interface SessionDoc
 * Represents the structure of an active session document stored in MongoDB.
 * Corresponds to "a set of Sessions" in the concept state.
 */
interface SessionDoc {
  _id: SessionDocId; // Unique ID for the session document itself (internal)
  user: User; // Reference to the User ID
  sessionId: string; // The actual session token string passed to the client
  expirationTime: number; // Unix timestamp for when the session expires
}

/**
 * Helper function to hash a password using Deno's crypto.subtle.
 * In a real app, use a robust library like bcrypt for password hashing.
 */
async function hashPassword(password: string): Promise<string> {
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedPassword = hashArray.map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashedPassword;
}

/**
 * Helper function to compare a plain password with a hashed password.
 */
async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(plainPassword);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const newHashedPassword = hashArray.map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  return newHashedPassword === hashedPassword;
}

/**
 * @concept UserAuthentication
 * @purpose To provide secure mechanisms for users to register, log in, and log out of the application,
 *          establishing their identity.
 *
 * @principle A user registers with a unique username and password. The user subsequently logs in with
 *            those credentials, and they will be recognized as an authenticated user, which enables
 *            them to access personalized features.
 */
export default class UserAuthenticationConcept {
  users: Collection<UserDoc>;
  sessions: Collection<SessionDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection<UserDoc>(PREFIX + "users");
    this.sessions = this.db.collection<SessionDoc>(PREFIX + "sessions");
  }

  /**
   * Action: Registers a new user with a unique username and password.
   *
   * @param {Object} params - The parameters for registration.
   * @param {string} params.username - The desired username.
   * @param {string} params.password - The user's chosen password.
   * @returns {Promise<{user: User} | {error: string}>} The ID of the newly registered user on success, or an error.
   *
   * @requires username must be unique.
   * @requires password must meet complexity requirements (e.g., min 8 chars).
   * @effects Creates a new User document with the given details and a hashed password.
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Precondition: Username must be unique
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `Username '${username}' already exists.` };
    }

    // Precondition: Password complexity (example: min 8 characters)
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters long." };
    }

    // Effect: Create a new user
    const userId = freshID() as User;
    const hashedPassword = await hashPassword(password);

    await this.users.insertOne({ _id: userId, username, hashedPassword });

    return { user: userId };
  }

  /**
   * Action: Logs in a user with their username and password.
   *
   * @param {Object} params - The parameters for login.
   * @param {string} params.username - The user's username.
   * @param {string} params.password - The user's password.
   * @returns {Promise<{user: User, sessionId: string} | {error: string}>} The user's ID and a new session ID on success, or an error.
   *
   * @requires username and password must match an existing user.
   * @effects Creates an active Session for the user with a unique sessionId and an expirationTime.
   */
  async login(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User; sessionId: string } | { error: string }> {
    // Find the user by username
    const userDoc = await this.users.findOne({ username });
    if (!userDoc) {
      return { error: "Invalid username or password." };
    }

    // Compare provided password with stored hashed password
    const passwordMatches = await comparePassword(
      password,
      userDoc.hashedPassword,
    );
    if (!passwordMatches) {
      return { error: "Invalid username or password." };
    }

    // Effect: Create a new active session
    const sessionId = generateUuidV4(); // Generate a UUID for the session token
    const expirationTime = Date.now() + (1000 * 60 * 60); // Session expires in 1 hour (example)

    const sessionDocId = freshID() as SessionDocId;
    await this.sessions.insertOne({
      _id: sessionDocId,
      user: userDoc._id,
      sessionId,
      expirationTime,
    });

    return { user: userDoc._id, sessionId };
  }

  /**
   * Action: Logs out a user by invalidating their session.
   *
   * @param {Object} params - The parameters for logout.
   * @param {string} params.sessionId - The session ID to invalidate.
   * @returns {Promise<Empty | {error: string}>} An empty object on success, or an error.
   *
   * @requires sessionId must correspond to an active session.
   * @effects Deletes the active Session record.
   */
  async logout(
    { sessionId }: { sessionId: string },
  ): Promise<Empty | { error: string }> {
    // Effect: Delete the active session
    const result = await this.sessions.deleteOne({ sessionId });

    if (result.deletedCount === 0) {
      return { error: "Session not found or already expired." };
    }

    return {};
  }

  /**
   * Query: Retrieves an active session by its session ID.
   * Useful for internal checks in syncs or middleware.
   * @param {Object} params - The query parameters.
   * @param {string} params.sessionId - The session ID to look up.
   * @returns {Promise<SessionDoc | null>} The active session document if found and not expired, otherwise null.
   */
  async _getActiveSession(
    { sessionId }: { sessionId: string },
  ): Promise<SessionDoc | null> {
    const session = await this.sessions.findOne({ sessionId });
    if (session && session.expirationTime > Date.now()) {
      return session;
    }
    // If found but expired, or not found, return null.
    // Optionally, you might want to delete expired sessions here.
    return null;
  }

  /**
   * Query: Finds a user by their username.
   * @param {Object} params - The query parameters.
   * @param {string} params.username - The username to search for.
   * @returns {Promise<UserDoc | null>} The user document if found, otherwise null.
   */
  async _getUserByUsername(
    { username }: { username: string },
  ): Promise<UserDoc | null> {
    return await this.users.findOne({ username });
  }

  /**
   * Query: Finds a user by their User ID.
   * @param {Object} params - The query parameters.
   * @param {User} params.userId - The user ID to search for.
   * @returns {Promise<UserDoc | null>} The user document if found, otherwise null.
   */
  async _getUserById({ userId }: { userId: User }): Promise<UserDoc | null> {
    return await this.users.findOne({ _id: userId });
  }
}
```
