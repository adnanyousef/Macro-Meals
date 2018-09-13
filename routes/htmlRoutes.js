var db = require("../models");
var isAuthenticated = require("../config/middleware/isAuthenticated");
var path = require("path");
var buildQueryURL = require("../edamam");
var request = require("request");

module.exports = function(app) {
  // Load index page
  app.get("/", function(req, res) {
    res.sendFile(path.resolve(__dirname, "../public/main.html"));
  });

  // Load create account page
  app.get("/createAccount", function(req, res) {
    res.sendFile(path.resolve(__dirname, "../public/createAccount.html"));
  });

  // Load a user's profile
  app.get("/profile", isAuthenticated, function(req, res) {
    var username = req.user.username;
    var userId = req.user.id;

    db.User.findOne({
      where: {
        username: username
      },
      include: [
        {
          model: db.Favorite,
          where: {
            UserId: userId
          },
          required: false
        }
      ]
    }).then(function(data) {
      if (data == null) {
        return res.send(`Username ${username} not found`);
      }
      var favs = data.Favorites;
      res.render("profile", { data: data, favs: favs });
    });
  });

  // Search for a recipe, render handlebars
  app.get("/recipeSearch/:protein/:lower/:upper/:diet", function(req, res) {
    if (!req.user) {
      return res.json({ success: false, message: "You are not signed in" });
    }
    var queryURL = buildQueryURL(
      req.params.protein,
      req.params.lower,
      req.params.upper,
      "alcohol-free",
      req.params.diet
    );
    var mealCount = parseInt(req.query.mealCount) || 4;
    var suggested = {
      mealCount: mealCount,
      calsPerMeal: req.user.recCals / mealCount,
      proteinPerMeal: req.user.protein / mealCount,
      fatsPerMeal: req.user.fats / mealCount,
      carbsPerMeal: req.user.carbs / mealCount
    };

    request(queryURL, function(err, response, body) {
      if (err) {
        throw err + response;
      }

      if (body[0] === "<") {
        return res.json({ success: false, message: "Bad API input" });
      }

      var rawData = JSON.parse(body);
      var data = [];
      for (var i = 0; i < rawData.hits.length; i++) {
        var recipe = {
          id: i + 1,
          title: rawData.hits[i].recipe.label,
          url: rawData.hits[i].recipe.url,
          pic: rawData.hits[i].recipe.image,
          time: rawData.hits[i].recipe.totalTime,
          calories: rawData.hits[i].recipe.calories,
          fats: rawData.hits[i].recipe.totalNutrients.FAT.quantity,
          protein: rawData.hits[i].recipe.totalNutrients.PROCNT.quantity,
          carbs: rawData.hits[i].recipe.totalNutrients.CHOCDF.quantity,
          serves: rawData.hits[i].recipe.yield
        };
        // Calculate date for individual servings
        recipe.calories = Math.round(recipe.calories / recipe.serves);
        recipe.carbs = Math.round(recipe.carbs / recipe.serves);
        recipe.protein = Math.round(recipe.protein / recipe.serves);
        recipe.fats = Math.round(recipe.fats / recipe.serves);

        var recipeString = JSON.stringify(recipe);
        recipe.jsonData = recipeString;

        data.push(recipe);
      }
      res.render("results", { data: data, suggested: suggested });
    });
  });

  app.get("/updateMacros", function(req, res) {
    res.sendFile(path.resolve(__dirname, "../public/updateMacros.html"));
  });

  // Render 404 page for any unmatched routes
  app.get("*", function(req, res) {
    res.render("404");
  });
};
