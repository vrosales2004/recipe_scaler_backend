---
timestamp: 'Sat Oct 18 2025 10:19:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_101950.02418744.md]]'
content_id: 60336bc296f500a661f1e52ad41c28f02266d6a21904dee87c00155bdaa6cad7
---

# file: src/recipescaler/RecipeScalerConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Utility for test database setup
import { ID } from "@utils/types.ts"; // Generic ID type
// No need for `config` from `dotenv` as LLM key loading is removed.

// Import the concepts and LLM client interface
import RecipeConcept from "../recipe/RecipeConcept.ts";
import RecipeScalerConcept from "./RecipeScalerConcept.ts";
import { ILLMClient } from "./geminiLLMClient.ts"; // Only need the interface here

// Define generic ID types for consistency
type Author = ID;
type Recipe = ID;
type ScaledRecipe = ID;

// Define test author IDs
const authorAlice = "user:Alice" as Author;

// Mock IngredientData for testing
const mockIngredientsForScaling = [
  { name: "Flour", quantity: 200, unit: "g", scalingContext: "standard dry" },
  { name: "Sugar", quantity: 100, unit: "g", scalingContext: "standard dry" },
  { name: "Eggs", quantity: 2, unit: "large", scalingContext: "discrete item" },
  { name: "Salt", quantity: 0.5, unit: "tsp", scalingContext: "seasoning" },
  { name: "Water", quantity: 250, unit: "ml", scalingContext: "standard liquid" },
  { name: "Chili Powder", quantity: 2, unit: "tbsp", scalingContext: "strong spice" },
];

const mockCookingMethods = [
  "Mix dry ingredients",
  "Add wet ingredients",
  "Bake at 180C for 25 minutes",
];

/**
 * A dummy LLM client that implements ILLMClient but immediately rejects/throws.
 * This ensures that if any LLM-dependent action is accidentally triggered,
 * the test fails loudly, confirming LLM functionality is indeed isolated.
 */
class DummyLLMClient implements ILLMClient {
  async executeLLM(_prompt: string): Promise<string> {
    throw new Error("DummyLLMClient: LLM execute method called. LLM functionality is currently disabled for testing.");
  }
}

const dummyLlmClient = new DummyLLMClient();

// --- Principle Trace Test (Adjusted to use manual scaling) ---
Deno.test({
  name: "Principle: Recipe selected, manually scaled, and retrieved later",
  permissions: { net: true }, // Only net for DB access
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient); // Pass dummy client

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

      // 2. User scales the recipe manually to a new number of servings (e.g., up to 16)
      const targetServings = 16;
      const scaleManualResult = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings });
      assertNotEquals("error" in scaleManualResult, true, `Manual scaling failed: ${(scaleManualResult as { error: string }).error}`);
      const { scaledRecipeId } = scaleManualResult as { scaledRecipeId: ScaledRecipe };
      assertExists(scaledRecipeId, "Scaled recipe ID should be returned.");

      // 3. The scaled number of ingredients is stored and can be accessed by the user later
      const fetchedScaledRecipe = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId });
      assertNotEquals("error" in fetchedScaledRecipe, true, `Failed to fetch scaled recipe: ${(fetchedScaledRecipe as { error: string }).error}`);
      assertExists(fetchedScaledRecipe, "Scaled recipe should be retrievable by its ID.");
      assertEquals((fetchedScaledRecipe as { _id: ScaledRecipe })._id, scaledRecipeId);
      assertEquals((fetchedScaledRecipe as { baseRecipeId: Recipe }).baseRecipeId, baseRecipeId);
      assertEquals((fetchedScaledRecipe as { targetServings: number }).targetServings, targetServings);
      assertEquals((fetchedScaledRecipe as { scalingMethod: string }).scalingMethod, "manual"); // Expect manual scaling
      assert((fetchedScaledRecipe as { scaledIngredients: unknown[] }).scaledIngredients.length > 0, "Scaled ingredients list should not be empty.");

      // Further checks on linear scaling
      const scaledIngredients = (fetchedScaledRecipe as { scaledIngredients: typeof mockIngredientsForScaling }).scaledIngredients;
      const originalServings = 8;
      const linearScaleFactor = targetServings / originalServings; // 16/8 = 2

      const originalFlour = mockIngredientsForScaling.find(i => i.name === "Flour")!;
      const scaledFlour = scaledIngredients.find(i => i.name === "Flour")!;
      assertEquals(scaledFlour.quantity, originalFlour.quantity * linearScaleFactor, "Flour should be linearly scaled.");

      const originalEggs = mockIngredientsForScaling.find(i => i.name === "Eggs")!;
      const scaledEggs = scaledIngredients.find(i => i.name === "Eggs")!;
      assertEquals(scaledEggs.quantity, originalEggs.quantity * linearScaleFactor, "Eggs should be linearly scaled (manual mode).");


    } finally {
      await client.close();
    }
  },
});


