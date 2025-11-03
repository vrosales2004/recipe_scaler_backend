/**
 * Sample synchronizations: feel free to delete this entire file!
 */

import { LikertSurvey, RecipeScaler, Requesting, ScalingTips } from "@concepts";
import { actions, Sync } from "@engine";

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
