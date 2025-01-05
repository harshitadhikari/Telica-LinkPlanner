let map;
let marker1, marker2, polyline;
const countryCoordinates = {
    usa: { lat: 37.0902, lng: -95.7129 },
    india: { lat: 20.5937, lng: 78.9629 },
    canada: { lat: 56.1304, lng: -106.3468 },
    uk: { lat: 51.5074, lng: -0.1278 },
    australia: { lat: -25.2744, lng: 133.7751 },
    cotedivoire: { lat: 7.5398, lng: -5.5471 },
    egypt: { lat: 26.8206, lng: 30.8024 },
    southafrica: { lat: -30.5595, lng: 22.9375 },
    nigeria: { lat: 9.082, lng: 8.6753 },
    kenya: { lat: -1.2921, lng: 36.8219 }
};

const countryEirpValues = {
    usa: { eirp: 30 },
    india: { eirp: 53 },
    canada: { eirp: 42 },
    uk: { eirp: 43 },
    australia: { eirp: 45 },
    cotedivoire: { eirp: 36 },
    egypt: { eirp: 36 },
    southafrica: { eirp: 36 },
    nigeria: { eirp: 30 },
    kenya: { eirp: 39 }
};

function updateMapForCountry() {
    const selectedCountry = document.getElementById('country-select').value;
    if (selectedCountry) {
        const { lat, lng } = countryCoordinates[selectedCountry];
        map.setCenter(new google.maps.LatLng(lat, lng));

        // Set the EIRP value based on the selected country
        const eirp = countryEirpValues[selectedCountry]?.eirp || '';
        document.getElementById('max-eirp-1').value = eirp;
        document.getElementById('max-eirp-2').value = eirp;
    }
}

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 5,
        center: { lat: 20.5937, lng: 78.9629 },
    });
}

// Function to calculate Link Status based on provided parameters
function calculateLinkStatus(channelBandwidth, channelFrequency, towerHeight, antennaGain, eirp) {
    const minimumRequiredEIRP = 30;  // A threshold for EIRP in dBm for LOS
    const minimumRequiredHeight = 20; // Minimum height in meters for a better link

    // Default to Non-LOS
    let linkStatus = "Non-LOS";

    // Check if EIRP and tower height are sufficient
    if (eirp >= minimumRequiredEIRP && towerHeight >= minimumRequiredHeight) {
        // LOS conditions (Line of Sight)
        if (channelBandwidth >= 40 && channelFrequency >= 5200) {
            linkStatus = "LOS";
        } 
        // Near LOS conditions
        else if (channelBandwidth >= 20 && channelFrequency >= 5000) {
            linkStatus = "Near LOS";
        }
    }
    return linkStatus;
}

// Function to calculate Link Distance between two geographic points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Function to calculate Azimuth between two points (bearing angle)
function calculateAzimuth(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    lat1 = lat1 * (Math.PI / 180);
    lat2 = lat2 * (Math.PI / 180);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const azimuth = Math.atan2(y, x);
    return (azimuth * (180 / Math.PI) + 360) % 360; // Azimuth in degrees
}

// Event handler for the Calculate button
function calculateLink() {
    // Get user input for Link 1
    const lat1 = parseFloat(document.getElementById('lat-1').value);
    const lng1 = parseFloat(document.getElementById('lng-1').value);
    const towerHeight1 = parseFloat(document.getElementById('tower-height-1').value);
    const antennaGain1 = parseFloat(document.getElementById('antenna-gain-1').value);
    const eirp1 = parseFloat(document.getElementById('max-eirp-1').value);
    const channelBandwidth1 = parseInt(document.getElementById('channel-bandwidth-1').value);
    const channelFrequency1 = parseInt(document.getElementById('channel-frequency-1').value);
    
    // Get user input for Link 2
    const lat2 = parseFloat(document.getElementById('lat-2').value);
    const lng2 = parseFloat(document.getElementById('lng-2').value);
    const towerHeight2 = parseFloat(document.getElementById('tower-height-2').value);
    const antennaGain2 = parseFloat(document.getElementById('antenna-gain-2').value);
    const eirp2 = parseFloat(document.getElementById('max-eirp-2').value);
    const channelBandwidth2 = parseInt(document.getElementById('channel-bandwidth-2').value);
    const channelFrequency2 = parseInt(document.getElementById('channel-frequency-2').value);

    // Calculate Link Status based on both links' parameters
    const linkStatus1 = calculateLinkStatus(channelBandwidth1, channelFrequency1, towerHeight1, antennaGain1, eirp1);
    const linkStatus2 = calculateLinkStatus(channelBandwidth2, channelFrequency2, towerHeight2, antennaGain2, eirp2);

    // Determine the final link status (LOS, Near LOS, Non-LOS)
    let finalLinkStatus = "Non-LOS";
    if (linkStatus1 === "LOS" && linkStatus2 === "LOS") {
        finalLinkStatus = "LOS";
    } else if (linkStatus1 === "Near LOS" || linkStatus2 === "Near LOS") {
        finalLinkStatus = "Near LOS";
    }

    // Calculate distance between the two links
    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    const azimuth1 = calculateAzimuth(lat1, lng1, lat2, lng2);
    const azimuth2 = calculateAzimuth(lat2, lng2, lat1, lng1);

    // Plot markers for both coordinates
    if (marker1) marker1.setMap(null);
    if (marker2) marker2.setMap(null);
    marker1 = new google.maps.Marker({
        position: { lat: lat1, lng: lng1 },
        map: map,
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    });
    marker2 = new google.maps.Marker({
        position: { lat: lat2, lng: lng2 },
        map: map,
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    });

    // Draw line between the markers if the link status is LOS or Near LOS
    let lineColor = 'red'; // Default to red
    if (finalLinkStatus === "LOS") {
        lineColor = 'darkgreen'; // Dark Green for LOS
    } else if (finalLinkStatus === "Near LOS") {
        lineColor = 'orange'; // Orange for Near LOS
    }

    // Draw the polyline
    if (polyline) polyline.setMap(null);
    polyline = new google.maps.Polyline({
        path: [
            { lat: lat1, lng: lng1 },
            { lat: lat2, lng: lng2 }
        ],
        geodesic: true,
        strokeColor: lineColor,
        strokeOpacity: 1.0,
        strokeWeight: 4
    });
    polyline.setMap(map);

    // Display results
    document.getElementById('link-status').innerHTML = `
        <p>Link Status: ${finalLinkStatus}</p>
        <p>Link Distance: ${distance.toFixed(2)} km</p>
        <p>Link 1 Azimuth: ${azimuth1.toFixed(2)}°</p>
        <p>Link 2 Azimuth: ${azimuth2.toFixed(2)}°</p>
    `;
}
