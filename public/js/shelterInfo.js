// Shelter Information page script (admin).
// The shelter's info and its pets are rendered by the server (shelterInfo.pug).
// This script handles the buttons on the page.

// The shelter's current ID (stored on the form by the server). The URLs below use it.
const shelterForm = document.getElementById("shelterForm");
const shelterId = shelterForm.dataset.shelterId;


// ---------- Shelter Information: Save Changes ----------
// Sends { id, name, city, processingFee } as JSON via PUT /admin/shelters/:sID
shelterForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const updatedShelter = {
        id: document.getElementById("shelterIdInput").value.trim(),
        name: document.getElementById("shelterNameInput").value.trim(),
        city: document.getElementById("shelterCityInput").value.trim(),
        processingFee: document.getElementById("shelterFeeInput").value.trim()
    };

    try {
        const response = await fetch("/admin/shelters/" + shelterId, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedShelter)
        });
        if (!response.ok)
            throw new Error(await response.text());

        const savedShelter = await response.json();
        alert("The changes to \"" + savedShelter.name + "\" were accepted.");
        // Load the page again from the server (at the new URL if the ID changed)
        location.replace("/admin/shelters/" + savedShelter.id);
    } catch (error) {
        alert("The changes were rejected: " + error.message);
    }
});


// ---------- Pet Details: elements used below ----------
const petDetailsSection = document.getElementById("petDetailsSection");
const petForm = document.getElementById("petForm");
const petImage = document.getElementById("petImage");
const petImageNameInput = document.getElementById("petImageName");
const petImageFileInput = document.getElementById("petImageFile");
const petIdInput = document.getElementById("petIdInput");
const petTypeInput = document.getElementById("petTypeInput");
const petNameInput = document.getElementById("petNameInput");
const petBreedInput = document.getElementById("petBreedInput");
const petAgeInput = document.getElementById("petAgeInput");
const petFeeInput = document.getElementById("petFeeInput");
const petHealthInput = document.getElementById("petHealthInput");
const petTraitsInput = document.getElementById("petTraitsInput");

// remembers The image file chosen with Choose New Image (null = keep the current image).
// It is remembered here so it can be sent to the server when saving.
let chosenImageFile = null;

// The Pet Details form has two modes: editing an existing pet, or adding a new one (New Pet)
const savePetBtn = document.getElementById("savePetBtn");
let addingNewPet = false;


// ---------- List of Pets: selecting a row shows that pet's details ----------
document.querySelectorAll(".pet-row").forEach(row => {
    row.addEventListener("click", (e) => {
        // Clicks on the row's remove button are handled by the remove code below
        if (e.target.closest(".remove-btn"))
            return;

        // Highlight only the selected row
        document.querySelectorAll(".pet-row.selected").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");

        // The server injected the pet's full data into the row (data-pet attribute)
        const pet = JSON.parse(row.dataset.pet);
        showPetDetails(pet);
    });
});

// Fill every Pet Details field with the pet's data and show the section
function showPetDetails(pet) {
    petIdInput.value = pet.id;
    petTypeInput.value = pet.type;   // matches one of the 5 <option> values
    petNameInput.value = pet.name;
    petBreedInput.value = pet.breed;
    petAgeInput.value = pet.age;
    petFeeInput.value = pet.adoptionFee;
    petHealthInput.value = pet.health;
    petTraitsInput.value = pet.traits.join(", ");  // array -> "Friendly, Energetic"

    // The image is stored as "images/dog1.jpg"; show it and its file name
    // The leading / makes it load from the site root
    petImage.onload = null;
    petImage.src = "/" + pet.image;
    petImageNameInput.value = pet.image.split("/").pop();

    // Forget any image chosen for the previously selected pet
    chosenImageFile = null;
    petImageFileInput.value = "";

    // Editing an existing pet (the New Pet button may have switched the mode)
    addingNewPet = false;
    savePetBtn.textContent = "Save Changes";

    petDetailsSection.hidden = false;
}


// ---------- Pet Details: Cancel ----------
// Hide the section without sending anything, so no data is changed
document.getElementById("cancelPetBtn").addEventListener("click", () => {
    petDetailsSection.hidden = true;
    document.querySelectorAll(".pet-row.selected").forEach(r => r.classList.remove("selected"));
    chosenImageFile = null;
    petImageFileInput.value = "";
});


