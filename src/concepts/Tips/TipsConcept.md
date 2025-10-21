```typescript
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
```