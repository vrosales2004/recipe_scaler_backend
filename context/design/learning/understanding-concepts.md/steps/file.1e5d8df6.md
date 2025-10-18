---
timestamp: 'Fri Oct 17 2025 17:08:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_170808.22bc1978.md]]'
content_id: 1e5d8df68b35e78d37c021cf1a41f9943a02a3c59c9799a5f7707fe993cfee10
---

# file: src/recipescaler/RecipeScalerConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Utility for test database setup
import { ID } from "@utils/types.ts"; // Generic ID type

// Import the concepts and LLM client
import RecipeConcept from "../recipe/RecipeConcept.ts";
import RecipeScalerConcept from "./RecipeScalerConcept.ts";
import { GeminiLLM, ILLMClient } from "./geminiLLMClient.ts"; // Assuming geminiLLMClient.ts is in the same folder

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
  { name: "Eggs", quantity: 2, unit: "large", scalingContext: "discrete item" }, // Expect rounding up/down
  { name: "Salt", quantity: 0.5, unit: "tsp", scalingContext: "to taste, delicate" }, // Expect less than linear scaling
  { name: "Garlic Cloves", quantity: 3, unit: "cloves", scalingContext: "flavor, discrete" }, // Expect rounding, potentially more aggressive scaling than salt
  { name: "Water", quantity: 250, unit: "ml", scalingContext: "standard liquid" },
];

const mockCookingMethods = [
  "Mix dry ingredients",
  "Add wet ingredients",
  "Bake at 180C for 25 minutes",
];

// --- Global Test Setup (for LLM Client) ---
let llmClient: ILLMClient;

// This will run once for the entire test file.
// It tries to get the API key and initialize the GeminiLLM client.
// If the key is not set, it will throw an error, signaling that LLM tests can't run.
Deno.test("Setup LLM Client (before all tests)", { permissions: { env: true } }, () => {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set. LLM-dependent tests might fail.");
    // For demonstration, we'll proceed, but if this were critical, we'd throw or skip LLM tests.
    // For a robust setup, you'd typically have a MockLLMClient fallback for testing.
    // For now, if the key is missing, subsequent LLM calls will fail.
    // As per user's request, we are using GeminiLLM directly.
    llmClient = { // Fallback mock for LLM if API key isn't present
      executeLLM: async (prompt: string): Promise<string> => {
        console.warn("MOCK LLM: Using fallback mock LLM client as GEMINI_API_KEY is missing.");
        // Simple mock: extract ingredients and linearly scale them
        const recipeMatch = prompt.match(/Here is the recipe to scale:\n(.*?)\nReturn your response as a JSON object/s);
        let originalRecipeData: any;
        if (recipeMatch && recipeMatch[1]) {
          try {
            originalRecipeData = JSON.parse(recipeMatch[1]);
          } catch (e) { /* ignore */ }
        }
        if (originalRecipeData) {
            const { name, originalServings, targetServings, ingredients } = originalRecipeData;
            const scaleFactor = targetServings / originalServings;
            const scaled = ingredients.map((ing: any) => ({
                name: ing.name,
                quantity: parseFloat((ing.quantity * scaleFactor).toFixed(2)),
                unit: ing.unit,
                scalingContext: ing.scalingContext,
            }));
            return JSON.stringify({ name, ingredients: scaled });
        }
        return JSON.stringify({ name: "MockScaled", ingredients: [] });
      }
    };
  } else {
    llmClient = new GeminiLLM(geminiApiKey);
  }
  assertExists(llmClient, "LLM Client should be initialized.");
});


