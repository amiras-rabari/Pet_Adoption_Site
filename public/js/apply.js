// Adoption Application page script.
// The pet's information is already rendered by the server (apply.pug). This script only
// greys out the Submit button while the form is incomplete, and sends the application.

const form = document.getElementById("adoptionForm");
const submitBtn = document.getElementById("submitBtn");

// The pet and shelter IDs were stored on the form by the server
const petId = form.dataset.petId;
const shelterId = form.dataset.shelterId;

// Grey out the Submit button (CSS class "incomplete") until every rule in the form passes
// (all required fields filled in, residents >= 1, valid email, both agreements checked).
// checkValidity() asks the browser to test all the required/pattern/min/type rules from apply.pug.
// The button is NOT disabled: clicking it while incomplete lets the browser block the submit
// and point the user to the first field that needs fixing.
function updateSubmitState() {
    submitBtn.classList.toggle("incomplete", !form.checkValidity());
}
form.addEventListener("input", updateSubmitState);   // typing in text fields
form.addEventListener("change", updateSubmitState);  // dropdowns and checkboxes
updateSubmitState();


// Handle form submission (the browser only fires this once the form is valid)
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
