# New Home Animal Rescue

A full-stack pet adoption website built with **Node.js**, **Express** and **Pug**. Visitors can browse shelters and pets and apply to adopt. Admins can manage shelters, pets and adoption applications.

## Features

### For visitors
- **Browse pets** by shelter, and filter them by type (Dog, Cat, Bird, Reptile, Other)
- **Pet details page** with health info, traits, fees and a view counter
- **Adoption application form** with built-in form validation

### For admins
- **Applications:** view every application in detail and update its status
- **Shelters:** add new shelters and remove existing ones
- **Shelter management:**
  - Edit a shelter's ID, name, city and processing fee
  - Add, edit and remove pets
  - Upload and preview pet images

### Under the hood
- Server-side rendering with Pug templates and shared header/footer partials
- REST API with `GET`, `POST`, `PUT` and `DELETE` routes
- Content negotiation: the same route returns HTML or JSON depending on the `Accept` header
- Data stored in JSON files, so changes are kept after a restart
- Image uploads handled with Multer

## Tech Stack

| Layer | Technology |
|---|---|
| Server | Node.js, Express 5 |
| Templates | Pug |
| File uploads | Multer |
| Front end | HTML, CSS, vanilla JavaScript |
| Storage | JSON files |

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or newer)

### Installation
```bash
git clone https://github.com/amiras-rabari/Pet_Adoption_Site.git
cd Pet_Adoption_Site
npm install
```

### Run
```bash
node server.js
```
Then open **http://localhost:3000** in your browser.

## Project Structure

```
├── server.js              # Express server and all routes
├── package.json
├── data/
│   ├── aboutData.json     # About Us page content
│   ├── nextIDs.json       # Next shelter and pet IDs
│   └── shelters/          # One JSON file per shelter (with its pets)
├── public/
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side scripts
│   └── images/            # Pet and site images
└── views/
    ├── partials/          # Shared header and footer
    └── *.pug              # Page templates
```

## Pages

| Route | Page |
|---|---|
| `/` | Home |
| `/browse` | Browse pets by shelter and type |
| `/details?petId=&shelterId=` | Pet details |
| `/apply` | Adoption application form |
| `/about` | About Us |
| `/admin/applications` | Manage applications |
| `/admin/shelters` | Manage shelters |
| `/admin/shelters/:sID` | Edit a shelter and its pets |

## API

| Method | Route | Description |
|---|---|---|
| `GET` | `/shelters?id=` | Get a shelter and its pets |
| `GET` | `/shelters/pets?shelterId=&petId=` | Get one pet |
| `POST` | `/submit-application` | Submit an adoption application |
| `GET` | `/admin/applications-details?id=` | Get one application |
| `PUT` | `/admin/applications-update` | Update an application's status |
| `GET` | `/admin/shelters` | List all shelters (HTML or JSON) |
| `POST` | `/admin/shelters` | Add a shelter |
| `GET` | `/admin/shelters/:sID` | Get one shelter (HTML or JSON) |
| `PUT` | `/admin/shelters/:sID` | Update a shelter |
| `DELETE` | `/admin/shelters/:sID` | Delete a shelter |
| `POST` | `/admin/shelters/:sID/pets` | Add a pet (with optional image) |
| `PUT` | `/admin/shelters/:sID/pets/:pID` | Update a pet (with optional image) |
| `DELETE` | `/admin/shelters/:sID/pets/:pID` | Delete a pet |