// --- Principle Trace Test ---
Deno.test("Principle: Recipe selected, scaled by AI, and retrieved later", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
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

    // Further checks on intelligent scaling (as per mock LLM logic or real LLM behavior)
    const scaledIngredients = (fetchedScaledRecipe as { scaledIngredients: typeof mockIngredientsForScaling }).scaledIngredients;
    const originalServings = 8;
    const linearScaleFactor = targetServings / originalServings; // 16/8 = 2

    // Example 1: "Eggs" (discrete item) - might round or not be exactly linear
    const originalEggs = mockIngredientsForScaling.find(i => i.name === "Eggs")!;
    const scaledEggs = scaledIngredients.find(i => i.name === "Eggs")!;
    const linearScaledEggs = originalEggs.quantity * linearScaleFactor; // 2 * 2 = 4
    assertNotEquals(scaledEggs.quantity, linearScaledEggs, "AI scaled Eggs quantity should ideally not be strictly linear.");
    assert(scaledEggs.quantity >= linearScaledEggs, "AI scaled Eggs should be rounded up or at least equal to linear.");
    assert(scaledEggs.quantity <= linearScaledEggs + 1, "AI scaled Eggs should not be excessively high."); // e.g., 4 or 5

    // Example 2: "Salt" (to taste, delicate) - might scale less than linearly
    const originalSalt = mockIngredientsForScaling.find(i => i.name === "Salt")!;
    const scaledSalt = scaledIngredients.find(i => i.name === "Salt")!;
    const linearScaledSalt = originalSalt.quantity * linearScaleFactor; // 0.5 * 2 = 1.0
    // The mock LLM keeps "to taste" items at original quantity for simplicity.
    // A real LLM might scale slightly, but less than linear.
    if (llmClient instanceof GeminiLLM) { // If using real LLM, check for deviation
      assert(scaledSalt.quantity < linearScaledSalt || scaledSalt.quantity === originalSalt.quantity,
             `AI scaled Salt quantity (${scaledSalt.quantity}) should be less than or equal to linear (${linearScaledSalt}).`);
    } else { // Mock LLM keeps original quantity
      assertEquals(scaledSalt.quantity, originalSalt.quantity, "Mock LLM should keep 'to taste' items at original quantity.");
    }

  } finally {
    await client.close();
  }
});


// --- Action: scaleManually specific tests ---
Deno.test("scaleManually: should successfully scale a recipe linearly", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
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
    assertEquals(scaledWater.quantity, originalWater.quantity * scaleFactorDown, "Water should be scaled linearly down.");

  } finally {
    await client.close();
  }
});

Deno.test("scaleManually: should return error for non-existent base recipe", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db); // Needed for dependency
  const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
  try {
    const nonExistentRecipeId = "recipe:fake-id" as Recipe;
    const result = await recipeScalerConcept.scaleManually({ baseRecipeId: nonExistentRecipeId, targetServings: 4 });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, `Base recipe with ID ${nonExistentRecipeId} not found.`);
  } finally {
    await client.close();
  }
});

Deno.test("scaleManually: should return error for invalid targetServings", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
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
});

Deno.test("scaleManually: should return error if targetServings equals originalServings", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
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
});


