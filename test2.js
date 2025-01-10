let map, elevator, path;
let marker1, marker2, polyline;

// Specifications for TW5S-Sac model
const tw5sSacSpecifications = {
    model: "TW5S-Sac",
    cpu: "QCA9563+QCA9882+QCA8334",
    flash: "SPI NOR 16MB",
    ddr: "DDR2-128MB",
    frequency: "5.150GHz ~ 5.850GHz",
    wifiProtocol: "802.11 a/n/ac",
    maxRate: "900Mbps",
    antenna: "External dish antenna: 26dBi",
    txPowerMCS9: 18,  // dBm
    txPowerMCS0: 21,  // dBm 
    rxSensitivityMCS9: -58, // dBm
    rxSensitivityMCS0: -85, // dBm
    evm: "≤ -3.2 dB (MCS 9)",
    ppm: "±20ppm",
    wanPort: "1*10/100/1000M WAN, support 24-48V POE power",
    lanPort: "1*10/100/1000M LAN",
    powerConsumption: "Max Power < 15W, PoE: 48V/0.5A (802.3af)",
    ipGrade: "IP65",
    esdProtection: "Air: ±8K, Touch: ±4K",
    workingMode: "Access Point, Site (WDS/TDMA3), Site (ARPNAT)",
    wirelessFeatures: "Intelligent dynamic polling, automatic channel selection, modulation mode selection, transmission power control (ATPC)"
};

// Coordinates for different countries
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

// EIRP values for different countries
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

// Function to update map for the selected country
function updateMapForCountry() {
    const selectedCountry = document.getElementById('country-select').value;
    if (selectedCountry) {
        const { lat, lng } = countryCoordinates[selectedCountry];
        map.setCenter(new google.maps.LatLng(lat, lng));

        const eirp = countryEirpValues[selectedCountry]?.eirp || '';
        document.getElementById('max-eirp-1').value = eirp;
        document.getElementById('max-eirp-2').value = eirp;
    }
}

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 5,
        center: { lat: 20.5937, lng: 78.9629 }, // Default: India coordinates
    });

    elevator = new google.maps.ElevationService();
}

// Function to calculate RSL
function calculateRSL(txPower, txAntennaGain, rxAntennaGain, distance, frequency) {
    let txPowerDbm = txPower;
    let wavelength = 300 / frequency;  // Wavelength in meters
    let fspl = 20 * Math.log10(distance) + 20 * Math.log10(frequency) + 20 * Math.log10(4 * Math.PI / 3e8);  // Free Space Path Loss (FSPL) in dB
    let rsl = txPowerDbm + txAntennaGain + rxAntennaGain - fspl;
    return rsl;
}

// Function to calculate SNR
function calculateSNR(rsl, noiseLevel) {
    return rsl - noiseLevel;  // Simple formula for SNR
}

// Function to calculate Elevation (based on tower height)
function calculateElevation(towerHeight) {
    return towerHeight * 0.1;  // Example: Elevation factor
}

// Function to calculate Distance between two coordinates (in meters)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;  // Radius of Earth in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;  // Distance in meters
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

// Function to calculate Link Status and Availability
function calculateLinkStatusAndAvailability(eirp, towerHeight, channelBandwidth, frequency) {
    let linkStatus = "Non-LOS";
    let linkAvailability = "Low";
    let throughput = 0;

    if (eirp >= 30 && towerHeight >= 20) {
        if (channelBandwidth >= 40 && frequency >= 5200) {
            linkStatus = "LOS";
            linkAvailability = "High";
            throughput = 900;  // Example throughput for LOS
        } else if (channelBandwidth >= 20 && frequency >= 5000) {
            linkStatus = "Near LOS";
            linkAvailability = "Medium";
            throughput = 600;  // Example throughput for Near LOS
        }
    }
    return { linkStatus, linkAvailability, throughput };
}



