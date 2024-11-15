"use client";

import React, { useEffect, useState } from "react";
import Popup from "./components/Popup";
import { Food } from "./models/Food";
import { useRouter } from "next/navigation";

type FoodStorage = "shelf" | "fridge" | "freezer";

interface Recipe {
  title: string;
  ingredients: string[];
  steps: string[];
  image_url: string;
}

interface HoverImageProps {
  defaultImage: string;
  hoverImage: string;
  altText: string;
  section: "shelf" | "fridge" | "freezer";
  handleOpenPopup: (section: "shelf" | "fridge" | "freezer") => void;
}

function HoverImage({
  defaultImage,
  hoverImage,
  altText,
  section,
  handleOpenPopup,
}: HoverImageProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <div
        id={`${section}-title`}
        className="hidden xl:block xl:w-1/5 2xl:w-2/5 h-auto"
      >
        <h2
          className={`flex justify-center w-1/2 cursor-pointer rounded-lg p-2  transform transition-transform duration-300 shadow-lg ${
            isHovered
              ? "bg-orange-500 scale-110 text-white text-lg"
              : "bg-white text-md"
          }`}
          onClick={() => handleOpenPopup(section)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {section.charAt(0).toUpperCase() + section.slice(1)}{" "}
        </h2>
      </div>
      <div
        id={`${section}-img`}
        className="w-full md:w-2/3 xl:w-4/5 2xl:w-3/5 h-full cursor-pointer relative overflow-hidden"
        onClick={() => handleOpenPopup(section)}
      >
        <img
          className="w-full h-full object-fill"
          src={isHovered ? hoverImage : defaultImage}
          alt={altText}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ transition: "0.3s ease" }}
        />
      </div>
    </>
  );
}

