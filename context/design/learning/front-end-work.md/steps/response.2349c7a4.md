---
timestamp: 'Mon Oct 20 2025 17:10:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_171027.7f0b06c1.md]]'
content_id: 2349c7a47fe608d4fecb0b78662ecd2c2e0d80e7865eafaa3d35b0135ea548eb
---

# response:

Thank you for providing the implementation files for your concepts! This is exactly what was needed to ensure the API specification is accurate and reflects your actual backend logic.

I've reviewed the `RecipeConcept.ts`, `RecipeScalerConcept.ts`, `ScalingTipsConcept.ts`, and `UserAuthenticationConcept.ts` implementations, comparing them against the previously generated OpenAPI specification and the "Concept API extraction" rules.

Here's a summary of the updates and discrepancies found and addressed:

### **Summary of Changes & Refinements:**

1. **`IngredientData` Schema Update:**
   * Added the `scalingContext` property (optional string) to the `IngredientData` schema, as it's present in your TypeScript interfaces.
   * Made `preparation` in `IngredientData` optional, consistent with your code.

2. **`Recipe` Concept (Updates & New Endpoints):**
   * **`addRecipe`**: Corrected the `AddRecipeRequest` to ensure it reflects `IngredientData` correctly.
   * **`removeRecipe`**: No changes to its definition.
   * **New Query Endpoints:** Added `_getRecipeById`, `_getRecipesByAuthor`, and `_getRecipeByName` endpoints, with their respective request and array-of-objects response schemas (to adhere strictly to the "query returns an array" rule, even if single items are expected).
   * Defined a `RecipeDocOutput` schema to represent the full recipe document returned by queries.

3. **`RecipeScaler` Concept (Updates & New Endpoints):**
   * **`scaleManually` Action Correction:** The previous `ScaleManuallyRequest` was incorrect. The implementation *generates* `scaledIngredients` and does *not* take them as input. The `ScaleManuallyRequest` has been corrected to only accept `baseRecipeId` and `targetServings`.
   * **`scaleRecipeAI`**: No changes to its definition.
   * **Query Response Consistency:** Ensured `_getScaledRecipe` and `_findScaledRecipe` return arrays of `ScaledRecipe` objects, consistent with the query rule.
   * **New Query Endpoint:** Added `_getScaledRecipesByBaseRecipe`.
   * Defined `RecipeDocContextForScaling` to precisely match the structure sent to the LLM for scaling.

4. **`ScalingTips` Concept (Updates & New Endpoints):**
   * **`addManualScalingTip` Action Correction:**
     * The input parameter `content` in the OpenAPI spec was renamed to `tipText` to match the implementation.
     * The `relatedRecipeId` field was removed from `AddManualScalingTipRequest` as it's not an input to this action in your code (it's used for generated tips).
     * The `addedBy` field was made optional.
   * **`requestTipGeneration`**:
     * Defined `RecipeGenerationContextForTips` to accurately reflect the input structure for this action, which includes `recipeId` and `targetServings`.
   * **`removeScalingTip`**: No changes to its definition.
   * **New Query Endpoint:** Added `_getScalingTips` endpoint.
   * Defined `TipDocOutput` schema to represent the tip document returned by queries.

5. **New Concept: `UserAuthentication` (Full Addition):**
   * This concept was entirely new based on your provided `UserAuthenticationConcept.ts`.
   * Added actions: `register`, `login`, `logout`.
   * Added queries: `_getActiveSession`, `_getUserByUsername`, `_getUserById`.
   * Defined new schemas: `UserRegisterRequest`, `UserRegisterResponse`, `UserLoginRequest`, `UserLoginResponse`, `UserLogoutRequest`, `SessionDocOutput`, `UserDocOutput`.
   * Crucially, `UserDocOutput` (for queries returning user info) **excludes `hashedPassword`** for security, as it should never be exposed via the API. `SessionDocOutput` only exposes client-relevant session details.

This revised OpenAPI 3.1.0 specification is now much more accurate and complete, reflecting the current state of your provided backend concept implementations. You can copy and paste this JSON content into an `api-spec.json` file in your frontend repository.

