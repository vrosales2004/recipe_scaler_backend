/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",
  // Recipe actions - using authenticated syncs instead
  "/api/Recipe/_getRecipesByAuthor": "this is a public query",
  "/api/Recipe/_getRecipeByName": "this is a public query",
  "/api/Recipe/_getRecipeById": "this is a public query",
  // RecipeScaler queries (read-only, safe for passthrough)
  "/api/RecipeScaler/_getScaledRecipe": "this is a public query",
  "/api/RecipeScaler/_findScaledRecipe": "this is a public query",
  "/api/RecipeScaler/_getScaledRecipesByBaseRecipe": "this is a public query",
  // RecipeScaler actions - using authenticated syncs instead
  // ScalingTips queries (read-only, safe for passthrough)
  "/api/ScalingTips/_getScalingTipById": "this is a public query",
  "/api/ScalingTips/_getScalingTips": "this is a public query",
  // ScalingTips actions - using passthrough for simple operations
  "/api/ScalingTips/addManualScalingTip":
    "simple action, no authentication needed",
  "/api/ScalingTips/requestTipGeneration":
    "can be called directly or via AutoGenerateTipsOnAIScaling sync",
  "/api/ScalingTips/removeScalingTip": "this is a simple deletion action",
  "/api/UserAuthentication/register": "this is a public query",
  "/api/UserAuthentication/login": "this is a public query",
  "/api/UserAuthentication/logout": "this is a public query",
  "/api/UserAuthentication/_getActiveSession": "this is a public query",
  "/api/UserAuthentication/_getUserByUsername": "this is a public query",
  "/api/UserAuthentication/_getUserById": "this is a public query",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // LikertSurvey exclusions (handled via syncs)
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",
  // Recipe actions (handled via authenticated syncs)
  "/api/Recipe/addRecipe",
  "/api/Recipe/removeRecipe",
  // RecipeScaler actions (handled via authenticated syncs)
  "/api/RecipeScaler/scaleManually",
  "/api/RecipeScaler/scaleRecipeAI",
  // RecipeScaler private methods (should not be exposed)
  "/api/RecipeScaler/createScalePrompt",
  // ScalingTips private methods (should not be exposed)
  "/api/ScalingTips/createTipGenerationPrompt",
];
