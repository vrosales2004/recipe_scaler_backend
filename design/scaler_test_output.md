# Test Output: Scaler Tests

## Summary
- **Total Tests**: 13
- **Passed**: 13
- **Failed**: 0
- **Duration**: ~5 seconds

---

## Test Results

### Scale Manually Tests
- **scaleManually: should successfully scale a recipe linearly** ... ✅ Passed (761ms)
  - **Output**: `[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.`
- **scaleManually: should return error for non-existent base recipe** ... ✅ Passed (502ms)
  - **Output**: `[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.`
- **scaleManually: should return error for invalid targetServings** ... ✅ Passed (518ms)
  - **Output**: `[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.`
- **scaleManually: should return error if targetServings equals originalServings** ... ✅ Passed (511ms)
  - **Output**: `[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.`

### Scale Recipe AI Tests
- **scaleRecipeAI: should return error for non-existent base recipe** ... ✅ Passed (508ms)
  - **Output**: `[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.`
- **scaleRecipeAI: should return error for invalid targetServings** ... ✅ Passed (563ms)
  - **Output**: `[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.`
- **scaleRecipeAI: should return error if targetServings equals originalServings** ... ✅ Passed (TBD)

---

## Final Result
All tests passed successfully! 🎉

# Raw Output:
running 13 tests from ./src/concepts/ScalerTests.ts
scaleManually: should successfully scale a recipe linearly ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
scaleManually: should successfully scale a recipe linearly ... ok (761ms)
scaleManually: should return error for non-existent base recipe ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
scaleManually: should return error for non-existent base recipe ... ok (502ms)
scaleManually: should return error for invalid targetServings ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
scaleManually: should return error for invalid targetServings ... ok (518ms)
scaleManually: should return error if targetServings equals originalServings ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
scaleManually: should return error if targetServings equals originalServings ... ok (511ms)
scaleRecipeAI: should return error for non-existent base recipe ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
scaleRecipeAI: should return error for non-existent base recipe ... ok (508ms)
scaleRecipeAI: should return error for invalid targetServings ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
scaleRecipeAI: should return error for invalid targetServings ... ok (563ms)
scaleRecipeAI: should return error if targetServings equals originalServings ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
scaleRecipeAI: should return error if targetServings equals originalServings ... ok (529ms)
_getScaledRecipe: should return the scaled recipe by its ID ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
_getScaledRecipe: should return the scaled recipe by its ID ... ok (574ms)
_getScaledRecipe: should return an error for a non-existent scaled recipe ID ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
_getScaledRecipe: should return an error for a non-existent scaled recipe ID ... ok (525ms)
_findScaledRecipe: should return a scaled recipe matching base ID and target servings ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
🤖 Requesting scaled recipe from AI...
❌ Error communicating with Gemini LLM: Error: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent: [404 Not Found] models/gemini-pro is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.
    at handleResponseNotOk (file:///Users/victorrosales/Downloads/104/recipe_scaler_backend/node_modules/@google/generative-ai/dist/index.mjs:432:11)
    at eventLoopTick (ext:core/01_core.js:179:7)
    at async makeRequest (file:///Users/victorrosales/Downloads/104/recipe_scaler_backend/node_modules/@google/generative-ai/dist/index.mjs:401:9)
    at async generateContent (file:///Users/victorrosales/Downloads/104/recipe_scaler_backend/node_modules/@google/generative-ai/dist/index.mjs:865:22)
    at async GeminiLLM.executeLLM (file:///Users/victorrosales/Downloads/104/recipe_scaler_backend/src/geminiLLMClient.ts:50:22)
    at async RecipeScalerConcept.scaleRecipeAI (file:///Users/victorrosales/Downloads/104/recipe_scaler_backend/src/concepts/ScalerConcept.ts:220:24)
    at async fn (file:///Users/victorrosales/Downloads/104/recipe_scaler_backend/src/concepts/ScalerTests.ts:898:7)
    at async innerWrapped (ext:cli/40_test.js:181:5)
    at async exitSanitizer (ext:cli/40_test.js:97:27)
    at async applyPermissions (ext:cli/40_test_common.js:55:14) {
  status: 404,
  statusText: "Not Found",
  errorDetails: undefined
}
❌ Error scaling recipe using AI: Failed to get response from Gemini LLM: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent: [404 Not Found] models/gemini-pro is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.
----- output end -----
_findScaledRecipe: should return a scaled recipe matching base ID and target servings ... ok (830ms)
_findScaledRecipe: should return null if no matching scaled recipe is found ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
_findScaledRecipe: should return null if no matching scaled recipe is found ... ok (577ms)
_getScaledRecipesByBaseRecipe: should return all scaled versions of a base recipe ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
_getScaledRecipesByBaseRecipe: should return all scaled versions of a base recipe ... ok (740ms)
_getScaledRecipesByBaseRecipe: should return an empty array if no scaled versions exist ...
------- output -------
[LLM Client Setup] 'GEMINI_API_KEY' loaded from environment variables.
----- output end -----
_getScaledRecipesByBaseRecipe: should return an empty array if no scaled versions exist ... ok (678ms)

ok | 13 passed | 0 failed (7s)