function calculateLink() {
    const lat1 = parseFloat(document.getElementById('lat-1').value);
    const lng1 = parseFloat(document.getElementById('lng-1').value);
    const lat2 = parseFloat(document.getElementById('lat-2').value);
    const lng2 = parseFloat(document.getElementById('lng-2').value);
    const towerHeight1 = parseFloat(document.getElementById('tower-height-1').value);
    const antennaGain1 = parseFloat(document.getElementById('antenna-gain-1').value);
    const channelBandwidth1 = parseInt(document.getElementById('channel-bandwidth-1').value);
    const channelFrequency1 = parseInt(document.getElementById('channel-frequency-1').value);
    const towerHeight2 = parseFloat(document.getElementById('tower-height-2').value);
    const antennaGain2 = parseFloat(document.getElementById('antenna-gain-2').value);
    const channelBandwidth2 = parseInt(document.getElementById('channel-bandwidth-2').value);
    const channelFrequency2 = parseInt(document.getElementById('channel-frequency-2').value);
    
    // Get the EIRP values
    const eirp1 = parseFloat(document.getElementById('max-eirp-1').value);
    const eirp2 = parseFloat(document.getElementById('max-eirp-2').value);

    if (isNaN(eirp1) || isNaN(eirp2)) {
        alert("Please provide valid EIRP values for both links.");
        return; // Stop the calculation if EIRP values are invalid
    }

    // Update path based on user inputs
    path = [
        { lat: lat1, lng: lng1 },
        { lat: lat2, lng: lng2 }
    ];

    // Call the elevation service again to get the updated profile
    elevator.getElevationAlongPath({
        path: path,
        samples: 256
    }, function(results, status) {
        if (status === google.maps.ElevationStatus.OK) {
            let chartData = [];
            results.forEach(function(result) {
                chartData.push([result.location.lat(), result.location.lng(), result.elevation]);
            });

            drawElevationChart(chartData);
        }
    });

    // Calculate Distance
    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    const azimuth1 = calculateAzimuth(lat1, lng1, lat2, lng2);
    const azimuth2 = calculateAzimuth(lat2, lng2, lat1, lng1);

    // Calculate Link Status, Availability and Throughput for both towers
    const linkData1 = calculateLinkStatusAndAvailability(eirp1, towerHeight1, channelBandwidth1, channelFrequency1);
    const linkData2 = calculateLinkStatusAndAvailability(eirp2, towerHeight2, channelBandwidth2, channelFrequency2);

   
    // Compute RSL for both links
    const rsl1 = calculateRSL(eirp1, antennaGain1, antennaGain2, distance, channelFrequency1);
    const rsl2 = calculateRSL(eirp2, antennaGain2, antennaGain1, distance, channelFrequency2);

    // Compute SNR for both links
    const noiseLevel = -90;  // Typical noise floor (dBm)
    const snr1 = calculateSNR(rsl1, noiseLevel);
    const snr2 = calculateSNR(rsl2, noiseLevel);

    // Compute Elevation for both towers
    const elevation1Calculated = calculateElevation(towerHeight1);
    const elevation2Calculated = calculateElevation(towerHeight2);

    // Update the map markers and polyline
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

    polyline = new google.maps.Polyline({
        path: [{ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }],
        geodesic: true,
        strokeColor: linkData1.linkStatus === "LOS" ? "#006400" : (linkData1.linkStatus === "Near LOS" ? "#FFA500" : "#FF0000"),
        strokeOpacity: 1.0,
        strokeWeight: 2
    });
    polyline.setMap(map);

    // Update the DOM with the calculated distance
    document.getElementById('link-distance').innerText = `Distance: ${distance} km`;

    // Link status and availability calculation
    const { linkStatus, linkAvailability, throughput } = calculateLinkStatusAndAvailability(eirp1, towerHeight1, channelBandwidth1, channelFrequency1);

    // Display link status and availability
    document.getElementById('link-status').innerText = `Link Status: ${linkStatus}`;
    document.getElementById('link-availability').innerText = `Link Availability: ${linkAvailability}`;
    document.getElementById('throughput').innerText = `Throughput: ${throughput} Mbps`;
    document.getElementById('link-availability-1').innerHTML = "Link Availability (Tower 1): " + linkData1.linkAvailability;
    document.getElementById('link-availability-2').innerHTML = "Link Availability (Tower 2): " + linkData2.linkAvailability;
    document.getElementById('throughput-1').innerHTML = "Throughput (Tower 1): " + linkData1.throughput + " Mbps";
    document.getElementById('throughput-2').innerHTML = "Throughput (Tower 2): " + linkData2.throughput + " Mbps";
    document.getElementById('elevation-1').innerHTML = "Elevation (Tower 1): " + elevation1Calculated + " meters";
    document.getElementById('elevation-2').innerHTML = "Elevation (Tower 2): " + elevation2Calculated + " meters";
    
    // SNR and RSL Results for both links
    document.getElementById('snr-1').innerHTML = "SNR (Tower 1): " + snr1 + " dB";
    document.getElementById('snr-2').innerHTML = "SNR (Tower 2): " + snr2 + " dB";
    document.getElementById('rsl-1').innerHTML = "RSL (Tower 1): " + rsl1 + " dBm";
    document.getElementById('rsl-2').innerHTML = "RSL (Tower 2): " + rsl2 + " dBm";
}

