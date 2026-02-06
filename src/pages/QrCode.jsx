import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QrCode as QrIcon, Loader2, RefreshCw } from 'lucide-react';

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1UcRAbcxmDkpiaFY7SWmc--79BJRvaRG1J6omsrj-8bg/export?format=csv';

const QrCode = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const userName = location.state?.userName;

    const [loading, setLoading] = useState(true);
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    const fetchQrCode = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching Google Sheet CSV...');

            const response = await fetch(GOOGLE_SHEET_CSV_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const text = await response.text();

            // Simple CSV Parser
            const rows = text.split('\n').map(row => {
                // Handle comma within quotes based regex or simple split if no commas in values
                // Given the sample, URLs might contain commas, so we need a robust split
                // But for now, let's try a regex that handles quoted values
                const regex = /(?:,|\n|^)(?:"([^"]*)"|([^",\n]*))/g;
                const matches = [];
                let match;
                while ((match = regex.exec(row)) !== null) {
                    // This regex is a bit complex for client side simple split, 
                    // let's use a simpler approach assuming standard CSV export
                    if (match[1] !== undefined) matches.push(match[1]);
                    else if (match[2] !== undefined) matches.push(match[2]);
                }
                return matches;
            });

            // The parser above might be overkill or buggy for simple structure, 
            // let's try a standard split, but handle quotes if possible. 
            // Actually, for simplicity and robustness with the known structure:
            // Column 0 is User Name, Column 7 is QR CodeUrl (0-indexed)

            // Better parse approach for this specific sheet structure
            // We know the structure: User Name, ..., QR CodeUrl is last or near last

            let foundUrl = null;

            // Skip header (index 0)
            const lines = text.split('\n');
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line) continue;

                // If user name is simple (no commas), we can find it at the start
                if (line.startsWith(`${userName},`) || line.startsWith(`"${userName}",`)) {
                    // This is our row.
                    // The URL is the 8th column (index 7).
                    // Let's extract it carefully.

                    // Split the line, respecting quotes is hard without library
                    // But we can try to assume standard formatting.
                    // Let's use a regex to split by comma, ignoring commas inside quotes
                    const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                    // This regex is also not perfect.

                    // Fallback: Split by comma and handle manually if needed, 
                    // or since we know the URL is usually long and at the end?
                    // Header: User Name,Password,Shop Name,Shop URL,Shop Logo,Map URL,Place Id,QR CodeUrl
                    // That is 8 columns.

                    // Let's try to just split by comma and see if it works for simple cases,
                    // but map or shop logo URLs might have commas?
                    // The sample showed quotes around Map URL.

                    const parts = [];
                    let currentPart = '';
                    let inQuotes = false;
                    for (let char of line) {
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            parts.push(currentPart);
                            currentPart = '';
                        } else {
                            currentPart += char;
                        }
                    }
                    parts.push(currentPart);

                    if (parts[0] === userName || parts[0] === `"${userName}"`) {
                        // found it
                        // parts[7] should be the QR Code URL
                        // remove potential surrounding quotes
                        const url = parts[7]?.replace(/^"|"$/g, '').trim();
                        if (url && url.startsWith('http')) {
                            foundUrl = url;
                            break;
                        }
                    }
                }
            }

            if (foundUrl) {
                setQrCodeUrl(foundUrl);
            } else {
                // Not found yet
                // Don't set error immediately, maybe it's still generating
                console.log('QR Code not found for user yet.');
            }

        } catch (err) {
            console.error('Error fetching/parsing CSV:', err);
            setError('Failed to load QR Code status.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userName) {
            fetchQrCode();
        }
    }, [userName]);

    // Polling effect: Retry every 5 seconds if not found
    useEffect(() => {
        if (!qrCodeUrl && retryCount < 20 && userName) {
            const timer = setTimeout(() => {
                setRetryCount(prev => prev + 1);
                fetchQrCode();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [qrCodeUrl, retryCount, userName]);

    if (!userName) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">No user specified. Please create a user first.</p>
                <button onClick={() => navigate('/admin/user-admin')} className="ml-4 text-pucho-purple underline">Go back</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-subtle flex flex-col items-center max-w-md w-full animate-fade-in">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Scan QR Code</h1>
                <p className="text-gray-500 mb-6 text-sm text-center">
                    User: <span className="font-semibold text-gray-900">{userName}</span>
                </p>

                <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden relative">
                    {loading && !qrCodeUrl && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 z-10">
                            <Loader2 size={32} className="animate-spin text-pucho-purple mb-2" />
                            <span className="text-xs text-gray-500">Checking status... ({retryCount})</span>
                        </div>
                    )}

                    {qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="Shop QR Code" className="w-full h-full object-contain animate-in fade-in duration-500" />
                    ) : (
                        <div className="text-center text-gray-400 p-4">
                            {!loading && (
                                <>
                                    <QrIcon size={64} className="mx-auto mb-2 opacity-50" />
                                    <span className="text-sm block">Generating QR Code...</span>
                                    <span className="text-xs text-gray-400 block mt-1">This may take a minute</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {qrCodeUrl ? (
                    <p className="text-green-600 mt-6 text-sm font-medium flex items-center gap-2">
                        Ready to scan!
                    </p>
                ) : (
                    <div className="mt-6 flex flex-col items-center gap-2">
                        <p className="text-gray-400 text-xs text-center max-w-xs">
                            We are waiting for the system to generate your QR Code.
                        </p>
                        <button
                            onClick={fetchQrCode}
                            className="flex items-center gap-2 text-xs text-pucho-purple hover:underline"
                            disabled={loading}
                        >
                            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                            Check Now
                        </button>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 w-full flex justify-center">
                    <button
                        onClick={() => navigate('/admin/user-admin')}
                        className="text-gray-500 hover:text-gray-900 text-sm transition-colors"
                    >
                        Create Another User
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QrCode;