export default function Home() {
  const [activeStorage, setActiveStorage] = useState<FoodStorage | null>(null);
  const [fridgeData, setFridgeData] = useState<Record<FoodStorage, Food[]>>({
    shelf: [],
    fridge: [],
    freezer: [],
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [uniqueIngredients, setUniqueIngredients] = useState<string[]>([]);

  const [foods, setFoods] = useState<Food[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [filteredIngredients, setFilteredIngredients] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mainIngredient, setMainIngredient] = useState<string | null>(null);
  const [pantryIngredients, setPantryIngredients] = useState<string[]>([]);
  const [suggestSubstitution, setSuggestSubstitution] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe>({
    title: "",
    ingredients: [],
    steps: [],
    image_url: "",
  });

  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in by calling an API to check session
    const checkSession = async () => {
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(data.isLoggedIn);
      } else {
        setIsLoggedIn(false);
      }
    };
    checkSession();
  }, []);

  const handleLoginLogout = () => {
    if (isLoggedIn) {
      // Log out by clearing session and redirecting
      fetch("/api/auth/signout", { method: "DELETE" }).then(() => {
        setIsLoggedIn(false);
        router.push("/signin"); // Redirect to login page
      });
    } else {
      // Redirect to login page
      router.push("/signin");
    }
  };

  // GET - Fetch fridge data on mount and store it in memory
  useEffect(() => {
    const fetchFridgeData = async () => {
      const response = await fetch("/api/home/fridge-data"); // Adjust endpoint as needed
      if (response.ok) {
        const data = await response.json();
        setFridgeData({
          shelf: data.shelf || [],
          fridge: data.fridge || [],
          freezer: data.freezer || [],
        });
        setUniqueIngredients(data.uniqueIngredients || []);
      }
    };
    fetchFridgeData();
  }, []);

  // POST
  const handleAddFood = async (item: Food) => {
    if (!isLoggedIn) {
      router.push("/signin");
    }

    if (!item.name.trim()) {
      alert("Please fill in the food name");
      return;
    }

    if (activeStorage) {
      const response = await fetch(`/api/home/${activeStorage}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (response.ok) {
        setFridgeData((prevData) => ({
          ...prevData,
          [activeStorage]: [...prevData[activeStorage], item],
        }));
        setFoods((prevItems) => [...prevItems, item]);
      }
    }
  };

  // DELETE
  const handleDeleteFood = async (index: number) => {
    if (!isLoggedIn) {
      router.push("/signin");
    }

    if (activeStorage) {
      const response = await fetch(`./api/home/${activeStorage}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }), // Pass the index or unique ID
      });
      if (response.ok) {
        setFridgeData((prevData) => ({
          ...prevData,
          [activeStorage]: prevData[activeStorage].filter(
            (_, i) => i !== index
          ),
        }));
        setFoods((prevItems) => prevItems.filter((_, i) => i !== index));
      }
    }
  };

  // PUT
  const handleEditFood = async (index: number, updatedItem: Food) => {
    if (!isLoggedIn) {
      router.push("/signin");
    }

    if (!updatedItem.name.trim()) {
      alert("Please fill in the food name");
      return;
    }

    if (activeStorage) {
      const response = await fetch(`./api/home/${activeStorage}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index, updatedItem }),
      });
      if (response.ok) {
        setFridgeData((prevData) => ({
          ...prevData,
          [activeStorage]: prevData[activeStorage].map((item, i) =>
            i === index ? updatedItem : item
          ),
        }));
        setFoods((prevItems) =>
          prevItems.map((item, i) => (i === index ? updatedItem : item))
        );
      }
    }
  };

  // Dropdown filtering logic for main ingredient selection
  useEffect(() => {
    const fridgeIngredients = [
      ...fridgeData.shelf.map((item) => item.name.toLowerCase()),
      ...fridgeData.fridge.map((item) => item.name.toLowerCase()),
      ...fridgeData.freezer.map((item) => item.name.toLowerCase()),
    ];

    const availableIngredients = uniqueIngredients.filter((ingredient) =>
      ingredient.toLowerCase().startsWith(inputValue.toLowerCase())
    );

    const prioritizedIngredients = availableIngredients.sort((a, b) => {
      const aInFridge = fridgeIngredients.includes(a);
      const bInFridge = fridgeIngredients.includes(b);
      return aInFridge === bInFridge ? 0 : aInFridge ? -1 : 1;
    });

    setFilteredIngredients(prioritizedIngredients);

    // Open the dropdown only when there is input
    setIsDropdownOpen(inputValue.length > 0);
  }, [inputValue, uniqueIngredients, fridgeData]);

  // Handle selection of ingredient from dropdown
  const handleIngredientSelect = (ingredient: string) => {
    setMainIngredient(ingredient);
    setInputValue(ingredient);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    // Generate pantry ingredients when main ingredient is selected
    if (mainIngredient) {
      const allFridgeItems = [
        ...fridgeData.shelf.map((item) => item.name.toLowerCase()),
        ...fridgeData.fridge.map((item) => item.name.toLowerCase()),
        ...fridgeData.freezer.map((item) => item.name.toLowerCase()),
      ];

      // Exclude the main ingredient to form pantry ingredients
      const filteredPantryIngredients = allFridgeItems.filter(
        (item) => item !== mainIngredient.toLowerCase()
      );

      setPantryIngredients(filteredPantryIngredients);
    }
  }, [mainIngredient, fridgeData]);

  const handleGenerateRecipe = async () => {
    if (!isLoggedIn) {
      router.push("/signin");
    }

    setIsLoading(true);

    const payload = {
      main_ingredients: mainIngredient ? [mainIngredient] : [],
      pantry_ingredients: pantryIngredients,
      suggest_substitution: suggestSubstitution, // Include boolean value from checkbox
    };

    try {
      const response = await fetch("/api/home/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const recipeData = data.data;
        const formattedRecipe: Recipe = {
          title: recipeData.title || "Untitled Recipe",
          image_url: recipeData.image_url || "",
          ingredients: recipeData.ingredients || [],
          steps: recipeData.steps || [],
        };
        setRecipe(formattedRecipe);
      } else {
        console.warn("Failed to generate recipe.");
      }
    } catch (error) {
      console.error("Error generating recipe:", error);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  // Handler to open the popup for each section
  const handleOpenPopup = (storage: FoodStorage) => {
    setActiveStorage(storage);
    setFoods(fridgeData[storage]); // Load the selected section's food data from memory
  };
  const handleClosePopup = () => setActiveStorage(null);

  return (
    <>
      <header
        className="flex justify-between
       items-center w-full h-[10%] px-4 bg-black"
      >
        {/* Login/Logout Button */}
        <div></div>
        <h1 className="text-4xl font-bold text-white cursor-pointer">
          Intelli Foods
        </h1>
        <div className="flex w-auto h-auto">
          <button
            onClick={handleLoginLogout}
            className={`px-4 py-2 text-white rounded ${
              isLoggedIn ? "bg-red-500" : "bg-blue-500"
            }`}
          >
            {isLoggedIn ? "Log Out" : "Log In"}
          </button>
        </div>
      </header>
      <main className=" flex flex-col h-auto lg:h-[85%] lg:flex-row overflow-y-scroll">
        {/* Desktop left section - Kitchen */}
        <section
          id="kitchen"
          className="flex h-[75vh] lg:h-full w-full 2xl:w-1/2 flex-col justify-end items-center px-8"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 1) 90%), linear-gradient(to right, #fef08a, #facc15)",
          }}
        >
          <div id="shelf-row" className="flex w-full h-[25%] justify-center">
            <HoverImage
              section="shelf"
              defaultImage="/images/shelf-close.png"
              hoverImage="/images/shelf-open.png"
              altText="Fridge"
              handleOpenPopup={handleOpenPopup}
            />
          </div>

          <div id="fridge-row" className="flex w-full h-[40%] justify-center">
            <HoverImage
              section="fridge"
              defaultImage="/images/fridge-close.png"
              hoverImage="/images/fridge-open.png"
              altText="Fridge"
              handleOpenPopup={handleOpenPopup}
            />
          </div>

          <div id="freezer-row" className="flex w-full h-[25%] justify-center">
            <HoverImage
              section="freezer"
              defaultImage="/images/freezer-close.png"
              hoverImage="/images/freezer-open.png"
              altText="Fridge"
              handleOpenPopup={handleOpenPopup}
            />
          </div>
        </section>

        {/* Desktop right section - Recipe Generator */}
        <section
          id="recipe-generator"
          className="w-full flex h-[85vh] 2xl:w-1/2 bg-white flex-col justify-start items-center gap-4 p-4 lg:p-8"
        >
          <h2 className="text-xl font-bold">Recipe Generator</h2>
          {/* Recipe Configuration */}
          <div
            id="recipe-configuration"
            className="flex flex-col w-full items-start gap-2"
          >
            {/* Drop Down for Main Ingredient */}
            <div
              id="recipe-input"
              className="flex flex-col lg:flex-row justify-between w-full px-2"
            >
              <div id="main-ingredient" className="flex gap-2">
                <label className="flex items-center text-gray-700">
                  Main Ingredient:
                </label>
                <div id="dropdown-container" className="flex flex-col">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Start typing..."
                    className="border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500 w-[200px] lg:w-[300px]"
                  />
                  {isDropdownOpen && (
                    <ul className="absolute z-5 bg-white border border-gray-300 w-[200px] lg:w-[300px] max-h-40 mt-10 overflow-y-scroll">
                      {filteredIngredients.map((ingredient) => {
                        const isAvailable = fridgeData.shelf
                          .concat(fridgeData.fridge, fridgeData.freezer)
                          .some(
                            (food) => food.name.toLowerCase() === ingredient
                          );
                        return (
                          <li
                            key={ingredient}
                            onClick={() => handleIngredientSelect(ingredient)}
                            className={`h-10 p-2 cursor-pointer hover:bg-gray-200 ${
                              isAvailable ? "text-black" : "text-gray-400"
                            }`}
                          >
                            {ingredient}
                            <span
                              className={`ml-2 ${
                                isAvailable ? "text-green-600" : "text-gray-400"
                              }`}
                            >
                              {isAvailable ? "Available" : "Unavailable"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
              {/* Suggest Substitution Radio Button */}
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={suggestSubstitution}
                    onChange={() =>
                      setSuggestSubstitution(!suggestSubstitution)
                    } // Toggle true/false
                    className="mr-2 cursor-pointer"
                  />
                  Suggest substitution
                </label>
              </div>
            </div>

            {/* Generate Recipe */}
            <button
              onClick={handleGenerateRecipe}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded h-auto"
            >
              Generate Recipe
            </button>
          </div>

          {/* Recipe Display */}
          <div
            id="recipe-display"
            className="w-full h-full overflow-y-scroll rounded-lg shadow-2xl text-black"
          >
            {isLoading ? (
              // Show a loading spinner while loading
              <div className="flex justify-center items-center h-full">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : recipe.image_url ? (
              <>
                <div id="title-ing-img" className="flex justify-between">
                  <div id="title-ing" className="flex flex-col w-3/5 lg:p-4">
                    <h3 className="w-full text-4xl xl:text-5xl font-bold mb-4">
                      {recipe.title}
                    </h3>
                    <div className="w-full">
                      <h4 className="text-xl font-semibold mb-2">
                        Ingredients:
                      </h4>
                      <ul className="list-disc pl-5">
                        {recipe.ingredients?.map((ingredient, index) => (
                          <li key={index}>{ingredient}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div id="img" className="w-2/5 aspect-square">
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="w-full h-auto object-cover rounded-bl-full shadow-md"
                    />
                  </div>
                </div>

                <div id="steps" className="p-4">
                  <h3 className="text-xl font-semibold mb-2">Steps:</h3>
                  <ol className="list-decimal pl-5">
                    {recipe.steps?.map((step, index) => (
                      <li key={index} className="mb-2">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            ) : (
              // Placeholder when no recipe is displayed
              <div className="flex justify-center items-center h-full">
                <p className="text-gray-500">No recipe generated yet.</p>
              </div>
            )}
          </div>
        </section>
        {activeStorage && (
          <Popup
            storage={activeStorage}
            items={foods}
            onClose={handleClosePopup}
            onAddFood={handleAddFood}
            onDeleteFood={handleDeleteFood}
            onEditFood={handleEditFood}
          />
        )}
      </main>
      <footer className="h-[5%] w-full bg-black"></footer>
    </>
  );
}
