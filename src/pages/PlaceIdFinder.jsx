import React from 'react';

const PlaceIdFinder = () => {
    const [activeTool, setActiveTool] = React.useState('map'); // 'map' or 'url'

    return (
        <div className="h-full w-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Place ID Finder</h2>
                    <p className="text-sm text-gray-500 mt-1">Easily find Google Place IDs for your shops using Map or URL search.</p>
                </div>

                {/* Tool Switcher */}
                <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                    <button
                        onClick={() => setActiveTool('map')}
                        className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTool === 'map'
                            ? 'bg-white text-pucho-purple shadow-sm ring-1 ring-gray-200/50'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                            }`}
                    >
                        Map Search
                    </button>
                    <button
                        onClick={() => setActiveTool('url')}
                        className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTool === 'url'
                            ? 'bg-white text-pucho-purple shadow-sm ring-1 ring-gray-200/50'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                            }`}
                    >
                        URL Search
                    </button>
                </div>
            </div>



            <div className="flex-1 relative bg-gray-50/50">
                <iframe
                    key={activeTool} // Force re-render when switching tools
                    src={activeTool === 'map' ? "/portable-placeid-finder/index.html" : "/portable-placeid-finder/url-finder.html"}
                    title="Place ID Finder Tool"
                    className="absolute inset-0 w-full h-full border-none"
                    allow="geolocation"
                />
            </div>
        </div>
    );
};

export default PlaceIdFinder;
