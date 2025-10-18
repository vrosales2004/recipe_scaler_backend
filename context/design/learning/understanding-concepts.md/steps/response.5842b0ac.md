---
timestamp: 'Fri Oct 17 2025 20:11:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_201117.5737efb9.md]]'
content_id: 5842b0acbd86bc104d5d2217ae27be32fbdea2cedaad52bd663066866eb4e3cb
---

# response:

You're encountering a common issue when migrating code from one JavaScript environment (like Node.js with CommonJS modules) to another (like Deno with ES Modules). The specific problem is that `ILLMClient` and `Config` are not being properly defined and imported in your Deno environment based on your `gemini-llm.ts` file.

Let's break down why and then provide the correct solution.

### The Problem: `ILLMClient` and `Config` Definition Mismatch

1. **`require` is Node.js-specific:** Your original `gemini-llm.ts` used `require('./config.json')`. Deno doesn't support `require`. This is why `loadConfig` was problematic.
2. **`Config` was implicitly handled:** In your original Node.js setup, `Config` might have been implicitly loaded or defined locally. In Deno, every `import`/`export` needs a clear path.
3. **`ILLMClient` wasn't in your `gemini-llm.ts`:** In my previous responses, I implicitly assumed `ILLMClient` was either a global type or defined within the `geminiLLMClient.ts` file I was creating. However, your provided `gemini-llm.ts` *does not* define `ILLMClient`. For `GeminiLLM` to *implement* `ILLMClient`, the interface needs to exist *in the same file or a file imported by it*.

### The Solution: Define `ILLMClient` and `Config` within `src/recipescaler/geminiLLMClient.ts` (your `gemini-llm.ts` file)

To make everything work correctly, we need to:

1. **Add `ILLMClient` interface** to your `src/recipescaler/geminiLLMClient.ts` file.
2. **Modify `GeminiLLM` to explicitly `implement ILLMClient`**.
3. **Keep `Config` interface** in `src/recipescaler/geminiLLMClient.ts` as you had it.
4. **Update the `GoogleGenerativeAI` import path** to be Deno-compatible (`npm:` specifier).
5. **Adjust the `getLLMClient` helper function in the test file** to correctly import `ILLMClient`, `Config`, and `GeminiLLM` from the updated `src/recipescaler/geminiLLMClient.ts`, and to instantiate `GeminiLLM` using the `Config` object as its constructor expects.

***

### Step 1: Update `src/recipescaler/geminiLLMClient.ts`

This is your `gemini-llm.ts` file, renamed for consistency with our previous conversation as `geminiLLMClient.ts` and updated to define `ILLMClient` and implement it.

**Reasoning for changes:**

* `ILLMClient` is now explicitly defined as an `export interface`.
* `GeminiLLM` now `implements ILLMClient`, ensuring it adheres to the contract.
* The import for `GoogleGenerativeAI` uses the `npm:` specifier for Deno compatibility.
* The `model` in `getGenerativeModel` now matches your provided `gemini-2.5-flash-lite`.

```typescript
// file: src/recipescaler/geminiLLMClient.ts
import { GoogleGenerativeAI, GenerativeModel } from "npm:@google/generative-ai"; // Deno-compatible import

/**
 * Interface for any Large Language Model (LLM) client.
 * This ensures consistency and allows for dependency injection.
 * Other LLM implementations (e.g., OpenAI, custom mocks) would implement this.
 */
export interface ILLMClient {
  /**
   * Executes a given text prompt against the LLM and returns its generated text response.
   * @param prompt The text prompt to send to the LLM.
   * @returns A promise that resolves to the LLM's text response.
   */
  executeLLM(prompt: string): Promise<string>;
}

/**
 * Configuration for API access (as per your original structure)
 */
export interface Config {
  apiKey: string;
}

/**
 * Encapsulates the interaction with the Google Gemini LLM API.
 * This class handles API key configuration and making requests to the model,
 * implementing the ILLMClient interface.
 */
export class GeminiLLM implements ILLMClient { // <-- GeminiLLM now implements ILLMClient
  private model: GenerativeModel;

  /**
   * Constructs a new GeminiLLM client.
   * @param config Configuration object containing the API key.
   *               This matches your original constructor signature.
   */
  constructor(config: Config) {
    if (!config || !config.apiKey) {
      throw new Error("Gemini API key is required within the config object to initialize the LLM client.");
    }
    const genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite", // Using your specified model
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });
  }

  /**
   * Executes a prompt against the configured Gemini LLM and returns the generated text.
   * @param prompt The text prompt to send to the LLM.
   * @returns A promise that resolves to the LLM's text response.
   * @throws An error if communication with the Gemini API fails.
   */
  async executeLLM(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('❌ Error communicating with Gemini LLM:', error);
      throw new Error(`Failed to get response from Gemini LLM: ${(error as Error).message}`);
    }
  }
}
```

