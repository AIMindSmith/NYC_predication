const API_BASE_URL = "http://127.0.0.1:8000";

// Preset NYC Borough Coordinates & Popular Neighbourhoods
const NYC_DATA = {
    "Manhattan": {
        lat: 40.7831,
        lon: -73.9712,
        neighbourhoods: ["Harlem", "Upper West Side", "East Village", "Hell's Kitchen", "Midtown", "SoHo", "Chelsea", "Financial District"]
    },
    "Brooklyn": {
        lat: 40.6782,
        lon: -73.9442,
        neighbourhoods: ["Williamsburg", "Bedford-Stuyvesant", "Bushwick", "Crown Heights", "Greenpoint", "Park Slope", "DUMBO"]
    },
    "Queens": {
        lat: 40.7282,
        lon: -73.7949,
        neighbourhoods: ["Astoria", "Long Island City", "Flushing", "Jackson Heights", "Sunnyside", "Jamaica"]
    },
    "Bronx": {
        lat: 40.8448,
        lon: -73.8648,
        neighbourhoods: ["Fordham", "Mott Haven", "Riverdale", "Pelham Bay", "Concourse"]
    },
    "Staten Island": {
        lat: 40.5795,
        lon: -74.1502,
        neighbourhoods: ["St. George", "Tompkinsville", "Stapleton", "New Dorp", "Tottenville"]
    }
};

// DOM Elements
const statusBadge = document.getElementById("api-status");
const statusText = document.getElementById("status-text");
const boroughSelect = document.getElementById("neighbourhood_group");
const neighbourhoodInput = document.getElementById("neighbourhood");
const neighbourhoodList = document.getElementById("neighbourhood-list");
const latInput = document.getElementById("latitude");
const lonInput = document.getElementById("longitude");
const fillSampleBtn = document.getElementById("fill-sample");
const form = document.getElementById("predict-form");
const submitBtn = document.getElementById("submit-btn");
const spinner = document.getElementById("spinner");

const idleState = document.getElementById("idle-state");
const resultContent = document.getElementById("result-content");
const errorBox = document.getElementById("error-box");
const predictedRoomEl = document.getElementById("predicted-room");
const topConfidenceEl = document.getElementById("top-confidence");
const probBarsEl = document.getElementById("prob-bars");
const jsonOutputEl = document.getElementById("json-output");

// 1. Check FastAPI Health on Load (GET /)
async function checkServerStatus() {
    try {
        const res = await fetch(`${API_BASE_URL}/`);
        if (res.ok) {
            statusBadge.classList.add("online");
            statusBadge.classList.remove("offline");
            statusText.textContent = "FastAPI Online (127.0.0.1:8000)";
        } else {
            throw new Error("Server error");
        }
    } catch (err) {
        statusBadge.classList.add("offline");
        statusBadge.classList.remove("online");
        statusText.textContent = "FastAPI Offline - Start Uvicorn on port 8000";
    }
}

// 2. Update Neighbourhood Suggestions & Default Coordinates when Borough Changes
boroughSelect.addEventListener("change", (e) => {
    const borough = e.target.value;
    if (NYC_DATA[borough]) {
        // Populate autocomplete datalist
        neighbourhoodList.innerHTML = "";
        NYC_DATA[borough].neighbourhoods.forEach(place => {
            const option = document.createElement("option");
            option.value = place;
            neighbourhoodList.appendChild(option);
        });

        // Auto-fill coordinates & first neighbourhood if empty
        latInput.value = NYC_DATA[borough].lat;
        lonInput.value = NYC_DATA[borough].lon;
        neighbourhoodInput.value = NYC_DATA[borough].neighbourhoods[0];
    }
});

