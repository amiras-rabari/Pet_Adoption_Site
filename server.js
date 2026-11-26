const fs = require('fs');
const path = require('path');

const express = require('express');
const app = express();
const multer = require('multer');

// Submitted applications
let applications = []; // None so far

// File locations for the stored data
const SHELTERS_DIR = path.join(__dirname, 'data', 'shelters');
const NEXT_IDS_FILE = path.join(__dirname, 'data', 'nextIDs.json');

// Load the shelter data upon startup
let shelters = [];
const shelterFiles = {}; // Which file each shelter is stored in: { shelterId: fileName }

// Read each .json file in the shelters folder and add its shelter to the shelters array
const files = fs.readdirSync(SHELTERS_DIR);
for (let i = 0; i < files.length; i++) {
    if (files[i].endsWith('.json')) {
        const shelter = JSON.parse(fs.readFileSync(path.join(SHELTERS_DIR, files[i]), 'utf-8'));
        shelters.push(shelter);
        shelterFiles[shelter.id] = files[i];
    }
}

// Load the next available IDs: { nextShelterId, nextPetId }
const nextIDs = JSON.parse(fs.readFileSync(NEXT_IDS_FILE, 'utf-8'));

// Save the next available IDs back to their file
function saveNextIDs() {
    fs.writeFileSync(NEXT_IDS_FILE, JSON.stringify(nextIDs, null, 2));
}

// Save one shelter (including its pets) back to its own .json file
// writeFileSync It finishes writing before the response is sent, so 
// location.reload() is guaranteed to see the new shelter.
function saveShelter(shelter) {
    fs.writeFileSync(path.join(SHELTERS_DIR, shelterFiles[shelter.id]), JSON.stringify(shelter, null, 2));
}

// Find and return the pet with the given Id from the given shelter Id
function findPet(shelterId, petId) {
    const shelter = shelters.find(shelter => (shelter.id === shelterId));
    if (shelter)
        return shelter.pets.find(pet => (pet.id === petId));
    else
        return undefined;
}

// Load the About Us page data (mission, teamDescription, team) once upon startup
const aboutData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'aboutData.json'), 'utf-8'));


// The 5 pet types used throughout the site 
const PET_TYPES = ['Dog', 'Cat', 'Bird', 'Reptile', 'Other'];

// ---------- Image uploads (multer) ----------
// Where uploaded pet images are saved: public/images (served like the other pet images)
const IMAGES_DIR = path.join(__dirname, 'public', 'images');

// storage: save to public/images, adding the date/time to the name so it is always unique
// (e.g. "my dog.png" -> "my_dog-1732467890123.png")
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMAGES_DIR),
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, path.extname(file.originalname))
            .replace(/[^a-zA-Z0-9_-]/g, '_');   // keep only safe characters
        cb(null, baseName + '-' + Date.now() + extension);
    }
});

// fileFilter: only accept image files. A rejected file is not saved, and the route sends a 400.
function fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/'))
        return cb(null, true);
    req.fileRejected = true;
    cb(null, false);
}

const upload = multer({ storage: storage, fileFilter: fileFilter });

// If a request is rejected after multer already saved its image, delete that image again
function discardUpload(req) {
    if (req.file)
        fs.rmSync(req.file.path, { force: true });
}

// Read and check a pet's fields from a request body (JSON or multipart form).
// Returns { error } if something is missing or invalid, otherwise { pet } with the cleaned values.
function readPetFields(body) {
    body = body || {};
    const type = String(body.type ?? '').trim();
    const name = String(body.name ?? '').trim();
    const breed = String(body.breed ?? '').trim();
    const ageText = String(body.age ?? '').trim();
    const feeText = String(body.adoptionFee ?? '').trim();
    const health = String(body.health ?? '').trim();
    // Traits arrive as "Friendly, Energetic" -> ["Friendly", "Energetic"]
    const traits = String(body.traits ?? '').split(',').map(t => t.trim()).filter(t => t !== '');
    const age = Number(ageText);
    const adoptionFee = Number(feeText);

    if (!name || !breed || !health || !ageText || !feeText || traits.length === 0)
        return { error: 'All pet fields are required (type, name, breed, age, adoption fee, health, traits).' };
    if (!PET_TYPES.includes(type))
        return { error: 'The type must be one of: ' + PET_TYPES.join(', ') + '.' };
    if (!Number.isFinite(age) || age < 0 || !Number.isFinite(adoptionFee) || adoptionFee < 0)
        return { error: 'The age and adoption fee must be numbers (0 or more).' };

    return { pet: { type, name, breed, age, adoptionFee, health, traits } };
}

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

// Shelters page (admin) or shelter list API, depending on the Accept header
app.get('/admin/shelters', (req, res) => {
    const shelterSummaries = shelters.map(shelter => ({
        id: shelter.id,
        name: shelter.name,
        city: shelter.city,
        processingFee: shelter.processingFee,
        petCount: shelter.pets.length
    }));

    res.format({
        'text/html': () => res.render('shelters', { shelters: shelterSummaries }),
        'application/json': () => res.json({ count: shelterSummaries.length, shelters: shelterSummaries }),
        default: () => res.status(406).send('Not Acceptable. Request text/html or application/json.')
    });
});


