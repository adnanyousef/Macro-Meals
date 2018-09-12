$(document).ready(function () {



  $(document).on("click", ".addToFavsBtn", function(event) {
    event.preventDefault();

    var recipeInfo = $(this).data("json");
    console.log(recipeInfo);

    $.ajax({
      url: "/api/addToFavs",
      method: "POST",
      data: recipeInfo
    }).then(function(data) {
      if (data.success) {
        $(this).html("Added!");
      } else {
        console.log("Something went wrong");
      }
    });

  });

});