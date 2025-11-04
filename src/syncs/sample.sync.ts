/**
 * Sample synchronizations: feel free to delete this entire file!
 */

import {
  LikertSurvey,
  Recipe,
  RecipeScaler,
  Requesting,
  ScalingTips,
  UserAuthentication,
} from "@concepts";
import { actions, Frames, Sync } from "@engine";

// ===== LikertSurvey Syncs =====

export const CreateSurveyRequest: Sync = (
  { request, author, title, scaleMin, scaleMax },
) => ({
  when: actions([
    Requesting.request,
    { path: "/LikertSurvey/createSurvey", author, title, scaleMin, scaleMax },
    { request },
  ]),
  then: actions([LikertSurvey.createSurvey, {
    author,
    title,
    scaleMin,
    scaleMax,
  }]),
});

export const CreateSurveyResponse: Sync = ({ request, survey }) => ({
  when: actions(
    [Requesting.request, { path: "/LikertSurvey/createSurvey" }, { request }],
    [LikertSurvey.createSurvey, {}, { survey }],
  ),
  then: actions([Requesting.respond, { request, survey }]),
});

export const AddQuestionRequest: Sync = ({ request, survey, text }) => ({
  when: actions([
    Requesting.request,
    { path: "/LikertSurvey/addQuestion", survey, text },
    { request },
  ]),
  then: actions([LikertSurvey.addQuestion, { survey, text }]),
});

export const AddQuestionResponse: Sync = ({ request, question }) => ({
  when: actions(
    [Requesting.request, { path: "/LikertSurvey/addQuestion" }, { request }],
    [LikertSurvey.addQuestion, {}, { question }],
  ),
  then: actions([Requesting.respond, { request, question }]),
});

// ===== RecipeScaler Syncs =====

export const ScaleManuallyRequest: Sync = (
  { request, baseRecipeId, targetServings },
) => ({
  when: actions([
    Requesting.request,
    { path: "/RecipeScaler/scaleManually", baseRecipeId, targetServings },
    { request },
  ]),
  then: actions([RecipeScaler.scaleManually, { baseRecipeId, targetServings }]),
});

export const ScaleManuallyResponse: Sync = ({ request, scaledRecipeId }) => ({
  when: actions(
    [Requesting.request, { path: "/RecipeScaler/scaleManually" }, { request }],
    [RecipeScaler.scaleManually, {}, { scaledRecipeId }],
  ),
  then: actions([Requesting.respond, { request, scaledRecipeId }]),
});

export const ScaleRecipeAIRequest: Sync = (
  { request, baseRecipeId, targetServings },
) => ({
  when: actions([
    Requesting.request,
    { path: "/RecipeScaler/scaleRecipeAI", baseRecipeId, targetServings },
    { request },
  ]),
  then: actions([RecipeScaler.scaleRecipeAI, { baseRecipeId, targetServings }]),
});

export const ScaleRecipeAIResponse: Sync = ({ request, scaledRecipeId }) => ({
  when: actions(
    [Requesting.request, { path: "/RecipeScaler/scaleRecipeAI" }, { request }],
    [RecipeScaler.scaleRecipeAI, {}, { scaledRecipeId }],
  ),
  then: actions([Requesting.respond, { request, scaledRecipeId }]),
});

// ===== ScalingTips Syncs =====

export const AddManualScalingTipRequest: Sync = (
  { request, cookingMethod, direction, tipText, addedBy },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ScalingTips/addManualScalingTip",
      cookingMethod,
      direction,
      tipText,
      addedBy,
    },
    { request },
  ]),
  then: actions([
    ScalingTips.addManualScalingTip,
    { cookingMethod, direction, tipText, addedBy },
  ]),
});

export const AddManualScalingTipResponse: Sync = ({ request, tipId }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScalingTips/addManualScalingTip" },
      { request },
    ],
    [ScalingTips.addManualScalingTip, {}, { tipId }],
  ),
  then: actions([Requesting.respond, { request, tipId }]),
});

export const RequestTipGenerationRequest: Sync = (
  { request, recipeContext },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScalingTips/requestTipGeneration", recipeContext },
    { request },
  ]),
  then: actions([ScalingTips.requestTipGeneration, { recipeContext }]),
});

export const RequestTipGenerationResponse: Sync = ({ request, tipIds }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScalingTips/requestTipGeneration" },
      { request },
    ],
    [ScalingTips.requestTipGeneration, {}, { tipIds }],
  ),
  then: actions([Requesting.respond, { request, tipIds }]),
});

// ===== Complex Syncs with Where Clauses =====

