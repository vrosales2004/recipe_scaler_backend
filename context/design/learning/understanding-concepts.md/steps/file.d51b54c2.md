---
timestamp: 'Thu Oct 16 2025 23:47:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_234725.cefbd4c7.md]]'
content_id: d51b54c22c963d3ae2cf44a4c89616f88f613ac414f4e74bb12754791dd56119
---

# file: src/scalingtips/ScalingTipsConcept.ts

````typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { ILLMClient } from "../recipescaler/geminiLLMClient.ts"; // Re-use the LLM client interface

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
  ingredients: { name: string; quantity: number; unit: string; scalingContext?: string; }[];
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
  generatedContextHash?: string; // Optional: Hash of the context used for generation (to prevent duplicates)
  addedBy?: Author; // Optional: User who manually added the tip
  dateAdded: Date;
}

/**
 * Mock LLM interaction function for tip generation.
 * In a real application, this would involve API calls to an actual LLM service.
 */
const mockLLMTipGeneration = (context: RecipeGenerationContext): string[] => {
  console.log(`[Mock LLM Tip Gen] Generating tips for recipe: '${context.name}'`);
  console.log(`[Mock LLM Tip Gen] Context received:`, context);

  const scaleFactor = context.targetServings / context.originalServings;
  const direction = scaleFactor > 1 ? "up" : "down";

  const generatedTips: string[] = [];

  for (const method of context.cookingMethods) {
    if (direction === "up") {
      generatedTips.push(
        `When scaling up for ${method}, consider if your pan or oven space is sufficient for the increased volume.`,
      );
      if (method.toLowerCase().includes("baking")) {
        generatedTips.push(
          `For baking, larger quantities might require longer cooking times or even splitting into multiple batches.`,
        );
      }
    } else { // direction === "down"
      generatedTips.push(
        `When scaling down for ${method}, be careful not to overcook, as smaller portions cook faster.`,
      );
      if (method.toLowerCase().includes("sauce")) {
        generatedTips.push(
          `For sauces, reducing quantities might change consistency. Taste and adjust seasonings carefully.`,
        );
      }
    }
  }

  // Add a generic tip
  generatedTips.push(
    `Always trust your instincts and adjust seasonings to taste after scaling, regardless of direction.`,
  );

  console.log(`[Mock LLM Tip Gen] Generated tips:`, generatedTips);
  return generatedTips;
};

/**
 * Utility function to create a hash from the recipe context.
 * Used to avoid regenerating identical tips for the same context.
 */
