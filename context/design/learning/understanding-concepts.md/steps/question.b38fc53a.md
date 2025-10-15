---
timestamp: 'Mon Oct 13 2025 12:04:18 GMT-0700 (Pacific Daylight Time)'
parent: '[[../20251013_120418.f313fcf5.md]]'
content_id: b38fc53a339ae3c88e0dd627ca9eaf20daaea5e0d0e0f6697b9ec826c31a6516
---

# question: can you look through the concept rubric and overview to give me some feeback before i start implementing. here is my concept:

Purpose: Meant to store recipe and scale to the input factor
**Principle**: recipe either manually inputted or uploaded along with scale factor
on scale, ingredient counts are scaled by the given factor
scale factor and entire recipe context taken into account through LLM when scaling

### Core State

* **Recipes**: Set of recipes with a name, scale factor, set of ingredients, and some cooking methods
* **Ingredients**: (Another concept) Ingredients include name, quantity, unit, and scaling context

### Core Actions

* `addRecipe(name: string, originalPeople: number, targetPeople: number, ingredients: Ingredient[], cookingMethods: string[])`
* `removeRecipe(name: string)`
* `scaleManually(name: string): Ingredient[]` - Manual scaler as fallback for AI version
* `scaleRecipe(name: string): Ingredient[]` - AI version of scaler
