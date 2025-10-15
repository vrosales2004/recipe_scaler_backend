---
timestamp: 'Sun Oct 12 2025 08:44:40 GMT-0700 (Pacific Daylight Time)'
parent: '[[../20251012_084440.e82e54cb.md]]'
content_id: 126aed01a020fdf2659cffb43640cecf0c8736b5dd151517fc95d4c444c442b6
---

# Concept: \[AI Augmented] Scaler

**Purpose**: Meant to store recipe and scale to the input factor \
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
