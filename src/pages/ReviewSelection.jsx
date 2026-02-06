import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, MapPin, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo.png';

const ReviewSelection = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { generatedReviews, shopName, shopLogo, mapUrl, placeId } = location.state || {}; // Extract data from navigation state

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    const getReviewUrl = () => {
        // TEMP: Use hardcoded ID for testing if dynamic one is missing
        const effectivePlaceId = placeId || 'ChIJFVd0QX4zXDkRsbFF7J2x9Ro';

        if (effectivePlaceId) {
            return `https://search.google.com/local/writereview?placeid=${effectivePlaceId}`;
        }
        if (mapUrl) {
            if (mapUrl.includes('writereview')) return mapUrl;
            if (mapUrl.includes('g.page')) {
                return mapUrl.endsWith('/') ? `${mapUrl}review` : `${mapUrl}/review`;
            }
            return mapUrl;
        }
        return '';
    };

    const handlePostToMap = (text) => {
        navigator.clipboard.writeText(text);

        const targetUrl = getReviewUrl();

        if (!targetUrl) {
            alert('Review text copied to clipboard! (No Place ID or Map URL available to open)');
            return;
        }

        alert('Review text copied! Opening Google Maps in a popup window... Please paste your review there.');

        const width = 600;
        const height = 800;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        window.open(
            targetUrl,
            'GoogleMapReview',
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
        );
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
                <div className="pl-10">
                    <img src={logo} alt="Pucho" className="h-8 w-auto" />
                </div>
                <div className="pr-10 flex items-center gap-3">
                    {shopLogo && (
                        <img
                            src={shopLogo}
                            alt={shopName}
                            className="h-16 w-16 object-contain"
                            onError={(e) => e.target.style.display = 'none'}
                        />
                    )}
                    <span className="text-lg font-bold text-gray-900">
                        {shopName ? `${shopName}` : 'Customer Review'}
                    </span>
                </div>
            </nav>

            <main className="flex-1 flex flex-col items-center p-4 py-8 overflow-y-auto">
                <div className="w-full max-w-4xl space-y-6 animate-fade-in">

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Your Generated Reviews</h2>
                        <p className="text-gray-500">Choose a version to post.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Short Review Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Short Review</h3>
                            <p className="text-gray-800 text-lg font-medium leading-relaxed flex-1">
                                "{generatedReviews.short || 'No summary available.'}"
                            </p>
                            <div className="mt-6 flex flex-col gap-3">
                                <button
                                    onClick={() => handleCopy(generatedReviews.short)}
                                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                                >
                                    <Copy size={16} />
                                    Copy Text
                                </button>
                                <button
                                    onClick={() => handlePostToMap(generatedReviews.short)}
                                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-pucho-purple hover:bg-pucho-hover text-white font-medium transition-colors w-full"
                                >
                                    <MapPin size={16} />
                                    Post Review
                                </button>
                            </div>
                        </div>

                        {/* Long Review Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Detailed Review</h3>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap flex-1">
                                {generatedReviews.long || 'No details available.'}
                            </p>
                            <div className="mt-6 flex flex-col gap-3">
                                <button
                                    onClick={() => handleCopy(generatedReviews.long)}
                                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                                >
                                    <Copy size={16} />
                                    Copy Text
                                </button>
                                <button
                                    onClick={() => handlePostToMap(generatedReviews.long)}
                                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-pucho-purple hover:bg-pucho-hover text-white font-medium transition-colors w-full"
                                >
                                    <MapPin size={16} />
                                    Post Review
                                </button>
                            </div>
                        </div>
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