// 3. Auto-fill Realistic Sample Listing Button
fillSampleBtn.addEventListener("click", () => {
    const samples = [
        {
            neighbourhood_group: "Manhattan",
            neighbourhood: "Midtown",
            latitude: 40.7549,
            longitude: -73.9840,
            price: 245,
            minimum_nights: 2,
            number_of_reviews: 64,
            reviews_per_month: 2.35,
            calculated_host_listings_count: 1,
            availability_365: 180
        },
        {
            neighbourhood_group: "Brooklyn",
            neighbourhood: "Williamsburg",
            latitude: 40.7081,
            longitude: -73.9571,
            price: 95,
            minimum_nights: 4,
            number_of_reviews: 19,
            reviews_per_month: 0.85,
            calculated_host_listings_count: 2,
            availability_365: 85
        },
        {
            neighbourhood_group: "Queens",
            neighbourhood: "Astoria",
            latitude: 40.7644,
            longitude: -73.9235,
            price: 78,
            minimum_nights: 1,
            number_of_reviews: 112,
            reviews_per_month: 3.4,
            calculated_host_listings_count: 1,
            availability_365: 310
        }
    ];

    const randomSample = samples[Math.floor(Math.random() * samples.length)];

    boroughSelect.value = randomSample.neighbourhood_group;
    boroughSelect.dispatchEvent(new Event("change"));
    neighbourhoodInput.value = randomSample.neighbourhood;
    latInput.value = randomSample.latitude;
    lonInput.value = randomSample.longitude;
    document.getElementById("price").value = randomSample.price;
    document.getElementById("minimum_nights").value = randomSample.minimum_nights;
    document.getElementById("number_of_reviews").value = randomSample.number_of_reviews;
    document.getElementById("reviews_per_month").value = randomSample.reviews_per_month;
    document.getElementById("calculated_host_listings_count").value = randomSample.calculated_host_listings_count;
    document.getElementById("availability_365").value = randomSample.availability_365;
});

// 4. Handle Form Submission (POST /predict)
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Build payload matching FastAPI InputData Pydantic model
    const payload = {
        latitude: parseFloat(document.getElementById("latitude").value),
        longitude: parseFloat(document.getElementById("longitude").value),
        price: parseFloat(document.getElementById("price").value),
        minimum_nights: parseInt(document.getElementById("minimum_nights").value, 10),
        number_of_reviews: parseInt(document.getElementById("number_of_reviews").value, 10),
        reviews_per_month: parseFloat(document.getElementById("reviews_per_month").value),
        calculated_host_listings_count: parseInt(document.getElementById("calculated_host_listings_count").value, 10),
        availability_365: parseInt(document.getElementById("availability_365").value, 10),
        neighbourhood_group: document.getElementById("neighbourhood_group").value.trim(),
        neighbourhood: document.getElementById("neighbourhood").value.trim()
    };

    // UI Loading State
    spinner.classList.remove("hidden");
    submitBtn.disabled = true;
    errorBox.classList.add("hidden");

    try {
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            // Format FastAPI Pydantic validation errors if any
            const detail = data.detail
                ? JSON.stringify(data.detail, null, 2)
                : "Failed to fetch prediction.";
            throw new Error(detail);
        }

        renderPrediction(data);
    } catch (err) {
        errorBox.textContent = `Error: ${err.message}`;
        errorBox.classList.remove("hidden");
    } finally {
        spinner.classList.add("hidden");
        submitBtn.disabled = false;
    }
});

// 5. Render Prediction & Animated Probability Bars
function renderPrediction(data) {
    idleState.classList.add("hidden");
    resultContent.classList.remove("hidden");

    // Extract predicted_room_type (FastAPI returns a list e.g. ["Entire home/apt"])
    const predictedRoom = Array.isArray(data.predicted_room_type)
        ? data.predicted_room_type[0]
        : data.predicted_room_type;

    const probabilities = Array.isArray(data.probability_of_prediction)
        ? data.probability_of_prediction
        : [];

    predictedRoomEl.textContent = predictedRoom;

    // Calculate highest probability
    const maxProb = probabilities.length > 0 ? Math.max(...probabilities) : 0;
    topConfidenceEl.textContent = `Confidence: ${(maxProb * 100).toFixed(1)}%`;

    // Standard NYC Airbnb room type labels (falls back to Class index if count differs)
    const defaultLabels = ["Entire home/apt", "Private room", "Shared room", "Hotel room"];

    probBarsEl.innerHTML = "";
    probabilities.forEach((prob, idx) => {
        const percentage = (prob * 100).toFixed(1);
        const labelName = defaultLabels[idx] ? `Class ${idx + 1} (${defaultLabels[idx]})` : `Class ${idx + 1}`;

        const item = document.createElement("div");
        item.className = "prob-item";
        item.innerHTML = `
            <div class="prob-header">
                <span>${labelName}</span>
                <strong>${percentage}%</strong>
            </div>
            <div class="prob-track">
                <div class="prob-fill" style="width: 0%" data-target="${percentage}%"></div>
            </div>
        `;
        probBarsEl.appendChild(item);
    });

    // Trigger smooth bar width animation
    requestAnimationFrame(() => {
        document.querySelectorAll(".prob-fill").forEach(bar => {
            bar.style.width = bar.getAttribute("data-target");
        });
    });

    // Show Raw JSON response
    jsonOutputEl.textContent = JSON.stringify(data, null, 2);
}

// Initialize Status Check
checkServerStatus();