***

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Recipe Application Concepts API",
    "version": "1.0.0",
    "description": "API specification for the Recipe, RecipeScaler, ScalingTips, and UserAuthentication concepts, designed following the Concept Design methodology. This API provides modular and behaviorally focused services for managing recipes, scaling them, generating relevant tips, and handling user authentication."
  },
  "servers": [
    {
      "url": "/api",
      "description": "Base URL for Concept API Endpoints"
    }
  ],
  "paths": {
    "/Recipe/addRecipe": {
      "post": {
        "summary": "Add a new canonical recipe",
        "description": "Adds a new canonical recipe definition to the system, associating it with an author. Returns the unique ID of the newly created recipe. Requires originalServings > 0 (integer), and ingredients list not empty. Recipe name must be unique per author.",
        "operationId": "addRecipe",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AddRecipeRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Recipe successfully added.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AddRecipeResponse"
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/Recipe/removeRecipe": {
      "post": {
        "summary": "Remove a recipe",
        "description": "Removes a recipe definition from the system using its unique identifier. Requires the recipe to exist.",
        "operationId": "removeRecipe",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RemoveRecipeRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Recipe successfully removed.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "description": "Empty object indicating successful removal."
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/Recipe/_getRecipeById": {
      "post": {
        "summary": "Retrieve a recipe by ID",
        "description": "Retrieves a single recipe document by its unique identifier.",
        "operationId": "getRecipeById",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GetRecipeByIdRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Recipe document retrieved. Returns an array as per query rule, or an empty array if not found.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/RecipeDocOutput"
                  }
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/Recipe/_getRecipesByAuthor": {
      "post": {
        "summary": "Retrieve recipes by author",
        "description": "Retrieves all recipe documents associated with a specific author ID.",
        "operationId": "getRecipesByAuthor",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GetRecipesByAuthorRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Array of recipe documents for the author.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/RecipeDocOutput"
                  }
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/Recipe/_getRecipeByName": {
      "post": {
        "summary": "Retrieve a recipe by name and author",
        "description": "Retrieves a single recipe document by its name and author ID. Returns an array as per query rule, or an empty array if not found.",
        "operationId": "getRecipeByName",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GetRecipeByNameRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Recipe document matching name and author.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/RecipeDocOutput"
                  }
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/RecipeScaler/scaleManually": {
      "post": {
        "summary": "Scale a recipe linearly",
        "description": "Scales a recipe linearly based on the target servings. Calculates new ingredient quantities. Requires baseRecipeId to exist, targetServings > 0 and not equal to originalServings.",
        "operationId": "scaleManually",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ScaleManuallyRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Manual scaling successful, returns scaled recipe ID.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ScaleRecipeResponse"
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/RecipeScaler/scaleRecipeAI": {
      "post": {
        "summary": "Generate an AI-scaled recipe",
        "description": "Generates an AI-scaled version of a base recipe based on a target serving size using an LLM. Requires baseRecipeId to exist, targetServings > 0 and not equal to originalServings.",
        "operationId": "scaleRecipeAI",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ScaleRecipeAIRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "AI scaling successful, returns scaled recipe ID.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ScaleRecipeResponse"
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/RecipeScaler/_getScaledRecipe": {
      "post": {
        "summary": "Retrieve a specific scaled recipe by ID",
        "description": "Retrieves the details of a specific scaled recipe by its unique scaled recipe identifier. Returns an array containing one scaled recipe object as per query rule, or an empty array if not found.",
        "operationId": "getScaledRecipe",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GetScaledRecipeRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Scaled recipe details retrieved.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/ScaledRecipe"
                  }
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/RecipeScaler/_findScaledRecipe": {
      "post": {
        "summary": "Find a scaled recipe by base and target servings",
        "description": "Finds a scaled recipe based on the `baseRecipeId` and `targetServings`. Returns an array of matching scaled recipe objects (or an empty array if none found).",
        "operationId": "findScaledRecipe",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/FindScaledRecipeRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Matching scaled recipes retrieved.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/ScaledRecipe"
                  }
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/RecipeScaler/_getScaledRecipesByBaseRecipe": {
      "post": {
        "summary": "Retrieve all scaled recipes for a base recipe",
        "description": "Retrieves all scaled recipe documents associated with a specific base recipe ID.",
        "operationId": "getScaledRecipesByBaseRecipe",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GetScaledRecipesByBaseRecipeRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Array of scaled recipe documents for the base recipe.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/ScaledRecipe"
                  }
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/ScalingTips/addManualScalingTip": {
      "post": {
        "summary": "Add a manual scaling tip",
        "description": "Allows a user (or admin) to directly contribute a specific scaling tip. Requires direction ('up' or 'down'), cookingMethod, and tipText to be non-empty.",
        "operationId": "addManualScalingTip",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AddManualScalingTipRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Manual scaling tip successfully added.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AddScalingTipResponse"
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/ScalingTips/requestTipGeneration": {
      "post": {
        "summary": "Request AI tip generation",
        "description": "Triggers the internal LLM mechanism to generate new scaling tips based on a detailed recipe context. Requires a valid recipeContext, with originalServings and targetServings > 0 and not equal.",
        "operationId": "requestTipGeneration",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RequestTipGenerationRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "AI tips successfully generated, returns IDs of new tips.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RequestTipGenerationResponse"
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/ScalingTips/removeScalingTip": {
      "post": {
        "summary": "Remove a scaling tip",
        "description": "Removes an existing tip record from the system. Requires the tipId to exist.",
        "operationId": "removeScalingTip",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RemoveScalingTipRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Scaling tip successfully removed.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "description": "Empty object indicating successful removal."
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/ScalingTips/_getScalingTips": {
      "post": {
        "summary": "Retrieve scaling tips by criteria",
        "description": "Retrieves all scaling tips matching the given cooking method, direction, and optional related recipe ID.",
        "operationId": "getScalingTips",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GetScalingTipsRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Array of matching tip documents.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/TipDocOutput"
                  }
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/UserAuthentication/register": {
      "post": {
        "summary": "Register a new user",
        "description": "Registers a new user with a unique username and password. Requires username to be unique and password to meet complexity requirements (e.g., min 8 chars).",
        "operationId": "registerUser",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserRegisterRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "User successfully registered, returns new user ID.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserRegisterResponse"
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/UserAuthentication/login": {
      "post": {
        "summary": "Log in a user",
        "description": "Logs in a user with their username and password. Requires username and password to match an existing user.",
        "operationId": "loginUser",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserLoginRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "User successfully logged in, returns user ID and session ID.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserLoginResponse"
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/UserAuthentication/logout": {
      "post": {
        "summary": "Log out a user",
        "description": "Logs out a user by invalidating their session. Requires sessionId to correspond to an active session.",
        "operationId": "logoutUser",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserLogoutRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "User successfully logged out.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "description": "Empty object indicating successful logout."
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/UserAuthentication/_getActiveSession": {
      "post": {
        "summary": "Get active session details",
        "description": "Retrieves an active session by its session ID. Returns an array containing the session details if found and not expired, or an empty array. Password hash is excluded.",
        "operationId": "getActiveSession",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GetActiveSessionRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Active session details.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/SessionDocOutput"
                  }
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/UserAuthentication/_getUserByUsername": {
      "post": {
        "summary": "Get user by username",
        "description": "Finds a user by their username. Returns an array containing the user document (without password hash) if found, or an empty array.",
        "operationId": "getUserByUsername",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GetUserByUsernameRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "User document for the given username.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/UserDocOutput"
                  }
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    },
    "/UserAuthentication/_getUserById": {
      "post": {
        "summary": "Get user by ID",
        "description": "Finds a user by their User ID. Returns an array containing the user document (without password hash) if found, or an empty array.",
        "operationId": "getUserById",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GetUserByIdRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "User document for the given user ID.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/UserDocOutput"
                  }
                }
              }
            }
          },
          "default": {
            "$ref": "#/components/responses/ErrorResponse"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "IngredientData": {
        "type": "object",
        "description": "Details for a single ingredient within a recipe.",
        "properties": {
          "name": {
            "type": "string",
            "description": "The name of the ingredient (e.g., 'flour', 'sugar')."
          },
          "quantity": {
            "type": "number",
            "format": "float",
            "description": "The quantity of the ingredient."
          },
          "unit": {
            "type": "string",
            "description": "The unit of measurement (e.g., 'cups', 'grams', 'teaspoons')."
          },
          "scalingContext": {
            "type": "string",
            "nullable": true,
            "description": "Optional context for LLM guidance on scaling (e.g., 'to taste', 'optional')."
          },
          "preparation": {
            "type": "string",
            "nullable": true,
            "description": "Optional preparation notes (e.g., 'sifted', 'diced')."
          }
        },
        "required": [
          "name",
          "quantity",
          "unit"
        ]
      },
      "RecipeDocContextForScaling": {
        "type": "object",
        "description": "A simplified structure representing the core context of a recipe for the purpose of LLM prompting for scaling.",
        "properties": {
          "name": {
            "type": "string",
            "description": "The name of the recipe."
          },
          "originalServings": {
            "type": "number",
            "description": "The original serving size of the recipe."
          },
          "targetServings": {
            "type": "number",
            "description": "The target number of servings for scaling."
          },
          "ingredients": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/IngredientData"
            },
            "description": "List of ingredients for the recipe."
          },
          "cookingMethods": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of cooking methods used in the recipe."
          }
        },
        "required": [
          "name",
          "originalServings",
          "targetServings",
          "ingredients",
          "cookingMethods"
        ]
      },
      "RecipeGenerationContextForTips": {
        "type": "object",
        "description": "Full details of a recipe used for AI tip generation.",
        "properties": {
          "recipeId": {
            "type": "string",
            "description": "Unique identifier for the base recipe."
          },
          "name": {
            "type": "string",
            "description": "The name of the recipe."
          },
          "originalServings": {
            "type": "number",
            "description": "The original serving size of the recipe."
          },
          "targetServings": {
            "type": "number",
            "description": "The target serving size being scaled to."
          },
          "ingredients": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/IngredientData"
            },
            "description": "List of ingredients for the recipe."
          },
          "cookingMethods": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of cooking methods used in the recipe."
          }
        },
        "required": [
          "recipeId",
          "name",
          "originalServings",
          "targetServings",
          "ingredients",
          "cookingMethods"
        ]
      },
      "AddRecipeRequest": {
        "type": "object",
        "properties": {
          "author": {
            "type": "string",
            "description": "Identifier of the recipe's author."
          },
          "name": {
            "type": "string",
            "description": "The name of the recipe."
          },
          "originalServings": {
            "type": "number",
            "description": "The original serving size of the recipe."
          },
          "ingredients": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/IngredientData"
            },
            "description": "List of ingredients for the recipe."
          },
          "cookingMethods": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of cooking methods used in the recipe."
          }
        },
        "required": [
          "author",
          "name",
          "originalServings",
          "ingredients",
          "cookingMethods"
        ]
      },
      "AddRecipeResponse": {
        "type": "object",
        "properties": {
          "recipe": {
            "type": "string",
            "description": "The unique identifier of the newly added recipe."
          }
        },
        "required": [
          "recipe"
        ]
      },
      "RemoveRecipeRequest": {
        "type": "object",
        "properties": {
          "recipeId": {
            "type": "string",
            "description": "The unique identifier of the recipe to be removed."
          }
        },
        "required": [
          "recipeId"
        ]
      },
      "GetRecipeByIdRequest": {
        "type": "object",
        "properties": {
          "recipeId": {
            "type": "string",
            "description": "The unique identifier of the recipe to retrieve."
          }
        },
        "required": [
          "recipeId"
        ]
      },
      "GetRecipesByAuthorRequest": {
        "type": "object",
        "properties": {
          "author": {
            "type": "string",
            "description": "The ID of the author whose recipes to retrieve."
          }
        },
        "required": [
          "author"
        ]
      },
      "GetRecipeByNameRequest": {
        "type": "object",
        "properties": {
          "recipeName": {
            "type": "string",
            "description": "The name of the recipe to search for."
          },
          "author": {
            "type": "string",
            "description": "The ID of the author of the recipe."
          }
        },
        "required": [
          "recipeName",
          "author"
        ]
      },
      "RecipeDocOutput": {
        "type": "object",
        "description": "A full recipe document, as returned by queries.",
        "properties": {
          "_id": {
            "type": "string",
            "description": "Unique identifier for the recipe."
          },
          "author": {
            "type": "string",
            "description": "Identifier of the recipe's author."
          },
          "name": {
            "type": "string",
            "description": "The name of the recipe."
          },
          "originalServings": {
            "type": "number",
            "description": "The original serving size of the recipe."
          },
          "ingredients": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/IngredientData"
            },
            "description": "List of ingredients for the recipe."
          },
          "cookingMethods": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of cooking methods used in the recipe."
          }
        },
        "required": [
          "_id",
          "author",
          "name",
          "originalServings",
          "ingredients",
          "cookingMethods"
        ]
      },
      "ScaleManuallyRequest": {
        "type": "object",
        "properties": {
          "baseRecipeId": {
            "type": "string",
            "description": "The unique identifier of the original recipe to scale."
          },
          "targetServings": {
            "type": "number",
            "description": "The desired new serving size for the scaled recipe."
          }
        },
        "required": [
          "baseRecipeId",
          "targetServings"
        ]
      },
      "ScaleRecipeAIRequest": {
        "type": "object",
        "properties": {
          "baseRecipeId": {
            "type": "string",
            "description": "The unique identifier of the original recipe to scale."
          },
          "targetServings": {
            "type": "number",
            "description": "The desired new serving size for the scaled recipe."
          }
        },
        "required": [
          "baseRecipeId",
          "targetServings"
        ]
      },
      "ScaleRecipeResponse": {
        "type": "object",
        "properties": {
          "scaledRecipeId": {
            "type": "string",
            "description": "The unique identifier of the newly created scaled recipe."
          }
        },
        "required": [
          "scaledRecipeId"
        ]
      },
      "ScaledRecipe": {
        "type": "object",
        "description": "A representation of a scaled recipe instance.",
        "properties": {
          "_id": {
            "type": "string",
            "description": "Unique identifier for this scaled recipe instance."
          },
          "baseRecipeId": {
            "type": "string",
            "description": "Reference to the original recipe definition."
          },
          "targetServings": {
            "type": "number",
            "description": "The desired new serving size for this scaled recipe."
          },
          "scaledIngredients": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/IngredientData"
            },
            "description": "List of ingredients with adjusted quantities for this scaled recipe."
          },
          "scalingMethod": {
            "type": "string",
            "enum": [
              "manual",
              "ai"
            ],
            "description": "The method used for scaling ('manual' or 'ai')."
          }
        },
        "required": [
          "_id",
          "baseRecipeId",
          "targetServings",
          "scaledIngredients",
          "scalingMethod"
        ]
      },
      "GetScaledRecipeRequest": {
        "type": "object",
        "properties": {
          "scaledRecipeId": {
            "type": "string",
            "description": "The unique identifier of the scaled recipe to retrieve."
          }
        },
        "required": [
          "scaledRecipeId"
        ]
      },
      "FindScaledRecipeRequest": {
        "type": "object",
        "properties": {
          "baseRecipeId": {
            "type": "string",
            "description": "The unique identifier of the base recipe."
          },
          "targetServings": {
            "type": "number",
            "description": "The desired target serving size to search for."
          }
        },
        "required": [
          "baseRecipeId",
          "targetServings"
        ]
      },
      "GetScaledRecipesByBaseRecipeRequest": {
        "type": "object",
        "properties": {
          "baseRecipeId": {
            "type": "string",
            "description": "The ID of the base recipe whose scaled versions to retrieve."
          }
        },
        "required": [
          "baseRecipeId"
        ]
      },
      "AddManualScalingTipRequest": {
        "type": "object",
        "properties": {
          "cookingMethod": {
            "type": "string",
            "description": "The cooking method the tip relates to (e.g., 'baking', 'frying')."
          },
          "direction": {
            "type": "string",
            "enum": [
              "up",
              "down"
            ],
            "description": "The scaling direction the tip applies to ('up' or 'down')."
          },
          "tipText": {
            "type": "string",
            "description": "The actual content of the tip."
          },
          "addedBy": {
            "type": "string",
            "nullable": true,
            "description": "Optional identifier of the user who added the tip."
          }
        },
        "required": [
          "cookingMethod",
          "direction",
          "tipText"
        ]
      },
      "AddScalingTipResponse": {
        "type": "object",
        "properties": {
          "tipId": {
            "type": "string",
            "description": "The unique identifier of the newly added tip."
          }
        },
        "required": [
          "tipId"
        ]
      },
      "RequestTipGenerationRequest": {
        "type": "object",
        "properties": {
          "recipeContext": {
            "$ref": "#/components/schemas/RecipeGenerationContextForTips",
            "description": "The full context of the recipe for which tips are to be generated."
          }
        },
        "required": [
          "recipeContext"
        ]
      },
      "RequestTipGenerationResponse": {
        "type": "object",
        "properties": {
          "tipIds": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "A list of unique identifiers for the newly generated tips."
          }
        },
        "required": [
          "tipIds"
        ]
      },
      "RemoveScalingTipRequest": {
        "type": "object",
        "properties": {
          "tipId": {
            "type": "string",
            "description": "The unique identifier of the tip to be removed."
          }
        },
        "required": [
          "tipId"
        ]
      },
      "GetScalingTipsRequest": {
        "type": "object",
        "properties": {
          "cookingMethod": {
            "type": "string",
            "description": "The cooking method to filter tips by."
          },
          "direction": {
            "type": "string",
            "enum": [
              "up",
              "down"
            ],
            "description": "The scaling direction to filter tips by."
          },
          "relatedRecipeId": {
            "type": "string",
            "nullable": true,
            "description": "Optional ID of a recipe to filter generated tips. If provided, tips explicitly related to this recipe OR general tips are returned."
          }
        },
        "required": [
          "cookingMethod",
          "direction"
        ]
      },
      "TipDocOutput": {
        "type": "object",
        "description": "A single scaling tip document, as returned by queries.",
        "properties": {
          "_id": {
            "type": "string",
            "description": "Unique identifier for the tip."
          },
          "text": {
            "type": "string",
            "description": "The actual content of the tip."
          },
          "cookingMethod": {
            "type": "string",
            "description": "The cooking method the tip applies to."
          },
          "direction": {
            "type": "string",
            "enum": [
              "up",
              "down"
            ],
            "description": "The scaling direction ('up' or 'down')."
          },
          "source": {
            "type": "string",
            "enum": [
              "manual",
              "generated"
            ],
            "description": "Origin of the tip ('manual' or 'generated')."
          },
          "relatedRecipeId": {
            "type": "string",
            "nullable": true,
            "description": "Optional reference to a specific recipe if generated for it."
          },
          "addedBy": {
            "type": "string",
            "nullable": true,
            "description": "Optional identifier of the user who manually added the tip."
          }
        },
        "required": [
          "_id",
          "text",
          "cookingMethod",
          "direction",
          "source"
        ]
      },
      "UserRegisterRequest": {
        "type": "object",
        "properties": {
          "username": {
            "type": "string",
            "description": "The desired unique username for the new user."
          },
          "password": {
            "type": "string",
            "format": "password",
            "description": "The user's chosen password (min 8 characters)."
          }
        },
        "required": [
          "username",
          "password"
        ]
      },
      "UserRegisterResponse": {
        "type": "object",
        "properties": {
          "user": {
            "type": "string",
            "description": "The unique identifier of the newly registered user."
          }
        },
        "required": [
          "user"
        ]
      },
      "UserLoginRequest": {
        "type": "object",
        "properties": {
          "username": {
            "type": "string",
            "description": "The user's username."
          },
          "password": {
            "type": "string",
            "format": "password",
            "description": "The user's password."
          }
        },
        "required": [
          "username",
          "password"
        ]
      },
      "UserLoginResponse": {
        "type": "object",
        "properties": {
          "user": {
            "type": "string",
            "description": "The unique identifier of the logged-in user."
          },
          "sessionId": {
            "type": "string",
            "description": "The session token for the authenticated user."
          }
        },
        "required": [
          "user",
          "sessionId"
        ]
      },
      "UserLogoutRequest": {
        "type": "object",
        "properties": {
          "sessionId": {
            "type": "string",
            "description": "The session ID to invalidate for logout."
          }
        },
        "required": [
          "sessionId"
        ]
      },
      "GetActiveSessionRequest": {
        "type": "object",
        "properties": {
          "sessionId": {
            "type": "string",
            "description": "The session ID to retrieve details for."
          }
        },
        "required": [
          "sessionId"
        ]
      },
      "SessionDocOutput": {
        "type": "object",
        "description": "Details of an active user session.",
        "properties": {
          "user": {
            "type": "string",
            "description": "The ID of the user associated with this session."
          },
          "sessionId": {
            "type": "string",
            "description": "The active session token string."
          },
          "expirationTime": {
            "type": "number",
            "description": "Unix timestamp (milliseconds) when the session expires."
          }
        },
        "required": [
          "user",
          "sessionId",
          "expirationTime"
        ]
      },
      "GetUserByUsernameRequest": {
        "type": "object",
        "properties": {
          "username": {
            "type": "string",
            "description": "The username to search for."
          }
        },
        "required": [
          "username"
        ]
      },
      "GetUserByIdRequest": {
        "type": "object",
        "properties": {
          "userId": {
            "type": "string",
            "description": "The user ID to search for."
          }
        },
        "required": [
          "userId"
        ]
      },
      "UserDocOutput": {
        "type": "object",
        "description": "Public representation of a user, excluding sensitive data like password hash.",
        "properties": {
          "_id": {
            "type": "string",
            "description": "The unique identifier of the user."
          },
          "username": {
            "type": "string",
            "description": "The user's username."
          }
        },
        "required": [
          "_id",
          "username"
        ]
      }
    },
    "responses": {
      "ErrorResponse": {
        "description": "Error response for failed actions or queries",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "error": {
                  "type": "string",
                  "description": "A descriptive error message indicating why the operation failed."
                }
              },
              "required": [
                "error"
              ]
            }
          }
        }
      }
    }
  }
}
```