// --- Action: scaleManually specific tests ---
Deno.test({
  name: "scaleManually: should successfully scale a recipe linearly",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient);

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
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient);
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
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient);
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
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient);
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


// Action: scaleRecipeAI specific tests (REMOVED/DISABLED)
// This entire block is removed to disable LLM-dependent tests.
// If you need to re-enable them later, uncomment/re-add and ensure LLM client setup is correct.

Deno.test({
  name: "scaleRecipeAI: should throw error if called (LLM functionality disabled)",
  permissions: { net: true }, // Needs net for DB, but LLM itself should not be called successfully
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient);

    try {
      const addRecipeResult = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Dummy LLM Test Recipe",
        originalServings: 4,
        ingredients: mockIngredientsForScaling,
        cookingMethods: mockCookingMethods,
      });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      // Assert that calling scaleRecipeAI with the DummyLLMClient rejects/throws
      await assertRejects(
        () => recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings: 8 }),
        Error,
        "DummyLLMClient: LLM execute method called. LLM functionality is currently disabled for testing."
      );
    } finally {
      await client.close();
    }
  },
});


// --- Query: _getScaledRecipe specific tests ---
Deno.test({
  name: "_getScaledRecipe: should return the scaled recipe by its ID",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient);
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
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient);
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
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient);
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Find Test Recipe", originalServings: 3, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 6 });
      // Removed: await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings: 9 });

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
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient);
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
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient);
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Multiple Scales Recipe", originalServings: 4, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 2 });
      // Removed: await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings: 8 });
      await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 6 });

      const scaledVersions = await recipeScalerConcept._getScaledRecipesByBaseRecipe({ baseRecipeId });
      assertEquals(scaledVersions.length, 2); // Expect 2 manual scales, not 3 (AI is off)
      assert(scaledVersions.some(s => s.targetServings === 2 && s.scalingMethod === 'manual'));
      assert(scaledVersions.some(s => s.targetServings === 6 && s.scalingMethod === 'manual'));
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "_getScaledRecipesByBaseRecipe: should return an empty array if no scaled versions exist",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient);
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

***

**To run these tests:**

```bash
deno test --allow-env --allow-net src/recipescaler/RecipeScalerConcept.test.ts
```

* `--allow-env` is still necessary because `testDb()` (in `@utils/database.ts`) likely uses `Deno.env.get("MONGODB_URL")`.
* `--allow-net` is still necessary for MongoDB connection.
* `--allow-sys` and `--allow-read` are no longer needed on the command line for this test file, as no part of this file should be accessing those permissions. If you still get errors about them, it means there's another dependency or setup issue outside of this specific test file.

This version of the test file should now pass reliably, focusing entirely on the non-LLM aspects of your `RecipeScalerConcept`. When you're ready to re-integrate LLM testing, you can revert these changes or introduce a dedicated `MockLLMClient` that simulates LLM responses.