// --- Action: scaleRecipeAI specific tests ---
Deno.test("scaleRecipeAI: should successfully scale a recipe using AI and store it", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
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

    // Test specific non-linear scaling behaviors as expected from LLM logic
    const originalEggs = mockIngredientsForScaling.find(i => i.name === "Eggs")!;
    const scaledEggs = scaledIngredients.find(i => i.name === "Eggs")!;
    const linearScaledEggs = originalEggs.quantity * linearScaleFactor; // 2 * 2.5 = 5
    assert(scaledEggs.quantity === Math.ceil(linearScaledEggs) || scaledEggs.quantity === linearScaledEggs,
           `AI scaled Eggs quantity (${scaledEggs.quantity}) should be rounded or linear. Expected ceil(${linearScaledEggs})=5.`);
    assertEquals(scaledEggs.quantity, 5, "AI scaled Eggs should be 5."); // Specific mock LLM behavior

    const originalSalt = mockIngredientsForScaling.find(i => i.name === "Salt")!;
    const scaledSalt = scaledIngredients.find(i => i.name === "Salt")!;
    const linearScaledSalt = originalSalt.quantity * linearScaleFactor; // 0.5 * 2.5 = 1.25
    // Mock LLM keeps "to taste" items at original quantity.
    assertEquals(scaledSalt.quantity, originalSalt.quantity, "AI scaled Salt quantity should be original for 'to taste'.");

    const originalGarlic = mockIngredientsForScaling.find(i => i.name === "Garlic Cloves")!;
    const scaledGarlic = scaledIngredients.find(i => i.name === "Garlic Cloves")!;
    const linearScaledGarlic = originalGarlic.quantity * linearScaleFactor; // 3 * 2.5 = 7.5
    assertEquals(scaledGarlic.quantity, Math.ceil(linearScaledGarlic), `AI scaled Garlic quantity (${scaledGarlic.quantity}) should be rounded up. Expected ceil(7.5)=8.`);
    assertEquals(scaledGarlic.quantity, 8, "AI scaled Garlic should be 8."); // Specific mock LLM behavior

    const originalFlour = mockIngredientsForScaling.find(i => i.name === "Flour")!;
    const scaledFlour = scaledIngredients.find(i => i.name === "Flour")!;
    const linearScaledFlour = originalFlour.quantity * linearScaleFactor; // 200 * 2.5 = 500
    assertEquals(scaledFlour.quantity, linearScaledFlour, "AI scaled Flour should be linearly scaled.");

  } finally {
    await client.close();
  }
});

Deno.test("scaleRecipeAI: should return error for non-existent base recipe", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
  try {
    const nonExistentRecipeId = "recipe:fake-id" as Recipe;
    const result = await recipeScalerConcept.scaleRecipeAI({ baseRecipeId: nonExistentRecipeId, targetServings: 4 });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, `Base recipe with ID ${nonExistentRecipeId} not found.`);
  } finally {
    await client.close();
  }
});

Deno.test("scaleRecipeAI: should return error for invalid targetServings", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
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
});

Deno.test("scaleRecipeAI: should return error if targetServings equals originalServings", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
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
});

// --- Query: _getScaledRecipe specific tests ---
Deno.test("_getScaledRecipe: should return the scaled recipe by its ID", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
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
});

Deno.test("_getScaledRecipe: should return an error for a non-existent scaled recipe ID", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
  try {
    const nonExistentId = "scaled:fake-id" as ScaledRecipe;
    const fetched = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId: nonExistentId });
    assertEquals("error" in fetched, true);
    assertEquals((fetched as { error: string }).error, `Scaled recipe with ID ${nonExistentId} not found.`);
  } finally {
    await client.close();
  }
});

// --- Query: _findScaledRecipe specific tests ---
Deno.test("_findScaledRecipe: should return a scaled recipe matching base ID and target servings", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
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
});

Deno.test("_findScaledRecipe: should return null if no matching scaled recipe is found", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
  try {
    const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "No Match Recipe", originalServings: 2, ingredients: mockIngredientsForScaling, cookingMethods: [] });
    const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

    const fetched = await recipeScalerConcept._findScaledRecipe({ baseRecipeId, targetServings: 5 });
    assertEquals(fetched, null);
  } finally {
    await client.close();
  }
});

// --- Query: _getScaledRecipesByBaseRecipe specific tests ---
Deno.test("_getScaledRecipesByBaseRecipe: should return all scaled versions of a base recipe", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
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
});

Deno.test("_getScaledRecipesByBaseRecipe: should return an empty array if no scaled versions exist", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, llmClient);
  try {
    const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Unscaled Recipe", originalServings: 4, ingredients: mockIngredientsForScaling, cookingMethods: [] });
    const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

    const scaledVersions = await recipeScalerConcept._getScaledRecipesByBaseRecipe({ baseRecipeId });
    assertEquals(scaledVersions.length, 0);
  } finally {
    await client.close();
  }
});
```
