import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, MapPin, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo.png';
import Toast from '../components/ui/Toast';

const ReviewSelection = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { generatedReviews, shopName, shopLogo, mapUrl, placeId, generatedUrl } = location.state || {}; // Extract data from navigation state

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

    // State for shop data (initialized with passed state, formatted)
    const [currentShopData, setCurrentShopData] = useState({
        name: shopName,
        logo: formatGoogleDriveUrl(shopLogo)
    });

    // State for image loading error
    const [imgError, setImgError] = useState(false);

    // Reset image error when logo changes
    React.useEffect(() => {
        setImgError(false);
    }, [currentShopData.logo]);

    // Fetch Shop Data from Sheet if placeId is available (to ensure we have the correct details)
    React.useEffect(() => {
        if (placeId) {
            const SHEET_ID = '1UcRAbcxmDkpiaFY7SWmc--79BJRvaRG1J6omsrj-8bg';
            const callbackName = 'googleSheetReviewCallback_' + Math.floor(Math.random() * 100000);

            window[callbackName] = (json) => {
                try {
                    if (json && json.table && json.table.rows) {
                        const rows = json.table.rows;
                        const cols = json.table.cols;
                        const normalize = (str) => (str || '').toLowerCase().trim();

                        // Improved Column Detection Helper (Same as CustomerReview)
                        const findIndex = (keywords, altKeywords = []) => {
                            let idx = cols.findIndex(col => {
                                const label = normalize(col.label || '');
                                return keywords.every(k => label.includes(k));
                            });
                            if (idx !== -1) return idx;

                            if (rows.length > 0) {
                                idx = rows[0].c.findIndex(cell => {
                                    if (!cell || !cell.v) return false;
                                    const val = normalize(cell.v);
                                    return keywords.every(k => val.includes(k));
                                });
                            }
                            if (idx !== -1) return idx;

                            if (altKeywords.length > 0) {
                                idx = cols.findIndex(col => {
                                    const label = normalize(col.label || '');
                                    return altKeywords.every(k => label.includes(k));
                                });
                                if (idx !== -1) return idx;
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

                        const placeIdIndex = findIndex(['place', 'id'], ['pid', 'placeid']);
                        const shopNameIndex = findIndex(['shop', 'name'], ['name', 'business']);
                        const shopLogoIndex = findIndex(['shop', 'logo'], ['logo', 'image']);

                        if (placeIdIndex !== -1) {
                            const targetId = normalize(placeId);
                            let foundRow = rows.find(row => {
                                const cellValue = normalize(row.c[placeIdIndex]?.v);
                                return cellValue === targetId || cellValue.includes(targetId) || targetId.includes(cellValue);
                            });

                            if (foundRow) {
                                const newName = shopNameIndex !== -1 ? foundRow.c[shopNameIndex]?.v : null;
                                const rawLogo = shopLogoIndex !== -1 ? foundRow.c[shopLogoIndex]?.v : null;
                                const newLogo = formatGoogleDriveUrl(rawLogo);

                                setCurrentShopData(prev => ({
                                    name: newName || prev.name,
                                    logo: newLogo || prev.logo
                                }));
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error fetching shop details in ReviewSelection:', err);
                } finally {
                    delete window[callbackName];
                }
            };

            const script = document.createElement('script');
            script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}`;
            document.body.appendChild(script);

            return () => {
                delete window[callbackName];
                script.remove();
            };
        }
    }, [placeId]);

    const [selectedType, setSelectedType] = useState('short');
    const [toast, setToast] = useState(null);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setToast({ message: 'Copied to clipboard!', type: 'success' });
    };

    const getReviewUrl = () => {
        // 1. Priority: Use the fully generated URL passed from CustomerReview (containing webhook PlaceId)
        if (generatedUrl) {
            return generatedUrl;
        }

        // 2. Strict: Use the placeId (if passed separately)
        if (placeId) {
            return `https://search.google.com/local/writereview?placeid=${placeId}`;
        }

        // 3. Fallback to Map URL only if Place ID is completely missing
        if (mapUrl) {
            if (mapUrl.includes('writereview')) return mapUrl;
            if (mapUrl.includes('g.page')) {
                return mapUrl.endsWith('/') ? `${mapUrl}review` : `${mapUrl}/review`;
            }
            return mapUrl;
        }
        return '';
    };

    const handlePostToMap = () => {
        const text = generatedReviews[selectedType];
        navigator.clipboard.writeText(text);

        const targetUrl = getReviewUrl();

        if (!targetUrl) {
            // User-friendly error toast instead of alert
            console.error('Debug Info:', { generatedUrl, placeId, mapUrl });
            setToast({
                message: 'Error: Cannot open map. No valid link available.',
                type: 'error'
            });
            return;
        }

        setToast({ message: 'Review copied! Opening Google Maps...', type: 'success' });

        const width = 600;
        const height = 800;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        // Slight delay to allow toast to be seen
        setTimeout(() => {
            window.open(
                targetUrl,
                'GoogleMapReview',
                `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
            );
        }, 1000);
    };

    if (!generatedReviews) {
        return (
            <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <p className="text-gray-500 mb-4">No reviews generated. Please submit a text first.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-pucho-purple hover:underline"
                >
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}




            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
                <div className="flex items-center">
                    <img src={logo} alt="Project Logo" className="h-8 w-auto" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                            {currentShopData.name || 'Shop'}
                        </p>
                    </div>
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                        {currentShopData.logo && !imgError ? (
                            <img
                                src={currentShopData.logo}
                                alt={currentShopData.name}
                                className="h-full w-full object-contain p-0.5"
                                referrerPolicy="no-referrer"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <img
                                src={logo} // Use the dummy logo (project logo) as fallback
                                alt="Shop Logo"
                                className="h-full w-full object-contain p-2"
                            />
                        )}
                    </div>
                </div>
            </nav>



            <main className="flex-1 flex flex-col items-center p-4 py-8 overflow-y-auto">
                <div className="w-full max-w-4xl space-y-6 animate-fade-in relative pb-24">

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Your Generated Reviews</h2>
                        <p className="text-gray-500">Choose a version to post.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Short Review Card */}
                        <div
                            onClick={() => setSelectedType('short')}
                            className={`bg-white p-6 rounded-2xl shadow-sm border transition-all cursor-pointer flex flex-col ${selectedType === 'short'
                                ? 'border-pucho-purple ring-2 ring-pucho-purple shadow-md scale-[1.02]'
                                : 'border-gray-100 hover:border-pucho-purple/50'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Short Review</h3>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedType === 'short' ? 'border-pucho-purple bg-pucho-purple' : 'border-gray-300'
                                    }`}>
                                    {selectedType === 'short' && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                            </div>
                            <p className="text-gray-800 text-lg font-medium leading-relaxed flex-1">
                                "{generatedReviews.short || 'No summary available.'}"
                            </p>
                            <div className="mt-6">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(generatedReviews.short);
                                    }}
                                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors w-full"
                                >
                                    <Copy size={16} />
                                    Copy Text
                                </button>
                            </div>
                        </div>

                        {/* Long Review Card */}
                        <div
                            onClick={() => setSelectedType('long')}
                            className={`bg-white p-6 rounded-2xl shadow-sm border transition-all cursor-pointer flex flex-col ${selectedType === 'long'
                                ? 'border-pucho-purple ring-2 ring-pucho-purple shadow-md scale-[1.02]'
                                : 'border-gray-100 hover:border-pucho-purple/50'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Detailed Review</h3>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedType === 'long' ? 'border-pucho-purple bg-pucho-purple' : 'border-gray-300'
                                    }`}>
                                    {selectedType === 'long' && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                            </div>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap flex-1">
                                {generatedReviews.long || 'No details available.'}
                            </p>
                            <div className="mt-6">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(generatedReviews.long);
                                    }}
                                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors w-full"
                                >
                                    <Copy size={16} />
                                    Copy Text
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Footer Button */}
                    <div className="fixed bottom-8 left-0 right-0 flex justify-center z-20 pointer-events-none">
                        <button
                            onClick={handlePostToMap}
                            className="pointer-events-auto bg-pucho-purple text-white font-bold py-4 px-12 rounded-full shadow-lg hover:bg-pucho-hover active:scale-95 transition-all flex items-center gap-3 text-lg animate-fade-in-up"
                        >
                            <MapPin size={20} />
                            Post Selected Review
                        </button>
                    </div>

                    <div className="text-center pt-8">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-pucho-purple hover:text-pucho-hover font-medium hover:underline"
                        >
                            Generate Another
                        </button>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default ReviewSelection;
