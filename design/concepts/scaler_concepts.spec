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

concept Recipe

purpose
    stores an original recipe

principle recipe manually inputted or uploaded with original ingredients and number of people
          stores recipes to be accessed by scaler

state
    a set of recipes
        a unique name
        a number of servings
        a set of cooking methods
        a set of ingredients
            a quantity
            a unit
            a scaling context

actions
    enterRecipe (name: String, originalPeople: Number, targetPeople: number, ingredients: List[Ingredient], cookingMethods: List[String]): ()
        requires targetPeople to be a whole number and name to be unique
        effect creates a scale factor based on the original number of people and the target amount and enters this recipe into the set of recipes. Optional cooking methods can be added to be associated with the recipe.

    removeRecipe (name: String): ()
        requires name to be in set of recipes
        effect removes recipe from scaler

    getIngredients (name: String): (ingredients: List[Ingredient])
        requires name to be in set of recipes
        effect returns ingredients list of stored recipe

    getServings (name: String): (servings: number)
        requires name to be in set of recipes
        effect returns number of servings of associated recipe

    getCookingMethods (name: String): (List[String])
        requires name to be in set of recipes
        effect returns cooking methods list of stored recipe
</concept_spec>