// ---------- List of Pets: New Pet ----------
// Shows an empty Pet Details section with the default image, ready to add a pet
document.getElementById("newPetBtn").addEventListener("click", () => {
    document.querySelectorAll(".pet-row.selected").forEach(r => r.classList.remove("selected"));

    petForm.reset();   // empties every field in the form (including the file picker)
    petImage.onload = null;
    petImage.src = "/images/unknownPet.jpg";
    petImageNameInput.value = "unknownPet.jpg";
    chosenImageFile = null;

    addingNewPet = true;
    savePetBtn.textContent = "Add Pet";
    petDetailsSection.hidden = false;
});


// ---------- Pet Details: Choose New Image (preview) ----------
petImageFileInput.addEventListener("change", () => {
    const localFile = petImageFileInput.files[0];
    if (!localFile)
        return;   // the user closed the file picker without choosing

    chosenImageFile = localFile;
    petImageNameInput.value = localFile.name;

    // Browsers block <img src="C:\...">, so make a temporary in-memory URL for the file
    const fileURL = URL.createObjectURL(localFile);
    petImage.onload = () => URL.revokeObjectURL(fileURL);  // free the memory once it is shown
    petImage.src = fileURL;
});


// ---------- Pet Details: Save Changes ----------
// Sends the pet's data via PUT /admin/shelters/:sID/pets/:pID
petForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Every field except the ID (read-only) is required
    const petData = {
        type: petTypeInput.value.trim(),
        name: petNameInput.value.trim(),
        breed: petBreedInput.value.trim(),
        age: petAgeInput.value.trim(),
        adoptionFee: petFeeInput.value.trim(),
        health: petHealthInput.value.trim(),
        traits: petTraitsInput.value.trim()
    };

    //Object.keys gives the field names: ["type","name",...].
    // filter keeps only the empty ones If there are any, it shows an alert listing them and returns
    const blankFields = Object.keys(petData).filter(field => (petData[field] === ""));
    if (blankFields.length > 0) {
        alert("Please fill in these fields before saving: " + blankFields.join(", "));
        return;   // nothing is sent to the server
    }

    // Add Pet (New Pet mode): POST /admin/shelters/:sID/pets
    if (addingNewPet) {
        // Include the image name (unknownPet.jpg unless a new image was chosen), but NOT the pet ID:
        // the server chooses the new pet's ID
        petData.imageName = petImageNameInput.value;
        try {
            const response = await fetch("/admin/shelters/" + shelterId + "/pets", {
                method: "POST",
                ...buildPetRequest(petData)
            });
            if (!response.ok)
                throw new Error(await response.text());

            const newPet = await response.json();
            alert("Pet \"" + newPet.name + "\" was added successfully (ID: " + newPet.id + ").");
            location.reload();   // the table shows the new pet, and Pet Details is hidden again
        } catch (error) {
            alert("Could not add the pet: " + error.message);
        }
        return;
    }

    // Save Changes (editing an existing pet): PUT /admin/shelters/:sID/pets/:pID
    try {
        const response = await fetch("/admin/shelters/" + shelterId + "/pets/" + petIdInput.value, {
            method: "PUT",
            ...buildPetRequest(petData)
        });
        if (!response.ok)
            throw new Error(await response.text());

        const savedPet = await response.json();
        alert("The changes to \"" + savedPet.name + "\" were accepted.");
        location.reload();   // the table shows the saved values
    } catch (error) {
        alert("The changes were rejected: " + error.message);
    }
});

// Build the fetch() headers/body for a pet's data:
//  - no new image: plain JSON
//  - new image chosen: FormData, so the image file can travel with the fields
//    (no Content-Type header here; the browser sets it, including the multipart boundary)
function buildPetRequest(petData) {
    if (!chosenImageFile) {
        return {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(petData)
        };
    }
    const formData = new FormData();
    for (const field in petData)
        formData.append(field, petData[field]);
    formData.append("image", chosenImageFile);
    return { body: formData };
}


// ---------- List of Pets: remove buttons ----------
// Sends DELETE /admin/shelters/:sID/pets/:pID after the user confirms
document.querySelectorAll(".pet-row .remove-btn").forEach(removeBtn => {
    removeBtn.addEventListener("click", async () => {
        const petId = removeBtn.dataset.petId;
        const petName = removeBtn.dataset.petName;

        if (!confirm("Are you sure you want to remove \"" + petName + "\" (" + petId + ") from this shelter?"))
            return;

        try {
            const response = await fetch("/admin/shelters/" + shelterId + "/pets/" + petId, { method: "DELETE" });
            if (!response.ok)
                throw new Error(await response.text());

            alert(await response.text());
            location.reload();   // the table no longer has that pet
        } catch (error) {
            alert("Could not remove the pet: " + error.message);
        }
    });
});
