let map = L.map('map').setView([13.0827, 80.2707], 12);

// Map tiles (fixed server)
L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Emergency mode
let emergencyMode = false;

// Trusted points
let trustedPoints = [
    [13.0827, 80.2707],
    [13.0500, 80.2500],
    [13.1000, 80.3000]
];

// Show trusted points
trustedPoints.forEach(t => {
    L.circleMarker(t, {
        color: "blue",
        radius: 10,
        fillColor: "blue",
        fillOpacity: 1
    }).addTo(map).bindPopup("Trusted Location 👥");
});

let routeLayer;

// Toggle emergency mode
function toggleEmergency() {
    emergencyMode = !emergencyMode;

    let btn = document.querySelector("button[onclick='toggleEmergency()']");

    if (emergencyMode) {
        btn.innerText = "🚨 Emergency Mode ON";
        btn.style.backgroundColor = "red";
    } else {
        btn.innerText = "🚨 Emergency Mode OFF";
        btn.style.backgroundColor = "#4CAF50";
    }
}

// Geocode function
async function geocode(place) {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${place}`;
    let res = await fetch(url);
    let data = await res.json();

    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

// Get route
async function getRoute() {
    let start = document.getElementById("start").value;
    let end = document.getElementById("end").value;

    let startCoords = await geocode(start);
    let endCoords = await geocode(end);

    let url = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`;

    let res = await fetch(url);
    let data = await res.json();

    let route = data.routes[0].geometry.coordinates;

    drawRoute(route);
}

// Check trusted proximity
function isNearTrusted(route) {
    for (let coord of route) {
        let lat = coord[1];
        let lng = coord[0];

        for (let t of trustedPoints) {
            let dist = Math.sqrt(
                Math.pow(lat - t[0], 2) +
                Math.pow(lng - t[1], 2)
            );

            if (dist < 0.05) {
                return true;
            }
        }
    }
    return false;
}

// Safety logic
function calculateSafety(route) {

    let score = 50;

    // base randomness
    score += Math.random() * 30;
    score -= Math.random() * 20;

    // trusted boost
    if (isNearTrusted(route)) {
        score += 30;
    }

    // emergency boost
    if (emergencyMode) {
        score += 30;
    }

    // night penalty
    let hour = new Date().getHours();
    if (hour >= 19 || hour <= 5) {
        score -= 20;
    }

    return score;
}

// Draw route
function drawRoute(route) {

    if (routeLayer) {
        map.removeLayer(routeLayer);
    }

    let latlngs = route.map(coord => [coord[1], coord[0]]);

    let score = calculateSafety(route);

    let color = score > 50 ? "green" : "red";

    routeLayer = L.polyline(latlngs, {
        color: color,
        weight: 5
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds());

    // Message logic
    let message = "⚠️ Risky Route";

    if (isNearTrusted(route)) {
        message = "✅ Safer Route (near trusted people)";
    }

    if (emergencyMode) {
        message += "\n🚨 Emergency Mode Active";
    }

    let hour = new Date().getHours();
    if (hour >= 19 || hour <= 5) {
        message += "\n🌙 Night Risk Applied";
    }

    alert(message + "\nSafety Score: " + Math.round(score));
}