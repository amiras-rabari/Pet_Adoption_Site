const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const pug = require('pug');
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
app.get('/', (req, res) => {
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

// Return the Content-type based on the file type. This is needed for static file serving.
function getMimeType(file) {
    const ext = path.extname(file).toLowerCase();
    switch (ext) {
        case '.js': return 'application/javascript';
        case '.css': return 'text/css';
        case '.jpg': return 'image/jpeg';
        case '.png': return 'image/png';
        case '.svg': return 'image/svg+xml';
        case '.json': return 'application/json';
        case '.html': return 'text/html';
        default: return 'text/plain';
    }
}

// This function serves all the static files 
function serveStatic(filePath, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
            res.end(data);
        }
    });
}

// Render a PUG template from the views folder and send it as an HTML response.
// view: the template name without .pug (e.g. "index")
// data: an object whose properties become variables inside the template
// statusCode: HTTP status to send (defaults to 200 OK)
function renderPage(res, view, data = {}, statusCode = 200) {
    try {
        const html = pug.renderFile(path.join(__dirname, 'views', view + '.pug'), data);
        res.writeHead(statusCode, { 'Content-Type': 'text/html' });
        res.end(html);
    } catch (err) {
        // Pug errors give file + line number
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error rendering page');
    }
}

// Helper function to read a request body
function readRequestBody(req, callback) {
    let body = ""
    req.on('data', (chunk) => {
        body += chunk;
    })
    // Once the entire body is ready, process the request
    req.on('end', () => {
        callback(body);
    });
}

// Find and return the pet with the given Id from the given shelter Id
function findPet(shelterId, petId) {
    const shelter = shelters.find(shelter => (shelter.id === shelterId));
    if (shelter)
        return shelter.pets.find(pet => (pet.id === petId));
    else
        return undefined;
}

/*
// Handle all incoming endpoint requests
function handleRequest(req, res) {
    const parsed = url.parse(req.url, true); // true parses query string
    const pathname = parsed.pathname;
    let query = parsed.query;

    // Handle all incoming GET requests
    if (req.method === 'GET') {
        //console.log(">>> Method: " + req.method);
        //console.log(">>> Pathname: " + pathname);

        // Handle requests for the home page
        if ((pathname === '/') || (pathname === '/home') || (pathname === '/index.html'))
            return renderPage(res, 'index');

        // Handle requests for the Browse Pets page
        //shelters.map(...) builds a smaller array with only { id, name } per shelter.
        // Pug doesn't need the full pet lists just to build the dropdown.
        if (pathname === '/browse')
            return renderPage(res, 'browse', {
                shelters: shelters.map(shelter => ({ id: shelter.id, name: shelter.name })),
                selectedShelterId: query.shelterId
            });

        // Handle requests for the About Us page
        if (pathname === '/about')
            return renderPage(res, 'about', aboutData);

        // Handle requests for the Applications page (admin).
        // Build a summary of each application (adding the pet's type) for the table rows.
        if (pathname === '/admin/applications') {
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
            return renderPage(res, 'applications', { applications: appSummaries });
        }

        // Handle requests for the pet details page 
        // Both IDs are required; show an error message if either is missing or invalid.
        if (pathname === '/details') {
            if (!query.petId || !query.shelterId)
                return renderPage(res, 'pet', { errorMessage: 'Missing pet ID and/or shelter ID.' }, 400);

            const shelter = shelters.find(shelter => (shelter.id === query.shelterId));
            const pet = findPet(query.shelterId, query.petId);
            if (!pet)
                return renderPage(res, 'pet', { errorMessage: 'Pet not found. Either the shelter ID or pet ID is invalid.' }, 404);

            return renderPage(res, 'pet', { pet, shelter });
        }

        // Handle requests for the adoption application page.
        // All the pet info arrives as query parameters from the pet details page's Apply link.
        if (pathname === '/apply') {
            // The const { ... } = query line is destructuring: it pulls 
            // those 7 properties out of query into variables of the same names
            const { petId, petName, petType, petBreed, adoptionFee, processingFee, shelterId } = query;
            return renderPage(res, 'apply', { petId, petName, petType, petBreed, adoptionFee, processingFee, shelterId });
        }

        // Handle an API request for one pet's data
        if (pathname === '/shelters/pets') {
            if ((query.shelterId) && (query.petId)) {
                const pet = findPet(query.shelterId, query.petId);
                if (pet)
                    return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(pet));
                else
                    return res.writeHead(404).end('Pet Not Found. Either shelter ID or pet ID is invalid.');
            }
            else
                return res.writeHead(404).end('Missing pet ID and/or shelter ID.');
        }
        // Handle an API request for basic shelter data (i.e., not the pet info)
        if (pathname === '/shelters') {
            if (query.id) { // Handle request for one shelter's data
                const shelter = shelters.find(shelter => (shelter.id === query.id));
                if (shelter)
                    return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(shelter));
                else
                    return res.writeHead(404).end('Shelter Not Found');
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(shelters.map(shelter => ({ id: shelter.id, name: shelter.name, city: shelter.city, processingFee: shelter.processingFee }))));
        }
        // Handle an API request for one application's details
        if (pathname === '/admin/applications-details') {
            if (query.id) {
                const app = applications.find(a => (a.applicationId === query.id));
                if (app)
                    return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(app));
                else
                    return res.writeHead(404).end('Application not Found. Invalid ID.');
            }
            return res.writeHead(404).end('Application not Found. Missing ID.');
        }


        return serveStatic(path.join(__dirname, 'public', pathname), res);
    }
    // Handle incoming submitted application
    if (req.method === 'POST' && pathname === '/submit-application') {
        readRequestBody(req, (body) => {
            try {
                // Get the application and add it to the submitted applications
                const application = JSON.parse(body);

                // Add the current date/time, a unique ID and a status
                application.date = new Date().toLocaleString('en-CA', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                });
                application.applicationId = "a" + (applications.length + 1); // This is ok since we will never remove
                application.status = "Unprocessed";
                applications.push(application);

                res.writeHead(200, { 'Content-Type': 'text/plain' });
                return res.end('Application received');
            } catch (e) {
                console.error(e);
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                return res.end('Invalid application data');
            }
        });
        return;
    }

    // Handle incoming API request for an application status update
    if (req.method === 'PUT' && pathname === '/admin/applications-update') {
        readRequestBody(req, (body) => {
            try {
                // Get the application ID and its updated status from the request body
                const { applicationId, status } = JSON.parse(body);
                if (!applicationId || !status) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    return res.end('Missing application ID and/or status.');
                }

                // Find the application with that ID
                const app = applications.find(a => (a.applicationId === applicationId));
                if (!app) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    return res.end('Application not found. Invalid ID.');
                }

                app.status = status;
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                return res.end("Application " + applicationId + " updated");
            } catch (e) {
                console.error(e);
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                return res.end('Invalid application status update data');
            }
        });
        return;
    }
    // Handle anything else as an error
    res.writeHead(404).end('Not Found');
}
*/
// Start the server
app.listen(3000, () => {
    console.log('Adoption Company Server running on http://localhost:3000');
});
