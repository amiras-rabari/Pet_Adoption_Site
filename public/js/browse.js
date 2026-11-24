// Browse Pets page script.
// The shelter dropdown is already filled in by the server (browse.pug), so this script
// only reacts to the user: choosing a shelter (fetch and show its pets) and filtering by type.

const shelterDropdown = document.getElementById("shelterDropdown");
const petContainer = document.getElementById("petContainer");
const petTypeBar = document.getElementById("petTypeBar");

// Pets of the currently selected shelter, and the currently selected type button
let currentPets = [];
let activeType = "All";


// Get one shelter's data (including its pets) from the server and display its pets
function loadShelter(shelterId) {
    fetch("/shelters?id=" + shelterId)
        .then(res => {
            if (!res.ok)
                throw new Error("Shelter " + shelterId + " not found");
            return res.json();
        })
        .then(shelter => {
            currentPets = shelter.pets;
            activeType = "All";
            // Re-render the pet cards and the type buttons
            renderPets(currentPets);
            updatePetTypeButtons(shelter);
        })
        .catch(err => {
            console.error("Error accessing shelter information:", err);
            resetPage();
        });
}

// Reset the page to its starting state (no shelter selected, no pets shown)
function resetPage() {
    shelterDropdown.value = "";                     // reset dropdown
    currentPets = [];
    petContainer.innerHTML = "";                    // clear pets
    petTypeBar.classList.add("hidden");             // hide type bar
    petTypeBar.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));
}

// Return a histogram object of { petType: count }
function getPetTypes(pets) {
    const types = { Cat: 0, Dog: 0, Bird: 0, Reptile: 0, Other: 0 };
    pets.forEach(p => {
        types[p.type]++;
    });
    return types;
}

// Render the pets on page, grouped as little cards
function renderPets(pets) {
    petContainer.innerHTML = "";
    pets.forEach(p => {
        const card = document.createElement("div");
        card.className = "pet-card";
        card.innerHTML = `
            <img src="/${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <button>View Details</button>`;

        // Add click listener to open the pet details page for this pet
        const btn = card.querySelector("button");
        btn.addEventListener("click", () => {
            window.location.href = `/details?petId=${p.id}&shelterId=${shelterDropdown.value}`;
        });

        // Add the card to the page
        petContainer.appendChild(card);
    });
}

// Update the set of pet type buttons
function updatePetTypeButtons(shelter) {
    const counts = getPetTypes(shelter.pets);
    const buttons = petTypeBar.querySelectorAll("button");

    buttons.forEach(btn => {
        const type = btn.dataset.type;
        btn.classList.remove("active"); // make not active by default

        // Make sure that 'All' is selected/active by default and enabled
        if (type === "All") {
            btn.classList.add("active");
            btn.classList.remove("disabled");
        } else {
            // Disable types with no pets, otherwise enable
            if (counts[type] === 0)
                btn.classList.add("disabled");
            else
                btn.classList.remove("disabled");
        }
    });
    // Show the buttons now, they were hidden on start up
    petTypeBar.classList.remove("hidden");
}


// Handle shelter selection
shelterDropdown.addEventListener("change", () => {
    if (shelterDropdown.value)
        loadShelter(shelterDropdown.value);
    else
        resetPage();
});

// Handle Pet type button selection
petTypeBar.addEventListener("click", e => {
    // Don't allow selection of disabled buttons
    if (e.target.tagName !== "BUTTON" || e.target.classList.contains("disabled"))
        return;

    // Set the type to whatever was clicked on
    activeType = e.target.dataset.type;

    // Highlight the active button, and unhighlight the others
    petTypeBar.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));
    e.target.classList.add("active");

    // Adjust the pet array to be filtered based on the active type button
    const filtered = currentPets.filter(p => (activeType === "All") || (activeType === p.type));

    // Re-render the pet cards
    renderPets(filtered);
});


// On page load: if a shelter is already selected in the dropdown (the server marks it
// when we arrive from "Back to Browsing" ), show its pets.
if (shelterDropdown.value)
    loadShelter(shelterDropdown.value);
