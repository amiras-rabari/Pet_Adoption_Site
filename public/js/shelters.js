// Shelters page script (admin).
// The shelter list is rendered by the server (shelters.pug). This script only handles:
//   - Add Shelter form: check for blanks, send the new shelter to the server, refresh the page
//   - Remove buttons: confirm, ask the server to delete that shelter, refresh the page

const addShelterForm = document.getElementById("addShelterForm");
const shelterNameInput = document.getElementById("shelterName");
const shelterCityInput = document.getElementById("shelterCity");
const shelterFeeInput = document.getElementById("shelterFee");


// Add Shelter: send { name, city, processingFee } as JSON via POST /admin/shelters
addShelterForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = shelterNameInput.value.trim();
    const city = shelterCityInput.value.trim();
    const fee = shelterFeeInput.value.trim();

    // Nothing is sent to the server if any field is blank (or only spaces)
    if (!name || !city || !fee) {
        alert("The shelter name, city and processing fee must not be blank.");
        return;
    }

    try {
        const response = await fetch("/admin/shelters", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",  // what we are sending
                "Accept": "application/json"         // what we want back
            },
            body: JSON.stringify({ name: name, city: city, processingFee: Number(fee) })
        });
        if (!response.ok)
            throw new Error(await response.text());

        const newShelter = await response.json();
        alert("Shelter \"" + newShelter.name + "\" was added successfully (ID: " + newShelter.id + ").");
        location.reload(); // re-request the page so the server renders the list with the new shelter
    } catch (error) {
        alert("Could not add the shelter: " + error.message);
    }
});


// Remove buttons: each one knows its shelter's ID and name from its data-id / data-name attributes
document.querySelectorAll(".remove-btn").forEach(removeBtn => {
    removeBtn.addEventListener("click", async () => {
        const shelterId = removeBtn.dataset.id;
        const shelterName = removeBtn.dataset.name;

        // Make sure the user really wants to delete it
        if (!confirm("Are you sure you want to delete \"" + shelterName + "\" (" + shelterId + ")?\nAll of its pets will be removed as well."))
            return;

        try {
            // The shelter ID is part of the route (/admin/shelters/s6), not a query parameter
            const response = await fetch("/admin/shelters/" + shelterId, { method: "DELETE" });
            if (!response.ok)
                throw new Error(await response.text());

            alert(await response.text());
            location.reload(); // re-render the list without the deleted shelter
        } catch (error) {
            alert("Could not delete the shelter: " + error.message);
        }
    });
});