// Function to reset the map and input fields
function resetMap() {
    document.getElementById('lat-1').value = '';
    document.getElementById('lng-1').value = '';
    document.getElementById('tower-height-1').value = '';
    document.getElementById('antenna-gain-1').value = '';
    document.getElementById('max-eirp-1').value = '';
    document.getElementById('lat-2').value = '';
    document.getElementById('lng-2').value = '';
    document.getElementById('tower-height-2').value = '';
    document.getElementById('antenna-gain-2').value = '';
    document.getElementById('max-eirp-2').value = '';
    document.getElementById('channel-bandwidth-1').value = 20;
    document.getElementById('channel-frequency-1').value = 5200;
    document.getElementById('channel-bandwidth-2').value = 20;
    document.getElementById('channel-frequency-2').value = 5200;

    if (marker1) marker1.setMap(null);
    if (marker2) marker2.setMap(null);
    if (polyline) polyline.setMap(null);
}

function drawElevationChart(chartData) {
    const data = new google.visualization.DataTable();
    data.addColumn('number', 'Latitude');
    data.addColumn('number', 'Longitude');
    data.addColumn('number', 'Elevation');

    data.addRows(chartData);

    const chart = new google.visualization.LineChart(document.getElementById('chart-div'));
    chart.draw(data, {
        title: 'Elevation Profile',
        width: 800,
        height: 400,
        hAxis: {
            title: 'Distance (km)',
        },
        vAxis: {
            title: 'Elevation (m)',
        }
    });
}

function clearInputs() {
    document.getElementById('lat-1').value = '';
    document.getElementById('lng-1').value = '';
    document.getElementById('max-eirp-1').value = '';
    document.getElementById('lat-2').value = '';
    document.getElementById('lng-2').value = '';
    document.getElementById('max-eirp-2').value = '';
    document.getElementById('link-distance').innerText = '';
    document.getElementById('link-status').innerText = '';
    document.getElementById('link-availability').innerText = '';
    document.getElementById('throughput').innerText = '';
    document.getElementById('chart-div').innerHTML = '';
}

// Function to download the configuration (PDF format)
function downloadConfiguration() {
    const configData = {
        link1: {
            name: document.getElementById('link-name-1').value,
            lat: document.getElementById('lat-1').value,
            lng: document.getElementById('lng-1').value,
            eirp: document.getElementById('max-eirp-1').value,
            bandwidth: document.getElementById('channel-bandwidth-1').value,
            frequency: document.getElementById('channel-frequency-1').value,
            radio: document.getElementById('radio-type-1').value,
            towerHeight: document.getElementById('tower-height-1').value,
            gain: document.getElementById('antenna-gain-1').value,
        },
        link2: {
            name: document.getElementById('link-name-2').value,
            lat: document.getElementById('lat-2').value,
            lng: document.getElementById('lng-2').value,
            eirp: document.getElementById('max-eirp-2').value,
            bandwidth: document.getElementById('channel-bandwidth-2').value,
            frequency: document.getElementById('channel-frequency-2').value,
            radio: document.getElementById('radio-type-2').value,
            towerHeight: document.getElementById('tower-height-2').value,
            gain: document.getElementById('antenna-gain-2').value,
        }
    };

    console.log("Config Data: ", configData); // Add this line to log the configuration data

    const configText = JSON.stringify(configData, null, 2);

    const blob = new Blob([configText], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'configuration.txt';
    link.click();
}


