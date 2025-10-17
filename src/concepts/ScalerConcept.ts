import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import RecipeConcept from "./RecipeConcept.ts"; // Dependency on RecipeConcept
import { GeminiLLM } from "../../gemini-llm.ts"; // Import the specific Gemini LLM client

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
 * for the purpose of LLM prompting, similar to the original 'Recipe' interface
 * you provided in your 'scaler_original' code, but adapted for concept design types.
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
  generatedAt: Date; // Timestamp of when this scaled recipe was generated
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
  private geminiLLM: GeminiLLM; // Specific dependency on GeminiLLM

  /**
   * @param db The MongoDB database instance.
   * @param recipeConceptInstance An instance of the RecipeConcept for querying base recipe data.
   * @param geminiApiKey The API key required to authenticate with the Gemini LLM service.
   */
  constructor(
    private readonly db: Db,
    recipeConceptInstance: RecipeConcept,
    geminiApiKey: string,
  ) {
    this.scaledRecipes = this.db.collection<ScaledRecipeDoc>(
      PREFIX + "scaledRecipes",
    );
    this.recipeConcept = recipeConceptInstance;
    // Instantiate GeminiLLM directly within the concept constructor
    this.geminiLLM = new GeminiLLM(geminiApiKey);
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
    let scaledRecipeDoc = await this.scaledRecipes.findOne({
      baseRecipeId,
      targetServings,
      scalingMethod: "manual",
    });
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
        generatedAt: new Date(),
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
      console.log("🤖 Requesting scaled recipe from Gemini AI...");

      // Prepare recipe context for the LLM, similar to your original structure
      // Note: your original `Recipe` interface had `scaleFactor`, here we pass `originalServings` and `targetServings`
      // for the LLM to deduce the factor and apply intelligent logic.
      const recipeContext: RecipeDocContext = {
        name: baseRecipe.name,
        originalServings: baseRecipe.originalServings,
        targetServings: targetServings,
        ingredients: baseRecipe.ingredients,
        cookingMethods: baseRecipe.cookingMethods,
      };

      const prompt = this.createScalePrompt(recipeContext);
      const response = await this.geminiLLM.executeLLM(prompt); // Use the GeminiLLM instance

      console.log("✅ Received response from Gemini AI!");
      console.log("\n🤖 RAW GEMINI RESPONSE");
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
      let scaledRecipeDoc = await this.scaledRecipes.findOne({
        baseRecipeId,
        targetServings,
        scalingMethod: "ai",
      });
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
          generatedAt: new Date(),
          // userId: (/* obtain current user ID from a Session concept if needed */)
        });
      }

      return { scaledRecipeId };
    } catch (error) {
      console.error(
        "❌ Error scaling recipe using Gemini AI:",
        (error as Error).message,
      );
      return { error: `Gemini AI scaling failed: ${(error as Error).message}` };
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