/**
 * Authenticated Recipe Creation
 * Validates that the user has an active session before allowing recipe creation.
 * The frontend should send sessionId in the request body.
 */
export const AuthenticatedRecipeCreation: Sync = ({
  request,
  sessionId,
  name,
  originalServings,
  ingredients,
  cookingMethods,
  authenticatedUser,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Recipe/addRecipe",
      sessionId,
      name,
      originalServings,
      ingredients,
      cookingMethods,
    },
    { request },
  ]),
  where: async (frames: Frames) => {
    // Validate session and extract user
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      { authenticatedUser },
    );
    // Only proceed if session is valid (user is authenticated)
    return withSession.filter((frame) =>
      frame[authenticatedUser] !== undefined
    );
  },
  then: actions([
    Recipe.addRecipe,
    {
      author: authenticatedUser,
      name,
      originalServings,
      ingredients,
      cookingMethods,
    },
  ]),
});

export const AuthenticatedRecipeCreationResponse: Sync = ({
  request,
  recipe,
}) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/addRecipe" }, { request }],
    [Recipe.addRecipe, {}, { recipe }],
  ),
  then: actions([Requesting.respond, { request, recipe }]),
});

/**
 * Auto-generate Tips when AI Scaling Completes
 * Automatically generates scaling tips after a recipe is scaled using AI.
 * This chains the scaling action with tip generation.
 * Note: This requires the scaleRecipeAI action to include baseRecipeId and targetServings in its output,
 * or we need to query the scaled recipe to get these values.
 */
export const AutoGenerateTipsOnAIScaling: Sync = ({
  scaledRecipeId,
  baseRecipeId,
  targetServings,
  recipeName,
  originalServings,
  ingredients,
  cookingMethods,
}) => ({
  when: actions([
    RecipeScaler.scaleRecipeAI,
    { baseRecipeId, targetServings },
    { scaledRecipeId },
  ]),
  where: async (frames: Frames) => {
    // Get the scaled recipe to extract baseRecipeId and targetServings
    // Then get the base recipe details to build recipe context
    const withScaledRecipe = await frames.queryAsync(
      RecipeScaler._getScaledRecipe,
      { scaledRecipeId },
      { baseRecipeId, targetServings },
    );
    // For each scaled recipe, get the base recipe details
    const withRecipe = await withScaledRecipe.queryAsync(
      Recipe._getRecipeById,
      { recipeId: baseRecipeId },
      { recipeName, originalServings, ingredients, cookingMethods },
    );
    return withRecipe;
  },
  then: actions([
    ScalingTips.requestTipGeneration,
    {
      recipeContext: {
        recipeId: baseRecipeId,
        name: recipeName,
        originalServings,
        targetServings,
        ingredients,
        cookingMethods,
      },
    },
  ]),
});

/**
 * Authenticated Recipe Scaling
 * Validates that the user has an active session before allowing recipe scaling.
 * The frontend should send sessionId in the request body.
 */
export const AuthenticatedScaling: Sync = ({
  request,
  sessionId,
  baseRecipeId,
  targetServings,
  authenticatedUser,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/RecipeScaler/scaleManually",
      sessionId,
      baseRecipeId,
      targetServings,
    },
    { request },
  ]),
  where: async (frames: Frames) => {
    // Validate session and extract user
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      { authenticatedUser },
    );
    // Only proceed if session is valid
    return withSession.filter((frame) =>
      frame[authenticatedUser] !== undefined
    );
  },
  then: actions([
    RecipeScaler.scaleManually,
    { baseRecipeId, targetServings },
  ]),
});

/**
 * Authenticated Recipe Deletion
 * Validates that the user owns the recipe before allowing deletion.
 * Requires both session validation and recipe ownership check.
 */
export const AuthenticatedRecipeDeletion: Sync = ({
  request,
  sessionId,
  recipeId,
  authenticatedUser,
  recipeAuthor,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/removeRecipe", sessionId, recipeId },
    { request },
  ]),
  where: async (frames: Frames) => {
    // First validate session
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      { authenticatedUser },
    );
    // Then check recipe ownership
    const withOwnership = await withSession.queryAsync(
      Recipe._getRecipeById,
      { recipeId },
      { recipeAuthor },
    );
    // Only proceed if user is authenticated AND owns the recipe
    return withOwnership.filter(
      (frame) =>
        frame[authenticatedUser] !== undefined &&
        frame[recipeAuthor] === frame[authenticatedUser],
    );
  },
  then: actions([Recipe.removeRecipe, { recipeId }]),
});

export const AuthenticatedRecipeDeletionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/removeRecipe" }, { request }],
    [Recipe.removeRecipe, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});
