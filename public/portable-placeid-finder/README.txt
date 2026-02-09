# Portable Places PlaceID Finder

This folder contains the complete, standalone version of the Place ID Finder tool.
You can copy this entire folder into any project or web server.

## Files
- `index.html`: The main map tool to find Place IDs by search or clicking.
- `url-finder.html`: The tool to find Place IDs by pasting a Google Maps URL.
- `index.js`: The JavaScript logic for the map.
- `style.css`: Stylesheet for the tools.
- `url-finder.js`: A Node.js CLI version (requires your own API key).

## How to Run

### Option 1: On a Web Server
Just upload these files to your hosting or copy them into your existing web project's public folder.

### Option 2: Local Testing
You cannot usually double-click `.html` files for Maps API due to security restrictions.
You need a local server.

If you have Node.js installed, run:
```bash
npx http-server
```
Then open the localhost link shown.

## API Key
The included API key is restricted to specific domains. If you deploy this to a public website, you MUST replace the API key in `index.html` and `url-finder.html` with your own Google Maps API Key.
