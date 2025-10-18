---
timestamp: 'Sat Oct 18 2025 10:16:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_101610.955f0c62.md]]'
content_id: 792e403993e6cf6856e5caccda18ddbc5ba89f99423cbbed5ed595458c76ee8e
---

# file: src/recipescaler/RecipeScalerConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Utility for test database setup
import { ID } from "@utils/types.ts"; // Generic ID type
import { config } from "dotenv"; // Import config from dotenv

// Import the concepts and LLM client interface
import RecipeConcept from "../recipe/RecipeConcept.ts";
import RecipeScalerConcept from "./RecipeScalerConcept.ts";
import { GeminiLLM, ILLMClient } from "./geminiLLMClient.ts"; // Import the specific Gemini LLM client and interface

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

// Helper function for creating a mock LLM client
function createMockLLMClient(): ILLMClient {
  return {
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
            scaledQuantity = ing.quantity * Math.sqrt(scaleFactor); // e.g., square root scaling
            if (scaledQuantity < ing.quantity && scaledQuantity < 0.25) scaledQuantity = 0.25; // Don't go too low
            if (scaledQuantity > ing.quantity * 2) scaledQuantity = ing.quantity * 2; // Cap increase
          } else if (ing.scalingContext?.toLowerCase().includes("discrete item, rounds up")) {
            scaledQuantity = Math.ceil(scaledQuantity);
          } else if (ing.scalingContext?.toLowerCase().includes("discrete")) {
              scaledQuantity = Math.round(scaledQuantity);
          } else {
            scaledQuantity = parseFloat(scaledQuantity.toFixed(2)); // Default to rounding
          }
          scaledQuantity = Math.max(0, scaledQuantity); // Ensure no negative quantities
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
}

// Helper function to get LLM client - now tries to read from config.json first, then environment variables
async function getLLMClient(): Promise<ILLMClient> {
  let geminiApiKey: string | undefined;

  // 1. Try loading from config.json
  try {
    const configPath = "./config.json"; // Assuming config.json is in repo root
    const configContent = await Deno.readTextFile(configPath);
    const appConfig = JSON.parse(configContent);
    geminiApiKey = appConfig.GEMINI_API_KEY;
    if (geminiApiKey) {
      console.log(`[LLM Client Setup] 'GEMINI_API_KEY' loaded from '${configPath}'.`);
    }
  } catch (readError) {
    console.warn(`[LLM Client Setup] Could not read or parse 'config.json' (${(readError as Error).message}).`);
  }

  // 2. If not found in config.json, try environment variables
  if (!geminiApiKey) {
    geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiApiKey) {
      console.log("[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.");
    }
  }

  // 3. If still no key, fall back to mock
  if (!geminiApiKey) {
    console.warn("WARNING: 'GEMINI_API_KEY' is not found in 'config.json' or environment variables. Using a MockLLMClient for AI scaling tests.");
    return createMockLLMClient();
  }

  return new GeminiLLM(geminiApiKey);
}


