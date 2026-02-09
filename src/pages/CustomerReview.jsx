import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, MessageSquare, Copy, MapPin } from 'lucide-react';
import logo from '../assets/logo.png';

import Toast from '../components/ui/Toast';

const CustomerReview = ({ shopName, shopLogo, mapUrl, placeId }) => {
    const [review, setReview] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedKeywords, setSelectedKeywords] = useState(new Set());
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const inputRef = React.useRef(null);

    // Get PID from URL if not provided in props
    const searchParams = new URLSearchParams(location.search);
    const pidFromUrl = searchParams.get('pid');
    const activePlaceId = placeId || pidFromUrl;

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

    // Fetch Shop Data from Sheet if not provided props or to ensure latest
    const [shopData, setShopData] = useState({ name: shopName, logo: formatGoogleDriveUrl(shopLogo) });

    // State for image loading error
    const [imgError, setImgError] = useState(false);

    // Reset image error when logo changes
    useEffect(() => {
        setImgError(false);
    }, [shopData.logo]);

    useEffect(() => {
        if (activePlaceId) {
            const SHEET_ID = '1UcRAbcxmDkpiaFY7SWmc--79BJRvaRG1J6omsrj-8bg';
            const callbackName = 'googleSheetCustomerCallback_' + Math.floor(Math.random() * 100000);

            window[callbackName] = (json) => {
                try {
                    if (json && json.table && json.table.rows) {
                        const rows = json.table.rows;
                        const cols = json.table.cols;
                        const normalize = (str) => (str || '').toLowerCase().trim();

                        // Improved Column Detection Helper
                        const findIndex = (keywords, altKeywords = []) => {
                            // 1. Headers
                            let idx = cols.findIndex(col => {
                                const label = normalize(col.label || '');
                                return keywords.every(k => label.includes(k));
                            });
                            if (idx !== -1) return idx;

                            // 2. First Row
                            if (rows.length > 0) {
                                idx = rows[0].c.findIndex(cell => {
                                    if (!cell || !cell.v) return false;
                                    const val = normalize(cell.v);
                                    return keywords.every(k => val.includes(k));
                                });
                            }
                            if (idx !== -1) return idx;

                            // 3. Alternates
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
                            const targetId = normalize(activePlaceId);
                            const foundRow = rows.find(row => {
                                const cellValue = normalize(row.c[placeIdIndex]?.v);
                                return cellValue.includes(targetId);
                            });

                            if (foundRow) {
                                const newName = shopNameIndex !== -1 ? foundRow.c[shopNameIndex]?.v : null;
                                const rawLogo = shopLogoIndex !== -1 ? foundRow.c[shopLogoIndex]?.v : null;
                                const newLogo = formatGoogleDriveUrl(rawLogo);

                                setShopData(prev => ({
                                    name: newName || prev.name,
                                    logo: newLogo || prev.logo
                                }));
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error fetching shop details:', err);
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
    }, [activePlaceId]);

    const keywords = [
        '⭐ Excellent',
        '👍 Very Good',
        '🙂 Good',
        '😐 Average',
        '👎 Needs Improvement',
        '⚠️ Poor'
    ];

    const handleKeywordClick = (keyword) => {
        const textToAppend = keyword.replace(/^[^\s]+\s/, ''); // Remove emoji for text if desired, or keep it? User said "insert the selected keyword text". Usually includes emoji if shown. strict: "insert the selected keyword text". I will insert the full text including emoji as it adds character.
        // Actually, let's keep the full string as requested.

        setReview(prev => {
            const prefix = prev.trim() ? ' ' : '';
            return prev + prefix + keyword;
        });

        setSelectedKeywords(prev => {
            const newSet = new Set(prev);
            newSet.add(keyword);
            return newSet;
        });

        // Focus input
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!review.trim()) return;

        setLoading(true);

        // Minimum loading time of 4 seconds as requested
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 4000));

        try {
            const payload = {
                review,
                shopName: shopData.name || shopName || 'Unknown Shop', // Prioritize fetched name
                shopLogo: shopData.logo || shopLogo || '', // Add shop logo
                url: window.location.href, // Explicitly sending current page URL
                shopUrl: window.location.href, // Keeping for backward compatibility
                mapUrl: mapUrl || ''
            };
            console.log('Sending Webhook Payload:', payload);

            const [response] = await Promise.all([
                fetch('https://studio.pucho.ai/api/v1/webhooks/Icxl96gj7yKguCYWMgeOU/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }),
                minLoadingTime
            ]);

            if (response.ok) {
                const json = await response.json();
                console.log('Webhook Response:', json); // Debugging

                // Handle nested data structure { data: { ... } } or flat structure
                const data = json.data || json;

                const shortReview = data.short_review || data.short || data.shortReview;
                const longReview = data.long_review || data.long || data.review || data.detailedReview;

                // Extract PlaceId from webhook response (PascalCase based on screenshot)
                // Also check snake_case or other variations just in case
                const webhookPlaceId = json.PlaceId || data.PlaceId || json.placeId || data.placeId || json.place_id || data.place_id;

                let generatedUrl = '';
                if (webhookPlaceId) {
                    generatedUrl = `https://search.google.com/local/writereview?placeid=${webhookPlaceId}`;
                } else if (placeId) {
                    generatedUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
                }

                // Debugging alert to help user verify
                if (generatedUrl) {
                    console.log('Generated Review URL:', generatedUrl);
                } else {
                    console.warn('Could not generate direct review URL (missing PlaceId)');
                }

                if (shortReview || longReview) {
                    // Navigate to results page with data
                    navigate('/review-results', {
                        state: {
                            generatedReviews: {
                                short: shortReview || 'No short summary available.',
                                long: longReview || 'No details available.'
                            },
                            shopName: shopData.name,
                            shopLogo: shopData.logo,
                            mapUrl,
                            placeId: webhookPlaceId || placeId, // Still pass ID just in case
                            generatedUrl // PASS THE FULL URL
                        }
                    });
                } else {
                    // Fallback if response is OK but data is empty/malformed
                    console.warn('Empty review data received', json);
                    setToast({ message: 'Review submitted, but no content was returned from the server.', type: 'info' });
                }
                setReview('');
            } else {
                setToast({ message: 'Failed to submit review. Please try again.', type: 'error' });
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            setToast({ message: 'An error occurred. Please try again.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const LoadingSkeleton = () => (
        <div className="w-full max-w-2xl space-y-6 animate-pulse">
            <div className="text-center mb-8 space-y-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto"></div>
                <div className="h-8 bg-gray-200 rounded w-48 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Short Review Skeleton */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-64">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
                    <div className="space-y-3 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    </div>
                    <div className="mt-6 space-y-3">
                        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                    </div>
                </div>

                {/* Long Review Skeleton */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-64">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
                    <div className="space-y-3 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center mt-8">
                <div className="h-4 bg-gray-200 rounded w-40"></div>
            </div>
        </div>
    );
    return (
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Navbar */}
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
                <div className="flex items-center">
                    <img src={logo} alt="Project Logo" className="h-8 w-auto" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                            {shopData.name || 'Shop'}
                        </p>
                    </div>
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                        {shopData.logo && !imgError ? (
                            <img
                                src={shopData.logo}
                                alt={shopData.name}
                                className="h-full w-full object-contain p-0.5"
                                referrerPolicy="no-referrer"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <img
                                src={logo}
                                alt="Shop Logo"
                                className="h-full w-full object-contain p-2"
                            />
                        )}
                    </div>
                </div>
            </nav>

            <main className="flex-1 flex flex-col items-center p-4 py-8 overflow-y-auto">
                {loading ? (
                    <LoadingSkeleton />
                ) : (
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-12">
                        <div className="flex flex-col items-center text-center mb-10">
                            <h1 className="text-3xl font-bold text-gray-900">
                                Share your experience
                            </h1>
                            <p className="text-gray-500 mt-3 text-lg">We value your feedback.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-4">
                                <div className="relative">
                                    <label htmlFor="review" className="sr-only">Review</label>
                                    <textarea
                                        ref={inputRef}
                                        id="review"
                                        rows={6}
                                        className="w-full p-5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pucho-purple/20 focus:border-pucho-purple transition-all resize-none bg-gray-50/50 text-lg"
                                        placeholder="Write your review here..."
                                        value={review}
                                        onChange={(e) => setReview(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="flex flex-wrap gap-3 justify-center">
                                    {keywords.map((keyword) => (
                                        <button
                                            key={keyword}
                                            type="button"
                                            onClick={() => handleKeywordClick(keyword)}
                                            className={`
                                                px-4 py-2 rounded-full border text-sm font-medium transition-all
                                                ${selectedKeywords.has(keyword)
                                                    ? 'bg-pucho-purple/10 border-pucho-purple text-pucho-purple ring-1 ring-pucho-purple'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-pucho-purple/50 hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            {keyword}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !review.trim()}
                                className={`
                                    w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium text-white
                                    bg-pucho-purple hover:bg-pucho-hover transition-all shadow-md active:scale-95
                                    disabled:opacity-70 disabled:cursor-not-allowed
                                `}
                            >
                                <Send size={18} />
                                {loading ? 'Generating...' : 'Generate Review'}
                            </button>
                        </form>
                    </div>
                )}
            </main>

            <div className="py-6 text-center border-t border-gray-100 bg-white">
                <p className="text-xs text-gray-400">Powered by Pucho.ai</p>
            </div>
        </div>
    );
};

export default CustomerReview;
