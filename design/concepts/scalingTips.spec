<concept_spec>
concept ScalingTips

purpose
    manages and stores context specific tips for cooking methods inputted by the user

principle given a cooking method, the tip scaler will generate tips on scaling up/down
          these tips can be inserted manually as a fallback or by an LLM typically

state
    a map of cooking methods to a set of tips. tips contain:
        the tip
        scale up/down
        optional recipe name for context

actions
    addManualTip (cookingMethod: string, direction: string, tip: string, recipe: string): ()
        requires cookingMethod to be in list of cookingMethods associated with recipe, direction to be "up" or "down"
        effect adds a new tip record to the database

    addAITip (cookingMethod: string, direction: string, recipe: string): (tip: string)
        requires cookingMethod to be in list of cookingMethods associated with recipe, direction to be "up" or "down"
        effect prompts the LLM to return a tip record to the database

    removeTip (cookingMethod: string): ()
        requires cookingMethod to be in tips database
        effect removes all associated tips from the database

    getTips (cookingMethod: string, direction: string, recipe: string): (tips: List[string])
        requires cookingMethod to be in tips database along with direction and recipe
        effect returns the associated tips
</concept_spec>