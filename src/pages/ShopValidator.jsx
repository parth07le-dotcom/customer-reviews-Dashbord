import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import CustomerReview from './CustomerReview';

const ShopValidator = () => {
    const { shopId } = useParams();
    const [status, setStatus] = useState('loading'); // loading, valid, invalid, error
    const [errorMsg, setErrorMsg] = useState('');
    const [shopDetails, setShopDetails] = useState(null);

    useEffect(() => {
        let cleanupScript = null;

        const validateShop = () => {
            // Use JSONP to bypass CORS completely without proxies
            const SHEET_ID = '1UcRAbcxmDkpiaFY7SWmc--79BJRvaRG1J6omsrj-8bg';
            const callbackName = 'googleSheetCallback_' + Math.floor(Math.random() * 100000);

            // Define global callback
            window[callbackName] = (json) => {
                try {
                    if (!json || !json.table) {
                        throw new Error('Invalid response from Google Sheets');
                    }

                    const cols = json.table.cols; // headers
                    const rows = json.table.rows; // data

                    // Helper to normalize strings
                    const normalize = (str) => (str || '').toLowerCase().trim();

                    // Helper to convert Google Drive View URLs to Direct URLs
                    const formatGoogleDriveUrl = (url) => {
                        if (!url) return '';
                        if (typeof url !== 'string') return '';

                        // Robust ID extraction using Regex
                        const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);

                        if (idMatch && idMatch[1]) {
                            // Use the thumbnail endpoint which is often more reliable for images than 'uc'
                            return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
                        }
                        return url;
                    };

                    // Strategy 1 & 2 Combined: Check Headers first, then First Row for each missing index
                    const findIndex = (keywords, altKeywords = []) => {
                        // 1. Check Headers
                        let idx = cols.findIndex(col => {
                            const label = normalize(col.label || '');
                            return keywords.every(k => label.includes(k));
                        });
                        if (idx !== -1) return idx;

                        // 2. Check First Row (fallback)
                        if (rows.length > 0) {
                            idx = rows[0].c.findIndex(cell => {
                                if (!cell || !cell.v) return false;
                                const val = normalize(cell.v);
                                return keywords.every(k => val.includes(k));
                            });
                        }
                        if (idx !== -1) return idx;

                        // 3. Try Alternative Keywords (e.g. just "name" instead of "shop name")
                        if (altKeywords.length > 0) {
                            // Headers
                            idx = cols.findIndex(col => {
                                const label = normalize(col.label || '');
                                return altKeywords.every(k => label.includes(k));
                            });
                            if (idx !== -1) return idx;

                            // First Row
                            if (rows.length > 0) {
                                idx = rows[0].c.findIndex(cell => {
                                    if (!cell || !cell.v) return false;
                                    const val = normalize(cell.v);
                                    return altKeywords.every(k => val.includes(k));
                                });
                            }
                        }
                        return idx;
                    };

                    const qrUrlIndex = findIndex(['qr', 'url']);
                    const shopNameIndex = findIndex(['shop', 'name'], ['name', 'business']); // fallback to just 'name' or 'business'
                    const shopLogoIndex = findIndex(['shop', 'logo'], ['logo', 'image']);
                    const mapUrlIndex = findIndex(['map', 'url']) !== -1 ? findIndex(['map', 'url']) : findIndex(['google', 'url']);
                    const placeIdIndex = findIndex(['place', 'id'], ['pid', 'placeid']);

                    // Debugging logs
                    console.log('Detected Columns:', { qrUrlIndex, shopNameIndex, shopLogoIndex, mapUrlIndex, placeIdIndex });

                    if (qrUrlIndex === -1 && placeIdIndex === -1) {
                        console.warn('Critical columns missing (QR URL or Place ID). Dumping headers:', cols.map(c => c.label));
                        // Don't throw immediately, try to match whatever we have
                    }

                    // Strategy 3: Check by Place ID (Primary & Robust)
                    // Extract the Place ID from the URL slug
                    // Robust Match: Look for standard Google Place ID prefix 'ChIJ' followed by valid chars
                    const pidMatch = shopId.match(/(ChIJ[a-zA-Z0-9_-]+)/);
                    const extractedPid = pidMatch ? pidMatch[0] : shopId.split('-').pop(); // Fallback to last part

                    let foundDetails = null;
                    const isValid = rows.some(row => {
                        let name = null;
                        let logo = null;
                        let map = null;
                        let pid = null;

                        // Extract data first
                        if (shopNameIndex !== -1 && row.c[shopNameIndex]) name = row.c[shopNameIndex]?.v;
                        if (shopLogoIndex !== -1 && row.c[shopLogoIndex]) {
                            const rawLogo = row.c[shopLogoIndex]?.v || row.c[shopLogoIndex]?.f;
                            logo = formatGoogleDriveUrl(rawLogo);
                        }
                        if (mapUrlIndex !== -1 && row.c[mapUrlIndex]) map = row.c[mapUrlIndex]?.v;
                        if (placeIdIndex !== -1 && row.c[placeIdIndex]) pid = row.c[placeIdIndex]?.v;

                        // Check 1: Extracted Place ID Match (Strongest)
                        if (placeIdIndex !== -1 && pid) {
                            // Normalize both just in case
                            if (normalize(pid) === normalize(extractedPid)) {
                                foundDetails = { shopName: name, shopLogo: logo, mapUrl: map, placeId: pid };
                                console.log('Match found by Extracted Place ID:', foundDetails);
                                return true;
                            }
                        }

                        // Check 2: Partial Place ID Match (Backup)
                        // If the row's PID is found inside the shopId URL (e.g. legacy URLs)
                        if (placeIdIndex !== -1 && pid) {
                            if (shopId.includes(normalize(pid))) {
                                foundDetails = { shopName: name, shopLogo: logo, mapUrl: map, placeId: pid };
                                console.log('Match found by Partial Place ID:', foundDetails);
                                return true;
                            }
                        }

                        // Check 3: Exact QR URL Match (Legacy)
                        if (qrUrlIndex !== -1 && row.c[qrUrlIndex]) {
                            const cellValue = normalize(row.c[qrUrlIndex]?.v);
                            if (cellValue.includes(shopId)) {
                                foundDetails = { shopName: name, shopLogo: logo, mapUrl: map, placeId: pid };
                                console.log('Match found by QR URL:', foundDetails);
                                return true;
                            }
                        }

                        return false;
                    });

                    if (foundDetails) {
                        setStatus('valid');
                        setShopDetails(foundDetails);
                    } else {
                        // FALLBACK: If not found in sheet, still allow access...
                        console.warn('Shop ID not found in sheet (searched for PID: ' + extractedPid + '), falling back.');
                        setShopDetails({ shopName: 'Shop ' + shopId.substring(0, 8) + '...', shopLogo: null, mapUrl: null, placeId: extractedPid }); // Use extracted PID at least
                        setStatus('valid');
                    }

                } catch (error) {
                    console.error('Processing error:', error);
                    setStatus('error');
                    setErrorMsg(error.message);
                } finally {
                    if (cleanupScript) cleanupScript.remove();
                }
            };

            // Inject Script
            const script = document.createElement('script');
            script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}`;
            script.onerror = () => {
                console.warn('Network error: Failed to load Google Sheet data. Proceeding in fallback mode.');
                // Fallback: Just assume it's valid for now to avoid blocking the user
                setShopDetails({ shopName: 'Shop: ' + shopId, shopLogo: null, mapUrl: null });
                setStatus('valid');
                delete window[callbackName];
            };
            document.body.appendChild(script);
            cleanupScript = script;
        };

        if (shopId) {
            validateShop();
        }

        return () => {
            if (cleanupScript) cleanupScript.remove();
        };
    }, [shopId]);

    if (status === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 flex-col gap-4">
                <div className="w-12 h-12 border-4 border-pucho-purple border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium animate-pulse">Verifying Shop...</p>
            </div>
        );
    }

    if (status === 'valid') {
        return <CustomerReview shopName={shopDetails?.shopName} shopLogo={shopDetails?.shopLogo} mapUrl={shopDetails?.mapUrl} placeId={shopDetails?.placeId} />;
    }

    if (status === 'invalid') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 flex-col text-center p-4">
                <h1 className="text-4xl font-bold text-gray-300 mb-4">404</h1>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Shop Not Found</h2>
                <p className="text-gray-500 max-w-md">
                    The shop ID <span className="font-mono bg-gray-200 px-1 rounded">/{shopId}</span> could not be confirmed.
                    Please check the URL or contact support.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 flex-col text-center p-4">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Validation Error</h2>
            <p className="text-gray-500 max-w-md mb-4">{errorMsg}</p>
            <div className="text-sm text-gray-400 max-w-sm bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <p className="font-semibold mb-1">Troubleshooting:</p>
                <ul className="text-left list-disc pl-4 space-y-1">
                    <li>Ensure the Google Sheet is <b>"Published to the web"</b> (File → Share → Publish to web).</li>
                    <li>Ensure the "QrURL" column exists.</li>
                </ul>
            </div>
        </div>
    );
};

export default ShopValidator;