// Add a new shelter. JSON body: { name, city, processingFee }
app.post('/admin/shelters', (req, res) => {
    // Read the values as trimmed text (String() also guards against non-text values)
    const body = req.body || {};
    const name = String(body.name ?? '').trim();
    const city = String(body.city ?? '').trim();
    const feeText = String(body.processingFee ?? '').trim();
    const fee = Number(feeText);

    // All three values are required, and the fee must be a number that is 0 or more
    if (!name || !city || !feeText || !Number.isFinite(fee) || fee < 0)
        return res.status(400).send('A name, city and processing fee (0 or more) are required.');

    // Use (and then increase) the next shelter ID stored in nextIDs.json
    const newShelter = {
        id: 's' + nextIDs.nextShelterId,
        name: name,
        city: city,
        processingFee: fee,
        pets: []
    };
    nextIDs.nextShelterId++;
    saveNextIDs();

    // Store the new shelter in its own file named after its ID (e.g. s6.json)
    shelterFiles[newShelter.id] = newShelter.id + '.json';
    saveShelter(newShelter);
    shelters.push(newShelter);

    res.status(201).json(newShelter);
});

// Delete a shelter (and all its pets). The shelter ID is a route parameter: /admin/shelters/s6
app.delete('/admin/shelters/:sID', (req, res) => {
    const shelterId = req.params.sID;
    const index = shelters.findIndex(shelter => (shelter.id === shelterId));
    if (index === -1)
        return res.status(404).send('Shelter not found. Invalid shelter ID.');

    // Delete the shelter's .json file (force: no error if the file is already gone)
    fs.rmSync(path.join(SHELTERS_DIR, shelterFiles[shelterId]), { force: true });
    delete shelterFiles[shelterId];

    // Remove it from the shelters array
    const removedShelter = shelters.splice(index, 1)[0];
    res.send('Shelter "' + removedShelter.name + '" was deleted successfully.');
});

// One shelter: its Shelter Info page (HTML) or its full data including pets (JSON)
app.get('/admin/shelters/:sID', (req, res) => {
    const shelter = shelters.find(shelter => (shelter.id === req.params.sID));
    if (!shelter)
        return res.status(404).send('Shelter not found. Invalid shelter ID.');

    res.format({
        'text/html': () => res.render('shelterInfo', { shelter: shelter, petTypes: PET_TYPES }),
        'application/json': () => res.json(shelter),
        default: () => res.status(406).send('Not Acceptable. Request text/html or application/json.')
    });
});

// Update a shelter's info. JSON body: { id, name, city, processingFee }
// :sID is the shelter's CURRENT id; body.id may be a new one.
app.put('/admin/shelters/:sID', (req, res) => {
    const shelter = shelters.find(shelter => (shelter.id === req.params.sID));
    if (!shelter)
        return res.status(404).send('Shelter not found. Invalid shelter ID.');

    // Same checks as when adding a shelter, plus the ID
    const body = req.body || {};
    const newId = String(body.id ?? '').trim();
    const name = String(body.name ?? '').trim();
    const city = String(body.city ?? '').trim();
    const feeText = String(body.processingFee ?? '').trim();
    const fee = Number(feeText);

    if (!newId || !name || !city || !feeText || !Number.isFinite(fee) || fee < 0)
        return res.status(400).send('An ID, name, city and processing fee (0 or more) are required.');

    // A changed ID must not belong to another shelter (IDs must stay unique)
    if (newId !== shelter.id && shelters.some(s => (s.id === newId)))
        return res.status(409).send('The ID "' + newId + '" is already used by another shelter.');

    // The shelter keeps its .json file; only the ID used to look the file up changes
    if (newId !== shelter.id) {
        shelterFiles[newId] = shelterFiles[shelter.id];
        delete shelterFiles[shelter.id];
    }

    shelter.id = newId;
    shelter.name = name;
    shelter.city = city;
    shelter.processingFee = fee;
    saveShelter(shelter);

    res.json(shelter);
});


// Update one pet. Body: JSON, or multipart form data when a new image file is included.
// upload.single('image') saves an uploaded "image" file if any and sets req.file;
// for a JSON request it does nothing and express.json() has already filled req.body.
app.put('/admin/shelters/:sID/pets/:pID', upload.single('image'), (req, res) => {
    const shelter = shelters.find(shelter => (shelter.id === req.params.sID));
    const pet = shelter ? shelter.pets.find(pet => (pet.id === req.params.pID)) : undefined;
    if (!pet) {
        discardUpload(req);
        return res.status(404).send('Pet not found. Either the shelter ID or pet ID is invalid.');
    }
    if (req.fileRejected)
        return res.status(400).send('Only image files can be uploaded.');

    const { error, pet: fields } = readPetFields(req.body);
    if (error) {
        discardUpload(req);
        return res.status(400).send(error);
    }

    // Copy the new values onto the pet (its id, views and daysAtShelter stay the same)
    Object.assign(pet, fields);
    if (req.file)
        pet.image = 'images/' + req.file.filename;   // same format as the existing images
    saveShelter(shelter);

    res.json(pet);
});

// Delete one pet from a shelter
app.delete('/admin/shelters/:sID/pets/:pID', (req, res) => {
    const shelter = shelters.find(shelter => (shelter.id === req.params.sID));
    const index = shelter ? shelter.pets.findIndex(pet => (pet.id === req.params.pID)) : -1;
    if (index === -1)
        return res.status(404).send('Pet not found. Either the shelter ID or pet ID is invalid.');

    const removedPet = shelter.pets.splice(index, 1)[0];
    saveShelter(shelter);

    res.send('Pet "' + removedPet.name + '" was removed successfully.');
});

// Start the server
app.listen(3000, () => {
    console.log('Adoption Company Server running on http://localhost:3000');
});