async function getContextHash(context: RecipeGenerationContext): Promise<string> {
  const data = JSON.stringify(context);
  const textEncoder = new TextEncoder();
  const dataBuffer = textEncoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
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
  private llmClient: ILLMClient; // Dependency on LLM Client

  /**
   * @param db The MongoDB database instance.
   * @param llmClient An instance of an LLM client (e.g., GeminiLLM or a mock)
   *                  that implements the ILLMClient interface.
   */
  constructor(private readonly db: Db, llmClient: ILLMClient) {
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
    { cookingMethod, direction, tipText, addedBy }: { cookingMethod: string; direction: "up" | "down"; tipText: string; addedBy?: Author },
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
      dateAdded: new Date(),
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
    if (!recipeContext || !recipeContext.recipeId || !recipeContext.name ||
        recipeContext.originalServings === undefined || recipeContext.targetServings === undefined ||
        !Array.isArray(recipeContext.ingredients) || !Array.isArray(recipeContext.cookingMethods)) {
      return { error: "Invalid or incomplete recipe context provided for tip generation." };
    }
    if (recipeContext.originalServings <= 0 || recipeContext.targetServings <= 0) {
        return { error: "Original and target servings must be greater than 0." };
    }
    if (recipeContext.targetServings === recipeContext.originalServings) {
      return { error: "Target servings must not be equal to original servings to generate scaling tips." };
    }

    const scaleFactor = recipeContext.targetServings / recipeContext.originalServings;
    const direction: "up" | "down" = scaleFactor > 1 ? "up" : "down";
    const relatedRecipeId = recipeContext.recipeId;

    try {
      // 1. Generate a hash of the context to prevent duplicate generated tips for the same context
      const generatedContextHash = await getContextHash(recipeContext);

      // Check if tips for this exact context have already been generated
      const existingGeneratedTips = await this.tips.find({
        source: 'generated',
        relatedRecipeId,
        generatedContextHash
      }).toArray();

      if (existingGeneratedTips.length > 0) {
        console.log(`[ScalingTipsConcept] Tips already generated for this context. Returning existing tip IDs.`);
        return { tipIds: existingGeneratedTips.map(tip => tip._id) };
      }

      console.log('💡 Requesting scaling tips from AI...');
      // The prompt to the LLM (you can refine this further if needed)
      const prompt = this.createTipGenerationPrompt(recipeContext, direction);
      const llmResponseText = await this.llmClient.executeLLM(prompt);

      console.log('✅ Received response from AI for tips!');
      console.log('\n💡 RAW AI TIPS RESPONSE');
      console.log('======================');
      console.log(llmResponseText);
      console.log('======================\n');

      // Sanitize and parse the LLM's response
      const sanitizedResponse = llmResponseText.replace(/```(?:json)?/g, '').trim();
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
                generatedContextHash,
                dateAdded: new Date(),
            });
            newTipIds.push(tipId);
        }
      }

      return { tipIds: newTipIds };
    } catch (error) {
      console.error('❌ Error generating scaling tips using AI:', (error as Error).message);
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
  async removeScalingTip({ tipId }: { tipId: Tip }): Promise<Empty | { error: string }> {
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
  private createTipGenerationPrompt(context: RecipeGenerationContext, direction: "up" | "down"): string {
    return `
        You are an expert culinary assistant specializing in recipe scaling.
        Given a recipe's full context, your task is to generate practical, concise, and intelligent tips for scaling its ingredients ${direction} for cooking.

        Recipe Name: ${context.name}
        Original Servings: ${context.originalServings}
        Target Servings: ${context.targetServings}
        Scaling Direction: ${direction}

        Ingredients:
        ${context.ingredients.map(ing => `- ${ing.name}: ${ing.quantity} ${ing.unit} (Context: ${ing.scalingContext || 'None'})`).join('\n')}

        Cooking Methods: ${context.cookingMethods.join(', ')}

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
    { cookingMethod, direction, relatedRecipeId }: { cookingMethod: string; direction: "up" | "down"; relatedRecipeId?: Recipe },
  ): Promise<TipDoc[]> {
    const query: any = { cookingMethod, direction };
    if (relatedRecipeId) {
      query.$or = [
        { relatedRecipeId }, // Tips specifically for this recipe
        { relatedRecipeId: { $exists: false } } // General tips not tied to a specific recipe
      ];
    }
    return await this.tips.find(query).toArray();
  }

  /**
   * Query: Retrieves a single random scaling tip matching the given criteria.
   *
   * @param {Object} params - The query parameters.
   * @param {string} params.cookingMethod - The cooking method to filter by.
   * @param {"up" | "down"} params.direction - The scaling direction to filter by.
   * @param {Recipe} [params.relatedRecipeId] - Optional recipe ID to filter generated tips.
   * @returns {Promise<TipDoc | null>} A random matching tip document, or null if none found.
   */
  async _getRandomScalingTip(
    { cookingMethod, direction, relatedRecipeId }: { cookingMethod: string; direction: "up" | "down"; relatedRecipeId?: Recipe },
  ): Promise<TipDoc | null> {
    const query: any = { cookingMethod, direction };
    if (relatedRecipeId) {
        query.$or = [
            { relatedRecipeId },
            { relatedRecipeId: { $exists: false } }
        ];
    }

    const tips = await this.tips.aggregate<TipDoc>([
      { $match: query },
      { $sample: { size: 1 } }
    ]).toArray();

    return tips.length > 0 ? tips[0] : null;
  }
}
````

### How `ScalingTips` Interacts with Other Concepts (via Syncs)

Now that you have the `ScalingTips` concept, here's how you'd compose it with your `Recipe` and `RecipeScaler` concepts using synchronizations.

**1. Define `RecipeGenerationContext` for consistency:**
Since `ScalingTips.requestTipGeneration` expects `RecipeGenerationContext`, and `RecipeScaler` has the necessary data, you'd likely define this interface in a shared utility file or directly within the `ScalingTips` concept if it's its primary user. For the sync, we'll construct it directly.

```typescript
// Example of RecipeGenerationContext (for sync)
interface RecipeGenerationContext {
  recipeId: ID;
  name: string;
  originalServings: number;
  targetServings: number;
  ingredients: { name: string; quantity: number; unit: string; scalingContext?: string; }[];
  cookingMethods: string[];
}
```

**2. Sync to Trigger Tip Generation when a Recipe is AI-Scaled:**

This sync would live *outside* the concepts, in your application's sync definition layer.

```
sync GenerateTipsOnAIScaling
when
    RecipeScaler.scaleRecipeAI (scaledRecipeId: ScaledRecipe, baseRecipeId: Recipe, targetServings: Number)
where
    // Retrieve the base recipe details from the Recipe concept
    in Recipe:
        name of baseRecipeId is rName
        originalServings of baseRecipeId is oServings
        ingredients of baseRecipeId is ingrList
        cookingMethods of baseRecipeId is cMethods
    // Also get the target servings from the RecipeScaler's state if it's not already in the 'when' clause
    // (Here, targetServings is already an argument of scaleRecipeAI, so we can use it directly)
then
    ScalingTips.requestTipGeneration (
        recipeContext: {
            recipeId: baseRecipeId,
            name: rName,
            originalServings: oServings,
            targetServings: targetServings,
            ingredients: ingrList,
            cookingMethods: cMethods
        }
    )
```

**Explanation of the Sync:**

* **`when RecipeScaler.scaleRecipeAI(...)`**: This means whenever the `scaleRecipeAI` action is successfully executed in the `RecipeScaler` concept, this sync will evaluate.
* **`where in Recipe:`**: This clause *queries the state* of your `Recipe` concept. It uses the `baseRecipeId` from the `scaleRecipeAI` action to fetch the `name`, `originalServings`, `ingredients`, and `cookingMethods` of the original recipe. This is how `ScalingTips` gets the rich context without directly importing or knowing about `RecipeConcept`.
* **`then ScalingTips.requestTipGeneration(...)`**: If the `when` and `where` conditions are met, the `requestTipGeneration` action of the `ScalingTips` concept is triggered. It receives a `recipeContext` object constructed from the data gathered in the `where` clause.

This setup demonstrates:

* **Concept Independence**: Each concept (Recipe, RecipeScaler, ScalingTips) is focused on its own concern and does not directly call methods of other concepts.
* **Completeness of Functionality**: `ScalingTips` completely handles tip generation and storage. `RecipeScaler` completely handles scaling.
* **Composition by Synchronization**: The `sync` orchestrates the interaction, passing necessary data between concepts to achieve higher-level functionality (AI-scaled recipe triggers AI tip generation).

You would instantiate these concepts and the LLM client in your main application entry point (e.g., `main.ts` or `app.ts`):

```typescript
// Example application entry point (e.g., app.ts)
import { getDb } from "@utils/database.ts";
import RecipeConcept from "./recipe/RecipeConcept.ts";
import RecipeScalerConcept from "./recipescaler/RecipeScalerConcept.ts";
import ScalingTipsConcept from "./scalingtips/ScalingTipsConcept.ts";
import { GeminiLLM } from "./recipescaler/geminiLLMClient.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts"; // For environment variables

async function startApp() {
  // Load environment variables (e.g., GEMINI_API_KEY, MONGODB_URI)
  config({ export: true, allowEmptyValues: true });
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    console.error("GEMINI_API_KEY environment variable not set.");
    Deno.exit(1);
  }

  const [db, client] = await getDb();

  // Instantiate LLM Client
  const geminiLLMClient = new GeminiLLM(geminiApiKey);

  // Instantiate concepts
  const recipeConcept = new RecipeConcept(db);
  const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, geminiLLMClient);
  const scalingTipsConcept = new ScalingTipsConcept(db, geminiLLMClient);

  // Now you can use the concepts and define your syncs (conceptually, in code this might be event listeners)
  console.log("Concepts initialized and ready!");

  // Example usage (simulating a request)
  // const authorId = "user-123" as ID;
  // const newRecipeResult = await recipeConcept.addRecipe(...);
  // if (newRecipeResult.recipe) {
  //   const scaledResult = await recipeScalerConcept.scaleRecipeAI({ baseRecipeId: newRecipeResult.recipe, targetServings: 8 });
  //   if (scaledResult.scaledRecipeId) {
  //     // In a real app, a sync would trigger, calling ScalingTips.requestTipGeneration
  //     // For demonstration, manually calling the trigger with gathered context
  //     const baseRecipe = await recipeConcept._getRecipeById({ recipeId: newRecipeResult.recipe });
  //     if (baseRecipe) {
  //         const tipsResult = await scalingTipsConcept.requestTipGeneration({
  //             recipeId: baseRecipe._id,
  //             name: baseRecipe.name,
  //             originalServings: baseRecipe.originalServings,
  //             targetServings: 8, // The target from the scaling action
  //             ingredients: baseRecipe.ingredients,
  //             cookingMethods: baseRecipe.cookingMethods
  //         });
  //         if (tipsResult.tipIds) {
  //             console.log("Generated tip IDs:", tipsResult.tipIds);
  //         }
  //     }
  //   }
  // }

  // Don't forget to close the DB connection when the app shuts down
  // Deno.addSignalListener("SIGINT", () => client.close());
  // Deno.addSignalListener("SIGTERM", () => client.close());
}

startApp();
```
