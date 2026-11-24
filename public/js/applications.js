// Applications page script.
// The applications table and the (hidden) details card are rendered by the server
// (applications.pug). This script only reacts to the user:
//   - View buttons: fetch one application (and its pet) and fill in / show the details card
//   - Status dropdowns: recolour the status cell and send the new status to the server

const STATUSES = ["Unprocessed", "Pending", "Approved", "Rejected"];
const detailsCard = document.getElementById("detailsCard");
let shownApplicationId = null;   // ID of the application currently shown in the details card


// Put a value into one of the details card's <span> fields
function setText(elementId, value) {
    document.getElementById(elementId).textContent = value ?? "";
}

// Fetch an application and its requested pet from the server, then fill in and show the details card
async function showApplicationDetails(applicationId) {
    try {
        const appResponse = await fetch("/admin/applications-details?id=" + applicationId);
        if (!appResponse.ok)
            throw new Error(await appResponse.text());
        const app = await appResponse.json();

        const petResponse = await fetch("/shelters/pets?shelterId=" + app.shelterId + "&petId=" + app.petId);
        if (!petResponse.ok)
            throw new Error(await petResponse.text());
        const pet = await petResponse.json();

        // Application Info
        setText("detailDate", app.date);
        setText("detailStatus", app.status);
        setText("detailPetId", app.petId);
        setText("detailShelterId", app.shelterId);

        // Pet Requested
        setText("detailPetName", pet.name);
        setText("detailPetType", pet.type);
        setText("detailPetBreed", pet.breed);
        setText("detailPetAge", pet.age);
        setText("detailPetDays", pet.daysAtShelter);
        const petImage = document.getElementById("detailPetImage");
        petImage.src = "/" + pet.image;
        petImage.alt = pet.name;

        // Applicant Information, Household Details and Support
        setText("detailName", app.name);
        setText("detailEmail", app.email);
        setText("detailPhone", app.phone);
        setText("detailAddress", app.address);
        setText("detailResidents", app.residents);
        setText("detailCurrentPets", app.currentPets);
        setText("detailExperience", app.experience);
        setText("detailLocation", app.location);
        setText("detailDonation", app.donation);

        shownApplicationId = applicationId;
        detailsCard.hidden = false;
    } catch (error) {
        console.error("Error loading application details:", error);
        alert("Could not load application details: " + error.message);
    }
}

// Hide the details card
function hideApplicationDetails() {
    shownApplicationId = null;
    detailsCard.hidden = true;
}

// Send an application status update to the server
function updateStatus(applicationId, status) {
    fetch("/admin/applications-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status })
    })
    .then(res => {
        if (!res.ok)
            throw new Error("Server responded with status " + res.status);
    })
    .catch(error => {
        alert("Error submitting status update: " + error.message);
    });
}


// View buttons: clicking toggles the details card for that application
const viewButtons = document.querySelectorAll(".view-btn");
viewButtons.forEach(viewBtn => {
    viewBtn.addEventListener("click", () => {
        const wasActive = viewBtn.classList.contains("active");

        // Un-highlight all View buttons
        viewButtons.forEach(btn => btn.classList.remove("active"));

        if (wasActive) {
            // Clicking the active button again closes the details
            hideApplicationDetails();
        } else {
            viewBtn.classList.add("active");
            showApplicationDetails(viewBtn.dataset.id);
        }
    });
});

// Status dropdowns: recolour the cell and save the new status on the server
document.querySelectorAll(".status-select").forEach(select => {
    select.addEventListener("change", () => {
        const statusCell = select.parentElement;
        statusCell.classList.remove(...STATUSES.map(status => "status-" + status));
        statusCell.classList.add("status-" + select.value);

        updateStatus(select.dataset.id, select.value);

        // Keep the details card in sync if it is showing this application
        if (shownApplicationId === select.dataset.id)
            setText("detailStatus", select.value);
    });
});
