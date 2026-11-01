# SkyAddress — Full-stack MVP

A software-only MVP for **Smart Digital Addressing and Drone Delivery Support System**. It supports the two connected journeys in the specification:

1. A rural resident registers a home, selects its coordinates, receives a unique SkyAddress code, and shares that code with a ground delivery worker.
2. A drone operator looks up building delivery points, checks stored availability / obstacle / restriction data, selects an eligible point or reviews an alternative, and views a simulated route.

> **Important:** Drone routes and eligibility are demonstrations using stored sample data. This app does not control a drone, inspect live obstacles, validate airspace, assess weather, or certify a landing location. Unknown obstacle data requires manual review.

## Stack

- React + Vite frontend
- Express REST API backend
- JSON file persistence (`server/data/db.json`) for easy hackathon setup
- Leaflet + OpenStreetMap map tiles
- Lucide icons

## Requirements

- Node.js 18 or newer
- npm
- Internet connection for OpenStreetMap tiles and Google Fonts (the app data/API itself runs locally)

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`.

Production build:

```bash
npm run build
npm start
```

## Demo data

The project starts with two sample Kerala homes and five delivery points. The sample addresses and coordinates are fictional demonstration records. You can reset the demo by restoring `server/data/db.json` from the original project copy.

## Main API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API health |
| GET | `/api/dashboard` | Dashboard counts |
| GET | `/api/homes` | List registered homes |
| GET | `/api/homes/:code` | Find a home by SkyAddress code |
| POST | `/api/homes` | Register a home and generate its code |
| POST | `/api/homes/:id/points` | Add a delivery point |
| PATCH | `/api/points/:pointId` | Update availability, obstacle status or restriction |
| POST | `/api/deliveries` | Create ground or simulated drone delivery |
| PATCH | `/api/deliveries/:id` | Update delivery status |
| POST | `/api/reports` | Submit a location correction report |
| GET | `/api/activity` | Delivery and location-report activity |

## Business rules implemented

- Home registration validates required fields and latitude/longitude.
- A nearby duplicate home in the same locality is rejected.
- Each home receives a unique code in the demo format `SA-KER-001-000X`.
- A building can have multiple individually identified delivery points.
- A simulated drone destination is eligible only when it is available, obstacle status is `clear`, and it is not restricted.
- Obstacle status `unknown` is marked for manual review and is never considered eligible.
- An unavailable / obstructed / restricted point is excluded. The UI suggests an eligible alternative in the same building when one exists.
- Delivery status transitions are validated by the API.

## Acceptance checks to try

1. **Rural registration:** open Register a home, fill the required details, click the map to choose coordinates, and generate a code.
2. **Code lookup:** copy the generated code, open Ground delivery, and search for it.
3. **Landmarks:** confirm that description, landmarks, directions and coordinates are shown.
4. **Multiple points:** select a home in the register view and add points (see note below on current MVP UI).
5. **Unknown obstacle:** in Drone planning, the rooftop sample point shows Manual review and cannot be routed.
6. **Excluded point:** the obstructed/unavailable sample point is excluded.
7. **Alternative:** an eligible alternative is shown when the same building has one.
8. **Route simulation:** choose an eligible point and generate a route. The app labels it simulation-only.
9. **Delivery status:** create a ground delivery and use Start / Confirm delivered in the activity table.
10. **Location report:** submit an issue in Ground delivery and view it in Admin dashboard.

## Current MVP limitations / next implementation tasks

- JSON persistence is intended for a local hackathon demo; it is not a concurrent production database.
- The map uses OSM tiles and requires network access. Offline map caching is not implemented.
- Ground navigation is currently a map preview / external map link, not turn-by-turn in-app routing.
- The route visual is a straight simulated origin-to-destination segment, not a pathfinding or obstacle-avoidance system.
- Authentication, role-based authorization, resident consent workflows and production-grade privacy controls need implementation before public deployment.
- Location correction reports are stored for admin review; an approval/edit workflow is not yet implemented.
- QR generation, AI-assisted descriptions, live weather/airspace integrations and physical drone integration are not implemented.

## Privacy and deployment

Use fictional/demo records for presentations. Do not expose residential coordinates or contact information publicly without authorization. Before production deployment, add authentication, authorization, rate limiting, secure database storage, audit logs, input validation hardening, backups and HTTPS.
