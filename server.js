const fs = require('fs');
const path = require('path');

const express = require('express');
const app = express();

// Submitted applications
let applications = []; // None so far

// Load the shelter data upon startup
let shelters = [];

// Get all the files in the shelters directory (assumed to be JSON)
const files = fs.readdirSync(path.join(__dirname, 'data/shelters'));

// Read each .json file and extract/add the JSON data to the shelters array
for (let i = 0; i < files.length; i++) {
    if (files[i].endsWith('.json')) {
        const data = fs.readFileSync(path.join(__dirname, 'data/shelters', files[i]), 'utf-8');
        shelters.push(JSON.parse(data));
    }
}

// Load the About Us page data (mission, teamDescription, team) once upon startup
const aboutData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'aboutData.json'), 'utf-8'));

// ---------- Express setup ----------
// Tell Express to render .pug files from the views folder
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware (runs on every request, before the routes)
app.use(express.json());                          //  parse JSON request bodies into req.body
app.use(express.urlencoded({ extended: true }));  //  parse HTML form submissions into req.body
app.use(express.static(path.join(__dirname, 'public'))); //  serve CSS/JS/images from public/

// ---------- Routes ----------
app.get(['/', '/home', '/index.html'], (req, res) => {
    res.render('index');
});

// About Us page: inject the mission, team description and team members
app.get('/about', (req, res) => {
    res.render('about', aboutData);
});


// Browse page: inject the shelter names for the dropdown.
// selectedShelterId (optional) re-selects a shelter when coming "Back to Browsing".
app.get('/browse', (req, res) => {
    res.render('browse', {
        shelters: shelters.map(shelter => ({ id: shelter.id, name: shelter.name })),
        selectedShelterId: req.query.shelterId
    });
});

// API: one shelter's full data (?id=sId), or a summary list of all shelters
app.get('/shelters', (req, res) => {
    if (req.query.id) {
        const shelter = shelters.find(shelter => (shelter.id === req.query.id));
        if (!shelter)
            return res.status(404).send('Shelter Not Found');
        return res.json(shelter);
    }
    res.json(shelters.map(shelter => ({
        id: shelter.id, name: shelter.name, city: shelter.city, processingFee: shelter.processingFee
    })));
});


// Pet details page. Both petId and shelterId are required query parameters.
app.get('/details', (req, res) => {
    const { petId, shelterId } = req.query;
    if (!petId || !shelterId) {
        return res.status(400).render('pet', { errorMessage: 'Missing pet ID and/or shelter ID.' })
    }

    const shelter = shelters.find(shelter => (shelter.id == shelterId));
    const pet = findPet(shelterId, petId);
    if (!pet) {
        return res.status(404).render('pet', { errorMessage: 'Pet not found. Either the shelter ID or pet ID is invalid.' });
    }

    res.render('pet', { pet, shelter });
});

// Adoption application page. All pet info arrives as query parameters from the pet page's Apply link.
app.get('/apply', (req, res) => {
    const { petId, petName, petType, petBreed, adoptionFee, processingFee, shelterId } = req.query;
    res.render('apply', { petId, petName, petType, petBreed, adoptionFee, processingFee, shelterId });
});

// Receive a submitted application (JSON body already parsed by express.json())
app.post('/submit-application', (req, res) => {
    const application = req.body;
    if (!application || Object.keys(application).length === 0)
        return res.status(400).send('Invalid application data');

    // Add the current date/time, a unique ID and a status
    application.date = new Date().toLocaleString('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
    application.applicationId = "a" + (applications.length + 1); // ok since applications are never removed
    application.status = "Unprocessed";
    applications.push(application);

    res.send('Application received');
});

// Applications page (admin): inject a summary of each application for the table rows
app.get('/admin/applications', (req, res) => {
    const appSummaries = applications.map(app => {
        const pet = findPet(app.shelterId, app.petId);
        return {
            date: app.date,
            applicationId: app.applicationId,
            shelterId: app.shelterId,
            petId: app.petId,
            petType: pet ? pet.type : 'Unknown',
            status: app.status
        };
    });
    res.render('applications', { applications: appSummaries });
});

// API: one pet's data (used by applications.js for the details card)
app.get('/shelters/pets', (req, res) => {
    const { shelterId, petId } = req.query;
    if (!shelterId || !petId)
        return res.status(400).send('Missing pet ID and/or shelter ID.');

    const pet = findPet(shelterId, petId);
    if (!pet)
        return res.status(404).send('Pet Not Found. Either shelter ID or pet ID is invalid.');
    res.json(pet);
});


// API: one application's full details
app.get('/admin/applications-details', (req, res) => {
    if (!req.query.id)
        return res.status(400).send('Application not Found. Missing ID.');

    const app = applications.find(a => (a.applicationId === req.query.id));
    if (!app)
        return res.status(404).send('Application not Found. Invalid ID.');
    res.json(app);
});

// API: update an application's status (JSON body: { applicationId, status })
app.put('/admin/applications-update', (req, res) => {
    const { applicationId, status } = req.body || {};
    if (!applicationId || !status)
        return res.status(400).send('Missing application ID and/or status.');

    const app = applications.find(a => (a.applicationId === applicationId));
    if (!app)
        return res.status(404).send('Application not found. Invalid ID.');

    app.status = status;
    res.send('Application ' + applicationId + ' updated');
});



// Find and return the pet with the given Id from the given shelter Id
function findPet(shelterId, petId) {
    const shelter = shelters.find(shelter => (shelter.id === shelterId));
    if (shelter)
        return shelter.pets.find(pet => (pet.id === petId));
    else
        return undefined;
}


// Start the server
app.listen(3000, () => {
    console.log('Adoption Company Server running on http://localhost:3000');
});
