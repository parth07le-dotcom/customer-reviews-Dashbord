const https = require('https');

// API Key from your existing project
const API_KEY = 'AIzaSyA6myHzS10YXdcazAFalmXvDkrYCp5cLc8';

const urlInput = process.argv[2];

if (!urlInput) {
    console.error('Please provide a Google Maps URL as an argument.');
    console.error('Usage: node url-finder.js "https://www.google.com/maps/place/..."');
    process.exit(1);
}

// Helper to regex extract the name
function extractQuery(url) {
    try {
        const regex = /\/maps\/place\/([^\/@]+)/;
        const match = url.match(regex);
        if (match && match[1]) {
            return decodeURIComponent(match[1].replace(/\+/g, ' '));
        }
    } catch (e) {
        return null;
    }
    return null;
}

const query = extractQuery(urlInput);

if (!query) {
    console.error('Could not extract a place name from the URL.');
    process.exit(1);
}

console.log(`Searching for: "${query}"...`);

const apiUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${API_KEY}`;

https.get(apiUrl, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            if (response.status === 'OK' && response.candidates && response.candidates.length > 0) {
                const place = response.candidates[0];
                console.log('\n--- RESULT ---');
                console.log(`Name:    ${place.name}`);
                console.log(`Address: ${place.formatted_address}`);
                console.log(`Place ID: ${place.place_id}`);
                console.log('--------------\n');
            } else {
                console.error(`\nAPI Error or No Results: ${response.status}`);
                if (response.error_message) console.error(response.error_message);
            }
        } catch (e) {
            console.error('Error parsing JSON response:', e.message);
        }
    });

}).on('error', (err) => {
    console.error('Network Error:', err.message);
});
