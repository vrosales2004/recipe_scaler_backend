---
timestamp: 'Mon Oct 20 2025 13:51:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_135149.b2a6ce3e.md]]'
content_id: beb30650a22c498b39f58448732ffa3551e11b35216e0d5a438053a85392f6d0
---

# API Specification: RecipeScaler Concept

**Purpose:** To provide and manage scaled versions of existing recipes, intelligently adjusting ingredient quantities to match a target serving size.

***

## API Endpoints

### POST /api/RecipeScaler/scaleManually

**Description:** Creates a manually scaled version of a base recipe, with user-provided scaled ingredients.

**Requirements:**

* `true` (No explicit preconditions provided in the concept description.)

**Effects:**

* A new scaled recipe record is created in the concept's state.
* The record includes the `baseRecipeId`, `targetServings`, and the provided `scaledIngredients`.
* The `scalingMethod` is set to 'manual'.
* The unique `scaledRecipeId` for the new scaled recipe is returned.

**Request Body:**

```json
{
  "baseRecipeId": "string",
  "targetServings": "number",
  "scaledIngredients": [
    {
      "name": "string",
      "quantity": "number",
      "unit": "string",
      "preparation": "string (optional)"
    }
  ]
}
```

**Success Response Body (Action):**

```json
{
  "scaledRecipeId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/RecipeScaler/scaleRecipeAI

**Description:** Generates an AI-scaled version of a base recipe based on a target serving size.

**Requirements:**

* `true` (No explicit preconditions provided in the concept description.)

**Effects:**

* Internally interacts with an LLM client to generate scaled ingredient quantities based on the `baseRecipeId` and `targetServings`.
* A new scaled recipe record is created in the concept's state, storing the LLM-generated `scaledIngredients`.
* The `scalingMethod` is set to 'ai'.
* The unique `scaledRecipeId` for the new scaled recipe is returned.

**Request Body:**

```json
{
  "baseRecipeId": "string",
  "targetServings": "number"
}
```

**Success Response Body (Action):**

```json
{
  "scaledRecipeId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/RecipeScaler/\_getScaledRecipe

**Description:** Retrieves a specific scaled recipe by its unique scaled recipe identifier.

**Requirements:**

* `true` (No explicit preconditions provided in the concept description.)

**Effects:**

* Returns the details of the scaled recipe identified by `scaledRecipeId`.

**Request Body:**

```json
{
  "scaledRecipeId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "scaledRecipeId": "string",
    "baseRecipeId": "string",
    "targetServings": "number",
    "scaledIngredients": [
      {
        "name": "string",
        "quantity": "number",
        "unit": "string",
        "preparation": "string (optional)"
      }
    ],
    "scalingMethod": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/RecipeScaler/\_findScaledRecipe

**Description:** Finds scaled recipes based on the `baseRecipeId` and `targetServings`.

**Requirements:**

* `true` (No explicit preconditions provided in the concept description.)

**Effects:**

* Returns a list of scaled recipes that match the provided criteria.

**Request Body:**

```json
{
  "baseRecipeId": "string",
  "targetServings": "number"
}
```

**Success Response Body (Query):**

```json
[
  {
    "scaledRecipeId": "string",
    "baseRecipeId": "string",
    "targetServings": "number",
    "scaledIngredients": [
      {
        "name": "string",
        "quantity": "number",
        "unit": "string",
        "preparation": "string (optional)"
      }
    ],
    "scalingMethod": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
