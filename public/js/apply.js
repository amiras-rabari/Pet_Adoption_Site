// Adoption Application page script.
// The pet's information is already rendered by the server (apply.pug). This script only
// enables the Submit button once both agreements are checked, and sends the application.

const form = document.getElementById("adoptionForm");
const submitBtn = document.getElementById("submitBtn");
const agreement1 = document.getElementById("agreement1");
const agreement2 = document.getElementById("agreement2");

// The pet and shelter IDs were stored on the form by the server
const petId = form.dataset.petId;
const shelterId = form.dataset.shelterId;

// Enable Submit button only when both checkboxes are checked
function updateSubmitState() {
    submitBtn.disabled = !(agreement1.checked && agreement2.checked);
}
agreement1.addEventListener("change", updateSubmitState);
agreement2.addEventListener("change", updateSubmitState);
updateSubmitState();


// Handle form submission
form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Prepare the application data object. Format:
    // { petId, shelterId, name, email, phone, address, residents, currentPets, experience, location, donation }
    const application = {
        petId: petId,
        shelterId: shelterId,
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value,
        residents: document.getElementById("residents").value,
        currentPets: document.getElementById("currentPets").value,
        experience: document.getElementById("experience").value,
        location: document.getElementById("location").value,
        donation: document.getElementById("donation").value
    };

    // Send the application data to the server
    fetch("/submit-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(application)
    })
        .then(res => {
            if (!res.ok)
                throw new Error("Server responded with status " + res.status);
            // Replace form with success message
            form.innerHTML = `
            <h2>Application Submitted Successfully!</h2>
            <p>Thank you for applying to adopt a pet. Our team will review your application and contact you soon.</p>
            <a href="/" class="return-home-button">Return to Home</a>`;
        })
        .catch(error => {
            alert("Error submitting application: " + error.message);
        });
});
