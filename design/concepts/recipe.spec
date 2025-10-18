<concept_spec>
concept Recipe

purpose
    stores an original recipe

principle recipe manually inputted or uploaded with original ingredients and number of people
          stores recipes to be accessed by scaler

state
    a set of recipes
        an ID
        an author
        a unique name
        a number of servings
        a set of cooking methods
        a set of ingredients
            a quantity
            a unit
            a scaling context

actions
    addRecipe (author: string, name: String, originalPeople: Number, targetPeople: number, ingredients: List[Ingredient], cookingMethods: List[String]): (recipeID: String)
        requires targetPeople to be a whole number and name to be unique
        effect creates a scale factor based on the original number of people and the target amount and enters this recipe into the set of recipes. Optional cooking methods can be added to be associated with the recipe. returns recipe ID

    removeRecipe (name: String): ()
        requires name to be in set of recipes
        effect removes recipe from scaler

    getRecipeById (id: String): (recipe: Recipe)
        requires id to be in set of recipes
        effect returns associated recipe

    getRecipesByAuthor (author: String): (recipes: List[Recipe])
        requires author to be in set of recipes
        effect returns all recipes added by that author

    getRecipeByName (name: String, author: string): (recipe: Recipe)
        requires name and author to be in set of recipes
        effect returns recipe with that name created by that author
</concept_spec>