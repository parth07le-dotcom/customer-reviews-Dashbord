import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, MessageSquare, Copy, MapPin } from 'lucide-react';
import logo from '../assets/logo.png';

const CustomerReview = ({ shopName, shopLogo, mapUrl, placeId }) => {
    const [review, setReview] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!review.trim()) return;

        setLoading(true);

        // Minimum loading time of 4 seconds as requested
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 4000));

        try {
            const payload = {
                review,
                shopName: shopName || 'Unknown Shop',
                shopUrl: window.location.href,
                mapUrl: mapUrl || ''
            };
            console.log('Sending Webhook Payload:', payload);

            const [response] = await Promise.all([
                fetch('/api/webhook/Icxl96gj7yKguCYWMgeOU/sync', {
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

                if (shortReview || longReview) {
                    // Navigate to results page with data
                    navigate('/review-results', {
                        state: {
                            generatedReviews: {
                                short: shortReview || 'No short summary available.',
                                long: longReview || 'No details available.'
                            },
                            shopName,
                            shopLogo,
                            mapUrl,
                            placeId
                        }
                    });
                } else {
                    // Fallback if response is OK but data is empty/malformed
                    console.warn('Empty review data received', json);
                    alert('Review submitted, but no content was returned from the server.');
                }
                setReview('');
            } else {
                alert('Failed to submit review. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('An error occurred. Please try again.');
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
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
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
                            className="h-16 w-16 object-contain" // Removed circular style per user request
                            onError={(e) => e.target.style.display = 'none'} // Fallback if link is broken
                        />
                    )}
                    <span className="text-lg font-bold text-gray-900">
                        {shopName ? `${shopName}` : 'Customer Review'}
                    </span>
                </div>
            </nav>

            <main className="flex-1 flex flex-col items-center p-4 py-8 overflow-y-auto">
                {loading ? (
                    <LoadingSkeleton />
                ) : (
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                        <div className="flex flex-col items-center text-center mb-8">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Share your experience
                            </h1>
                            <p className="text-gray-500 mt-2">We value your feedback.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="review" className="sr-only">Review</label>
                                <textarea
                                    id="review"
                                    rows={5}
                                    className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pucho-purple/20 focus:border-pucho-purple transition-all resize-none bg-gray-50/50"
                                    placeholder="Enter review..."
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                    required
                                />
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