// --- Principle Trace Test ---
Deno.test({
  name: "Principle: Recipe selected, scaled by AI, and retrieved later",
  permissions: { env: true, net: true, sys: true, read: true }, // Added read for config.json
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded for MONGODB_URL
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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
      assertEquals(scaledEggs.quantity, expectedEggs, `AI scaled Eggs quantity (${scaledEggs.quantity}) should be ${expectedEggs} (rounded up).`);

      // "Salt" (to taste, delicate, scale less than linear) - example of square root scaling
      const originalSalt = mockIngredientsForScaling.find(i => i.name === "Salt")!;
      const scaledSalt = scaledIngredients.find(i => i.name === "Salt")!;
      const linearScaledSalt = originalSalt.quantity * linearScaleFactor; // 0.5 * 2 = 1.0
      const sqrtScaledSalt = originalSalt.quantity * Math.sqrt(linearScaleFactor); // 0.5 * sqrt(2) = 0.707
      assert(scaledSalt.quantity < linearScaledSalt, `AI scaled Salt quantity (${scaledSalt.quantity}) should be strictly less than linear scaled (${linearScaledSalt}).`);
      assertEquals(scaledSalt.quantity, parseFloat(sqrtScaledSalt.toFixed(2)), "AI scaled Salt quantity should be sqrt scaled."); // From mock LLM

      // "Chili Powder" (strong spice, scale less than linear)
      const originalChili = mockIngredientsForScaling.find(i => i.name === "Chili Powder")!;
      const scaledChili = scaledIngredients.find(i => i.name === "Chili Powder")!;
      const linearScaledChili = originalChili.quantity * linearScaleFactor; // 2 * 2 = 4
      const sqrtScaledChili = originalChili.quantity * Math.sqrt(linearScaleFactor); // 2 * sqrt(2) = 2.828
      assert(scaledChili.quantity < linearScaledChili, `AI scaled Chili Powder quantity (${scaledChili.quantity}) should be strictly less than linear scaled (${linearScaledChili}).`);
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
  permissions: { net: true, read: true, env: true, sys: true }, // Added read for config.json, env for fallback, sys for LLM client instantiation
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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
  permissions: { net: true, read: true, env: true, sys: true }, // Added read, env, sys
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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
  permissions: { net: true, read: true, env: true, sys: true }, // Added read, env, sys
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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
  permissions: { net: true, read: true, env: true, sys: true }, // Added read, env, sys
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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


// Action: scaleRecipeAI specific tests (These are the ones requiring LLM and thus sys, and env for API key)
Deno.test({
  name: "scaleRecipeAI: should successfully scale a recipe using AI and store it",
  permissions: { net: true, env: true, sys: true, read: true }, // Added read for config.json
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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
      const targetServings = 10;

      const scaleAIResult = await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings });
      assertNotEquals("error" in scaleAIResult, true, `AI scaling failed: ${(scaleAIResult as { error: string }).error}`);
      const { scaledRecipeId } = scaleAIResult as { scaledRecipeId: ScaledRecipe };
      assertExists(scaledRecipeId);

      const fetchedScaledRecipe = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId });
      assertNotEquals("error" in fetchedScaledRecipe, true);
      assertEquals((fetchedScaledRecipe as { scalingMethod: string }).scalingMethod, "ai");
      assertEquals((fetchedScaledRecipe as { targetServings: number }).targetServings, targetServings);

      const originalServings = 4;
      const linearScaleFactor = targetServings / originalServings;
      const scaledIngredients = (fetchedScaledRecipe as { scaledIngredients: typeof mockIngredientsForScaling }).scaledIngredients;

      const originalEggs = mockIngredientsForScaling.find(i => i.name === "Eggs")!;
      const scaledEggs = scaledIngredients.find(i => i.name === "Eggs")!;
      const expectedEggs = Math.ceil(originalEggs.quantity * linearScaleFactor); // ceil(2 * 2.5) = 5
      assertEquals(scaledEggs.quantity, expectedEggs, `AI scaled Eggs quantity (${scaledEggs.quantity}) should be ${expectedEggs} (rounded up).`);

      const originalSalt = mockIngredientsForScaling.find(i => i.name === "Salt")!;
      const scaledSalt = scaledIngredients.find(i => i.name === "Salt")!;
      const linearScaledSalt = originalSalt.quantity * linearScaleFactor; // 0.5 * 2.5 = 1.25
      const expectedSalt = originalSalt.quantity * Math.sqrt(linearScaleFactor); // 0.5 * sqrt(2.5) = 0.79
      assert(scaledSalt.quantity < linearScaledSalt, `AI scaled Salt quantity (${scaledSalt.quantity}) should be strictly less than linear scaled (${linearScaledSalt}).`);
      assertEquals(scaledSalt.quantity, parseFloat(expectedSalt.toFixed(2)), "AI scaled Salt quantity should be sqrt scaled.");

      const originalChili = mockIngredientsForScaling.find(i => i.name === "Chili Powder")!;
      const scaledChili = scaledIngredients.find(i => i.name === "Chili Powder")!;
      const linearScaledChili = originalChili.quantity * linearScaleFactor; // 2 * 2.5 = 5
      const expectedChili = originalChili.quantity * Math.sqrt(linearScaleFactor); // 2 * sqrt(2.5) = 3.16
      assert(scaledChili.quantity < linearScaledChili, `AI scaled Chili Powder quantity (${scaledChili.quantity}) should be strictly less than linear scaled (${linearScaledChili}).`);
      assertEquals(scaledChili.quantity, parseFloat(expectedChili.toFixed(2)), "AI scaled Chili Powder quantity should be sqrt scaled.");

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
  permissions: { net: true, env: true, sys: true, read: true }, // Added read
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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
  permissions: { net: true, env: true, sys: true, read: true }, // Added read
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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
  permissions: { net: true, env: true, sys: true, read: true }, // Added read
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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

// Query tests
Deno.test({
  name: "_getScaledRecipe: should return the scaled recipe by its ID",
  permissions: { net: true, sys: true, read: true, env: true }, // All permissions for consistency
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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
  permissions: { net: true, sys: true, read: true, env: true }, // All permissions for consistency
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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

Deno.test({
  name: "_findScaledRecipe: should return a scaled recipe matching base ID and target servings",
  permissions: { net: true, env: true, sys: true, read: true }, // All permissions for consistency
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Find Test Recipe", originalServings: 3, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 6 });
      await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings: 9 });

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
  permissions: { net: true, sys: true, read: true, env: true }, // All permissions for consistency
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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

Deno.test({
  name: "_getScaledRecipesByBaseRecipe: should return all scaled versions of a base recipe",
  permissions: { net: true, env: true, sys: true, read: true }, // All permissions for consistency
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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
  permissions: { net: true, sys: true, read: true, env: true }, // All permissions for consistency
  async fn() {
    config({ export: true, allowEmptyValues: true }); // ENSURE dotenv is loaded
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const llmClient = await getLLMClient(); // Await the async function
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
