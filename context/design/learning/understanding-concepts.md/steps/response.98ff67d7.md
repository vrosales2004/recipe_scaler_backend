---
timestamp: 'Sat Oct 18 2025 10:19:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_101950.02418744.md]]'
content_id: 98ff67d791b48eef131b4e129842eecd1a0db862e01825423abaf2e69f011b91
---

# response:

Okay, I understand. You want to completely disable and remove all aspects of LLM interaction from the `RecipeScalerConcept.test.ts` file for now, ensuring only the core, non-LLM functionality is tested. This will eliminate any potential failures stemming from LLM setup or API calls.

This involves:

1. **Simplifying `getLLMClient()`:** It will now *always* return a `DummyLLMClient` that throws an error if its `executeLLM` method is ever called. This guarantees no real LLM calls are made.
2. **Removing LLM-specific imports/calls:** `dotenv` and `Deno.readTextFile` logic from `getLLMClient` is gone.
3. **Removing LLM-related test blocks:** All `Deno.test` blocks dedicated to `scaleRecipeAI` will be removed.
4. **Adjusting `permissions`:** Since no LLM is used, `env`, `sys`, and `read` permissions are no longer needed for any test in this file. Only `net: true` for MongoDB remains.
5. **Updating `_findScaledRecipe` and `_getScaledRecipesByBaseRecipe` tests:** These will be modified to only use `scaleManually` to create test data.

Here's the refactored `src/recipescaler/RecipeScalerConcept.test.ts` file:

***
