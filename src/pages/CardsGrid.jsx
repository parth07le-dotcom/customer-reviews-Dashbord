import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

const CardsGrid = () => {
    const [shopCount, setShopCount] = useState(null);
    const [shops, setShops] = useState([]);
    const [loadingCount, setLoadingCount] = useState(true);

    useEffect(() => {
        let cleanupScript = null;
        let activeCallbackName = null;

        const fetchSheetData = () => {
            // Using the correct sheet ID provided by user
            const SHEET_ID = '1UcRAbcxmDkpiaFY7SWmc--79BJRvaRG1J6omsrj-8bg';
            const callbackName = 'googleSheetCountCallback_' + Math.floor(Math.random() * 100000);
            activeCallbackName = callbackName;

            window[callbackName] = (json) => {
                try {
                    if (json && json.table && json.table.rows) {
                        const rows = json.table.rows;

                        // Calculate active shop count (rows - 1 for header)
                        const count = Math.max(0, rows.length - 1);
                        setShopCount(count);

                        // Parse Data for List
                        if (rows.length > 0) {
                            let headers = [];
                            let startRowIndex = 0;

                            // Strategy: Always use the first row of data as headers
                            // We use &headers=0 in the query to ensure the first row is returned as data
                            if (rows[0].c) {
                                headers = rows[0].c.map(cell => cell?.v || '');
                                startRowIndex = 1; // Skip the first row since it's now headers
                            }

                            // Filter out empty headers just in case
                            headers = headers.filter(h => h);

                            // Map rows to objects based on headers
                            const parsedShops = [];
                            for (let i = startRowIndex; i < rows.length; i++) {
                                const row = rows[i];
                                if (!row.c) continue;

                                const shopObj = {};
                                headers.forEach((header, index) => {
                                    if (row.c[index]) {
                                        shopObj[header] = row.c[index]?.v;
                                    }
                                });
                                parsedShops.push(shopObj);
                            }
                            setShops(parsedShops);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching sheets:', error);
                } finally {
                    setLoadingCount(false);
                    // Only delete if it's the specific callback for this request
                    delete window[callbackName];
                }
            };

            const script = document.createElement('script');
            // Added &headers=0 to force the first row to be treated as data
            script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}&headers=0`;
            script.onerror = () => {
                setLoadingCount(false);
                delete window[callbackName];
            };
            document.body.appendChild(script);
            cleanupScript = script;
        };

        fetchSheetData();

        return () => {
            if (cleanupScript) cleanupScript.remove();
            if (activeCallbackName) delete window[activeCallbackName];
        };
    }, []);

    return (
        <div className="space-y-8">
            {/* Top Stats Section */}
            <div className="">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-pucho-purple/10 flex items-center justify-center text-pucho-purple">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Active Shops</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {loadingCount ? (
                                    <span className="animate-pulse">...</span>
                                ) : (
                                    shopCount !== null ? shopCount : '-'
                                )}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shop List Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Registered Shops</h3>
                    <div className="text-sm text-gray-500">
                        Live Data from Google Sheets
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                {/* Dynamically render headers if available, else static fallback */}
                                {shops.length > 0 && Object.keys(shops[0]).map((key, idx) => (
                                    <th key={idx} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {key}
                                    </th>
                                ))}
                                {shops.length === 0 && !loadingCount && (
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loadingCount ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-pucho-purple border-t-transparent rounded-full animate-spin"></div>
                                            Loading shops data...
                                        </div>
                                    </td>
                                </tr>
                            ) : shops.length > 0 ? (
                                shops.map((shop, rowIndex) => (
                                    <tr key={rowIndex} className="hover:bg-gray-50/50 transition-colors">
                                        {Object.entries(shop).map(([header, value], colIndex) => {
                                            const headerLower = header.toLowerCase();
                                            const isImage = headerLower.includes('logo') || headerLower.includes('image') || (headerLower.includes('qr') && headerLower.includes('url'));
                                            const isUrl = typeof value === 'string' && (value.startsWith('http') || value.startsWith('/'));

                                            return (
                                                <td key={colIndex} className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                                    {isImage && isUrl ? (
                                                        <a href={value} target="_blank" rel="noreferrer" className="block w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:border-pucho-purple transition-colors bg-white">
                                                            <img src={value} alt={header} className="w-full h-full object-contain" />
                                                        </a>
                                                    ) : isUrl ? (
                                                        <a href={value} target="_blank" rel="noreferrer" className="text-pucho-purple hover:underline flex items-center gap-1 max-w-[150px] truncate">
                                                            Link <span className="text-xs">↗</span>
                                                        </a>
                                                    ) : (
                                                        <span className="max-w-[200px] block truncate" title={value}>
                                                            {value}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No shops found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CardsGrid;