***

### Step 2: Update `src/recipescaler/RecipeScalerConcept.test.ts`

Now that `ILLMClient` and `Config` are defined and exported from `geminiLLMClient.ts`, we can correctly import them and instantiate `GeminiLLM` in your test file. The `getLLMClient` helper function will be updated to reflect this.

**Reasoning for changes:**

* The import for `ILLMClient` and `Config` now correctly points to `./geminiLLMClient.ts`.
* The `getLLMClient` function now correctly creates a `Config` object and passes it to the `GeminiLLM` constructor.
* The mock LLM client also explicitly implements `ILLMClient` for type safety.

```typescript
// file: src/recipescaler/RecipeScalerConcept.test.ts
import { assertEquals, assertExists, assertNotEquals, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Utility for test database setup
import { ID } from "@utils/types.ts"; // Generic ID type
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts"; // For environment variables

// Import the concepts and LLM client
import RecipeConcept from "../recipe/RecipeConcept.ts";
import RecipeScalerConcept from "./RecipeScalerConcept.ts";
// <-- Corrected import path and included Config
import { GeminiLLM, ILLMClient, Config } from "./geminiLLMClient.ts"; 

// Define generic ID types for consistency
type Author = ID;
type Recipe = ID;
type ScaledRecipe = ID;

// Define test author IDs
const authorAlice = "user:Alice" as Author;

// Mock IngredientData for testing various scaling behaviors
const mockIngredientsForScaling = [
  { name: "Flour", quantity: 200, unit: "g", scalingContext: "standard dry" },
  { name: "Sugar", quantity: 100, unit: "g", scalingContext: "standard dry" },
  { name: "Eggs", quantity: 2, unit: "large", scalingContext: "discrete item, rounds up" }, // Expect rounding up
  { name: "Salt", quantity: 0.5, unit: "tsp", scalingContext: "to taste, delicate, scale less than linear" }, // Expect less than linear scaling
  { name: "Garlic Cloves", quantity: 3, unit: "cloves", scalingContext: "flavor, discrete, scales roughly linear but rounded" }, // Expect rounding
  { name: "Water", quantity: 250, unit: "ml", scalingContext: "standard liquid" },
  { name: "Chili Powder", quantity: 2, unit: "tbsp", scalingContext: "strong spice, scale less than linear" }, // Expect less than linear
];

const mockCookingMethods = [
  "Mix dry ingredients",
  "Add wet ingredients",
  "Bake at 180C for 25 minutes",
];

// Helper function to get LLM client - will get API key from .env or return a mock
function getLLMClient(): ILLMClient {
  // Load environment variables for the API key. This will run for each test
  // due to the self-contained Deno.test blocks.
  config({ export: true, allowEmptyValues: true }); 
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  if (!geminiApiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set. Using a MockLLMClient for AI scaling tests.");
    return { // Fallback Mock LLM Client implementing ILLMClient
      executeLLM: async (prompt: string): Promise<string> => {
        console.log("[Mock LLM] Processing prompt...");
        const recipeMatch = prompt.match(/Here is the recipe to scale:\n(.*?)\nReturn your response as a JSON object/s);
        let originalRecipeData: any;
        if (recipeMatch && recipeMatch[1]) {
          try {
            originalRecipeData = JSON.parse(recipeMatch[1]);
          } catch (e) {
            console.error("[Mock LLM] Error parsing recipe from prompt:", e);
          }
        }
        if (originalRecipeData) {
          const { name, originalServings, targetServings, ingredients } = originalRecipeData;
          const scaleFactor = targetServings / originalServings;
          const scaled = ingredients.map((ing: any) => {
            let scaledQuantity = ing.quantity * scaleFactor;

            if (ing.scalingContext?.toLowerCase().includes("taste") || ing.scalingContext?.toLowerCase().includes("less than linear")) {
              scaledQuantity = ing.quantity * Math.sqrt(scaleFactor);
              if (scaledQuantity < ing.quantity && scaledQuantity < 0.25) scaledQuantity = 0.25;
              if (scaledQuantity > ing.quantity * 2) scaledQuantity = ing.quantity * 2;
            } else if (ing.scalingContext?.toLowerCase().includes("discrete item, rounds up")) {
              scaledQuantity = Math.ceil(scaledQuantity);
            } else if (ing.scalingContext?.toLowerCase().includes("discrete")) {
                scaledQuantity = Math.round(scaledQuantity);
            } else {
              scaledQuantity = parseFloat(scaledQuantity.toFixed(2));
            }
            scaledQuantity = Math.max(0, scaledQuantity);
            return {
              name: ing.name,
              quantity: scaledQuantity,
              unit: ing.unit,
              scalingContext: ing.scalingContext,
            };
          });
          return JSON.stringify({ name, ingredients: scaled });
        }
        return JSON.stringify({ name: "Mock Scaled Recipe", ingredients: [] });
      },
    };
  } else {
    // Instantiate GeminiLLM with the Config object as required by its constructor
    const geminiConfig: Config = { apiKey: geminiApiKey };
    return new GeminiLLM(geminiConfig);
  }
}

// --- Principle Trace Test ---
Deno.test({
  name: "Principle: Recipe selected, scaled by AI, and retrieved later",
  permissions: { env: true, net: true }, // Needed for LLM and DB
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient(); // Get LLM client for this test
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);

    try {
      // 1. Author adds a recipe (dependency for scaler)
      const addRecipeResult = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Chocolate Cake",
        originalServings: 8,
        ingredients: mockIngredientsForScaling,
        cookingMethods: mockCookingMethods,
      });
      assertNotEquals("error" in addRecipeResult, true, `Failed to add base recipe: ${(addRecipeResult as { error: string }).error}`);
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };
      assertExists(baseRecipeId, "Base recipe ID should be returned.");

      // 2. User scales the recipe using AI to a new number of servings (e.g., up to 16)
      const targetServings = 16;
      const scaleAIResult = await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings });
      assertNotEquals("error" in scaleAIResult, true, `AI scaling failed: ${(scaleAIResult as { error: string }).error}`);
      const { scaledRecipeId } = scaleAIResult as { scaledRecipeId: ScaledRecipe };
      assertExists(scaledRecipeId, "Scaled recipe ID should be returned.");

      // 3. The scaled number of ingredients is stored and can be accessed by the user later
      const fetchedScaledRecipe = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId });
      assertNotEquals("error" in fetchedScaledRecipe, true, `Failed to fetch scaled recipe: ${(fetchedScaledRecipe as { error: string }).error}`);
      assertExists(fetchedScaledRecipe, "Scaled recipe should be retrievable by its ID.");
      assertEquals((fetchedScaledRecipe as { _id: ScaledRecipe })._id, scaledRecipeId);
      assertEquals((fetchedScaledRecipe as { baseRecipeId: Recipe }).baseRecipeId, baseRecipeId);
      assertEquals((fetchedScaledRecipe as { targetServings: number }).targetServings, targetServings);
      assertEquals((fetchedScaledRecipe as { scalingMethod: string }).scalingMethod, "ai");
      assert((fetchedScaledRecipe as { scaledIngredients: unknown[] }).scaledIngredients.length > 0, "Scaled ingredients list should not be empty.");

      // Further checks on intelligent scaling based on mock LLM logic
      const scaledIngredients = (fetchedScaledRecipe as { scaledIngredients: typeof mockIngredientsForScaling }).scaledIngredients;
      const originalServings = 8;
      const linearScaleFactor = targetServings / originalServings; // 16/8 = 2

      // "Eggs" (discrete item, rounds up)
      const originalEggs = mockIngredientsForScaling.find(i => i.name === "Eggs")!;
      const scaledEggs = scaledIngredients.find(i => i.name === "Eggs")!;
      const expectedEggs = Math.ceil(originalEggs.quantity * linearScaleFactor); // ceil(2 * 2) = 4
      assertEquals(scaledEggs.quantity, expectedEggs,
             `AI scaled Eggs quantity (${scaledEggs.quantity}) should be rounded up to ${expectedEggs}.`);

      // "Salt" (to taste, delicate, scale less than linear) - example of square root scaling
      const originalSalt = mockIngredientsForScaling.find(i => i.name === "Salt")!;
      const scaledSalt = scaledIngredients.find(i => i.name === "Salt")!;
      const linearScaledSalt = originalSalt.quantity * linearScaleFactor; // 0.5 * 2 = 1.0
      const sqrtScaledSalt = originalSalt.quantity * Math.sqrt(linearScaleFactor); // 0.5 * sqrt(2) = 0.707
      assert(scaledSalt.quantity < linearScaledSalt,
             `AI scaled Salt quantity (${scaledSalt.quantity}) should be strictly less than linear scaled (${linearScaledSalt}).`);
      assertEquals(scaledSalt.quantity, parseFloat(sqrtScaledSalt.toFixed(2)), "AI scaled Salt quantity should be sqrt scaled."); // From mock LLM

      // "Chili Powder" (strong spice, scale less than linear)
      const originalChili = mockIngredientsForScaling.find(i => i.name === "Chili Powder")!;
      const scaledChili = scaledIngredients.find(i => i.name === "Chili Powder")!;
      const linearScaledChili = originalChili.quantity * linearScaleFactor; // 2 * 2 = 4
      const sqrtScaledChili = originalChili.quantity * Math.sqrt(linearScaleFactor); // 2 * sqrt(2) = 2.828
      assert(scaledChili.quantity < linearScaledChili,
             `AI scaled Chili Powder quantity (${scaledChili.quantity}) should be strictly less than linear scaled (${linearScaledChili}).`);
      assertEquals(scaledChili.quantity, parseFloat(sqrtScaledChili.toFixed(2)), "AI scaled Chili Powder quantity should be sqrt scaled."); // From mock LLM

      // "Flour" (standard dry) - should be linearly scaled
      const originalFlour = mockIngredientsForScaling.find(i => i.name === "Flour")!;
      const scaledFlour = scaledIngredients.find(i => i.name === "Flour")!;
      const linearScaledFlour = originalFlour.quantity * linearScaleFactor; // 200 * 2 = 400
      assertEquals(scaledFlour.quantity, linearScaledFlour, "AI scaled Flour should be linearly scaled.");

    } finally {
      await client.close();
    }
  },
});


// --- Action: scaleManually specific tests ---
Deno.test({
  name: "scaleManually: should successfully scale a recipe linearly",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);

    try {
      const addRecipeResult = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Simple Pasta",
        originalServings: 2,
        ingredients: mockIngredientsForScaling,
        cookingMethods: mockCookingMethods,
      });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const targetServings = 4; // Scale up
      const manualScaleResult = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings });
      assertNotEquals("error" in manualScaleResult, true, `Manual scaling failed: ${(manualScaleResult as { error: string }).error}`);
      const { scaledRecipeId } = manualScaleResult as { scaledRecipeId: ScaledRecipe };
      assertExists(scaledRecipeId);

      const fetchedScaledRecipe = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId });
      assertNotEquals("error" in fetchedScaledRecipe, true);
      assertEquals((fetchedScaledRecipe as { scalingMethod: string }).scalingMethod, "manual");

      const originalServings = 2;
      const scaleFactor = targetServings / originalServings; // 4/2 = 2
      const originalFlour = mockIngredientsForScaling.find(i => i.name === "Flour")!;
      const scaledFlour = (fetchedScaledRecipe as { scaledIngredients: typeof mockIngredientsForScaling }).scaledIngredients.find(i => i.name === "Flour")!;
      assertEquals(scaledFlour.quantity, originalFlour.quantity * scaleFactor, "Flour should be scaled linearly.");

      const targetServingsDown = 1; // Scale down
      const manualScaleDownResult = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: targetServingsDown });
      assertNotEquals("error" in manualScaleDownResult, true);
      const { scaledRecipeId: scaledRecipeIdDown } = manualScaleDownResult as { scaledRecipeId: ScaledRecipe };
      assertExists(scaledRecipeIdDown);

      const fetchedScaledRecipeDown = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId: scaledRecipeIdDown });
      assertNotEquals("error" in fetchedScaledRecipeDown, true);
      assertEquals((fetchedScaledRecipeDown as { scalingMethod: string }).scalingMethod, "manual");

      const scaleFactorDown = targetServingsDown / originalServings; // 1/2 = 0.5
      const originalWater = mockIngredientsForScaling.find(i => i.name === "Water")!;
      const scaledWater = (fetchedScaledRecipeDown as { scaledIngredients: typeof mockIngredientsForScaling }).scaledIngredients.find(i => i.name === "Water")!;
      assertEquals(scaledWater.quantity, parseFloat((originalWater.quantity * scaleFactorDown).toFixed(2)), "Water should be scaled linearly down.");

    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "scaleManually: should return error for non-existent base recipe",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db); // Needed for dependency
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const nonExistentRecipeId = "recipe:fake-id" as Recipe;
      const result = await recipeScalerConcept.scaleManually({ baseRecipeId: nonExistentRecipeId, targetServings: 4 });
      assertEquals("error" in result, true);
      assertEquals((result as { error: string }).error, `Base recipe with ID ${nonExistentRecipeId} not found.`);
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "scaleManually: should return error for invalid targetServings",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Test Recipe", originalServings: 4, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const resultZero = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 0 });
      assertEquals("error" in resultZero, true);
      assertEquals((resultZero as { error: string }).error, "targetServings must be greater than 0.");

      const resultNegative = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: -2 });
      assertEquals("error" in resultNegative, true);
      assertEquals((resultNegative as { error: string }).error, "targetServings must be greater than 0.");
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "scaleManually: should return error if targetServings equals originalServings",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const originalServings = 4;
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Test Recipe", originalServings, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const result = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: originalServings });
      assertEquals("error" in result, true);
      assertEquals((result as { error: string }).error, `targetServings (${originalServings}) cannot be equal to originalServings (${originalServings}).`);
    } finally {
      await client.close();
    }
  },
});


// --- Action: scaleRecipeAI specific tests ---
Deno.test({
  name: "scaleRecipeAI: should successfully scale a recipe using AI and store it",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);

    try {
      const addRecipeResult = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "AI Scaled Pancakes",
        originalServings: 4,
        ingredients: mockIngredientsForScaling,
        cookingMethods: mockCookingMethods,
      });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };
      const targetServings = 10; // Not a direct multiple, good for LLM

      const scaleAIResult = await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings });
      assertNotEquals("error" in scaleAIResult, true, `AI scaling failed: ${(scaleAIResult as { error: string }).error}`);
      const { scaledRecipeId } = scaleAIResult as { scaledRecipeId: ScaledRecipe };
      assertExists(scaledRecipeId);

      const fetchedScaledRecipe = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId });
      assertNotEquals("error" in fetchedScaledRecipe, true);
      assertEquals((fetchedScaledRecipe as { scalingMethod: string }).scalingMethod, "ai");
      assertEquals((fetchedScaledRecipe as { targetServings: number }).targetServings, targetServings);

      const originalServings = 4;
      const linearScaleFactor = targetServings / originalServings; // 10/4 = 2.5
      const scaledIngredients = (fetchedScaledRecipe as { scaledIngredients: typeof mockIngredientsForScaling }).scaledIngredients;

      // Test specific non-linear scaling behaviors as expected from LLM logic (based on mock LLM for consistency)
      // "Eggs" (discrete item, rounds up)
      const originalEggs = mockIngredientsForScaling.find(i => i.name === "Eggs")!;
      const scaledEggs = scaledIngredients.find(i => i.name === "Eggs")!;
      const expectedEggs = Math.ceil(originalEggs.quantity * linearScaleFactor); // ceil(2 * 2.5) = 5
      assertEquals(scaledEggs.quantity, expectedEggs, `AI scaled Eggs quantity (${scaledEggs.quantity}) should be ${expectedEggs} (rounded up).`);

      // "Salt" (to taste, delicate, scale less than linear)
      const originalSalt = mockIngredientsForScaling.find(i => i.name === "Salt")!;
      const scaledSalt = scaledIngredients.find(i => i.name === "Salt")!;
      const linearScaledSalt = originalSalt.quantity * linearScaleFactor; // 0.5 * 2.5 = 1.25
      const expectedSalt = originalSalt.quantity * Math.sqrt(linearScaleFactor); // 0.5 * sqrt(2.5) = 0.79
      assert(scaledSalt.quantity < linearScaledSalt, `AI scaled Salt quantity (${scaledSalt.quantity}) should be strictly less than linear scaled (${linearScaledSalt}).`);
      assertEquals(scaledSalt.quantity, parseFloat(expectedSalt.toFixed(2)), "AI scaled Salt quantity should be sqrt scaled.");

      // "Chili Powder" (strong spice, scale less than linear)
      const originalChili = mockIngredientsForScaling.find(i => i.name === "Chili Powder")!;
      const scaledChili = scaledIngredients.find(i => i.name === "Chili Powder")!;
      const linearScaledChili = originalChili.quantity * linearScaleFactor; // 2 * 2.5 = 5
      const expectedChili = originalChili.quantity * Math.sqrt(linearScaleFactor); // 2 * sqrt(2.5) = 3.16
      assert(scaledChili.quantity < linearScaledChili, `AI scaled Chili Powder quantity (${scaledChili.quantity}) should be strictly less than linear scaled (${linearScaledChili}).`);
      assertEquals(scaledChili.quantity, parseFloat(expectedChili.toFixed(2)), "AI scaled Chili Powder quantity should be sqrt scaled.");

      // "Flour" (standard dry) - should be linearly scaled
      const originalFlour = mockIngredientsForScaling.find(i => i.name === "Flour")!;
      const scaledFlour = scaledIngredients.find(i => i.name === "Flour")!;
      const linearScaledFlour = originalFlour.quantity * linearScaleFactor; // 200 * 2.5 = 500
      assertEquals(scaledFlour.quantity, linearScaledFlour, "AI scaled Flour should be linearly scaled.");

    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "scaleRecipeAI: should return error for non-existent base recipe",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const nonExistentRecipeId = "recipe:fake-id" as Recipe;
      const result = await recipeScalerConcept.scaleRecipeAI({ baseRecipeId: nonExistentRecipeId, targetServings: 4 });
      assertEquals("error" in result, true);
      assertEquals((result as { error: string }).error, `Base recipe with ID ${nonExistentRecipeId} not found.`);
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "scaleRecipeAI: should return error for invalid targetServings",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Test Recipe", originalServings: 4, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const resultZero = await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings: 0 });
      assertEquals("error" in resultZero, true);
      assertEquals((resultZero as { error: string }).error, "targetServings must be greater than 0.");

      const resultNegative = await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings: -2 });
      assertEquals("error" in resultNegative, true);
      assertEquals((resultNegative as { error: string }).error, "targetServings must be greater than 0.");
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "scaleRecipeAI: should return error if targetServings equals originalServings",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const originalServings = 4;
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Test Recipe", originalServings, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const result = await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings: originalServings });
      assertEquals("error" in result, true);
      assertEquals((result as { error: string }).error, `targetServings (${originalServings}) cannot be equal to originalServings (${originalServings}).`);
    } finally {
      await client.close();
    }
  },
});

// --- Query: _getScaledRecipe specific tests ---
Deno.test({
  name: "_getScaledRecipe: should return the scaled recipe by its ID",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Query Test Recipe", originalServings: 2, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const scaleResult = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 4 });
      const { scaledRecipeId } = scaleResult as { scaledRecipeId: ScaledRecipe };
      assertExists(scaledRecipeId);

      const fetched = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId });
      assertNotEquals("error" in fetched, true);
      assertEquals((fetched as { _id: ScaledRecipe })._id, scaledRecipeId);
      assertEquals((fetched as { baseRecipeId: Recipe }).baseRecipeId, baseRecipeId);
      assertEquals((fetched as { targetServings: number }).targetServings, 4);
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "_getScaledRecipe: should return an error for a non-existent scaled recipe ID",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const nonExistentId = "scaled:fake-id" as ScaledRecipe;
      const fetched = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId: nonExistentId });
      assertEquals("error" in fetched, true);
      assertEquals((fetched as { error: string }).error, `Scaled recipe with ID ${nonExistentId} not found.`);
    } finally {
      await client.close();
    }
  },
});

// --- Query: _findScaledRecipe specific tests ---
Deno.test({
  name: "_findScaledRecipe: should return a scaled recipe matching base ID and target servings",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Find Test Recipe", originalServings: 3, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 6 });
      await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings: 9 }); // Add another for potential ambiguity

      const fetched = await recipeScalerConcept._findScaledRecipe({ baseRecipeId, targetServings: 6 });
      assertExists(fetched);
      assertEquals(fetched.baseRecipeId, baseRecipeId);
      assertEquals(fetched.targetServings, 6);
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "_findScaledRecipe: should return null if no matching scaled recipe is found",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "No Match Recipe", originalServings: 4, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const fetched = await recipeScalerConcept._findScaledRecipe({ baseRecipeId, targetServings: 5 });
      assertEquals(fetched, null);
    } finally {
      await client.close();
    }
  },
});

// --- Query: _getScaledRecipesByBaseRecipe specific tests ---
Deno.test({
  name: "_getScaledRecipesByBaseRecipe: should return all scaled versions of a base recipe",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Multiple Scales Recipe", originalServings: 4, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 2 });
      await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings: 8 });
      await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 6 });

      const scaledVersions = await recipeScalerConcept._getScaledRecipesByBaseRecipe({ baseRecipeId });
      assertEquals(scaledVersions.length, 3);
      assert(scaledVersions.some(s => s.targetServings === 2 && s.scalingMethod === 'manual'));
      assert(scaledVersions.some(s => s.targetServings === 8 && s.scalingMethod === 'ai'));
      assert(scaledVersions.some(s => s.targetServings === 6 && s.scalingMethod === 'manual'));
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "_getScaledRecipesByBaseRecipe: should return an empty array if no scaled versions exist",
  permissions: { net: true, env: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = getLLMClient();
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Unscaled Recipe", originalServings: 4, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const scaledVersions = await recipeScalerConcept._getScaledRecipesByBaseRecipe({ baseRecipeId });
      assertEquals(scaledVersions.length, 0);
    } finally {
      await client.close();
    }
  },
});
```
