<concept_spec>
concept Scaler

purpose
    manages an instance of a Recipe being scaled by a certain factor

principle given a recipe name to search in database of recipes
          uses the LLM to scale the recipe with the entire recipe as context
          stores the scaled number of ingredients to be accessed by the user later

state
    a set of scaledRecipes
        a name
        a number of servings
        a set of ingredients

actions
    scaleManually (name: String, targetPeople: number): (result: List[Ingredient])
        requires name to be in database of Recipes and targetPeople to not equal number of servings of Recipe
        effect returns and stores the list of ingredients after each being scaled linearly according to the scale factor
        
    scaleRecipeAI (name: String, targetPeople: number): (result: List[Ingredient])
        requires name to be in database of recipes and targetPeople to not equal number of servings of Recipe
        effect inputs the entire recipe in an LLM to use as context when deciding how much to scale each ingredient and returns and stores list of ingredients

    getScaledRecipe (name: String, targetPeople: number): (result: List[Ingredient])
        requires name and targetPeople to be in database of scaled recipes
        effect returns list of ingredients of the recipe in the database
</concept_spec>