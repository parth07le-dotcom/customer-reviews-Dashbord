import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import { User, Map, Lock, Store, Save, Image as ImageIcon, Link, MapPin } from 'lucide-react';
import Toast from '../components/ui/Toast';

const UserAdmin = () => {
    const [formData, setFormData] = useState({
        userName: '',
        placeId: '',
        mapUrl: '',
        password: '',
        shopName: '',
        shopUrl: '',
        shopLogo: null
    });
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();

    const [registeredPlaceIds, setRegisteredPlaceIds] = useState(new Set());

    useEffect(() => {
        let cleanupScript = null;
        let activeCallbackName = null;

        const fetchPlaceIds = () => {
            const SHEET_ID = '1UcRAbcxmDkpiaFY7SWmc--79BJRvaRG1J6omsrj-8bg';
            const callbackName = 'googleSheetPlaceIdCallback_' + Math.floor(Math.random() * 100000);
            activeCallbackName = callbackName;

            window[callbackName] = (json) => {
                try {
                    if (json && json.table && json.table.rows) {
                        const rows = json.table.rows;
                        if (rows.length > 0 && rows[0].c) {
                            // Find 'Place Id' column index
                            const headers = rows[0].c.map((cell, i) => ({
                                name: cell?.v?.toString().trim().toLowerCase(),
                                index: i
                            }));

                            const placeIdHeader = headers.find(h => h.name === 'place id');

                            if (placeIdHeader) {
                                const ids = new Set();
                                // Start from index 1 to skip header row
                                for (let i = 1; i < rows.length; i++) {
                                    const cell = rows[i].c?.[placeIdHeader.index];
                                    if (cell?.v) {
                                        ids.add(cell.v.toString().trim());
                                    }
                                }
                                setRegisteredPlaceIds(ids);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fetching place IDs:', error);
                } finally {
                    delete window[callbackName];
                }
            };

            const script = document.createElement('script');
            script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}&headers=0`;
            script.onerror = () => {
                delete window[callbackName];
            };
            document.body.appendChild(script);
            cleanupScript = script;
        };

        fetchPlaceIds();

        return () => {
            if (cleanupScript) cleanupScript.remove();
            // Prevent ReferenceError by making the callback a no-op instead of deleting it immediately
            if (activeCallbackName) {
                window[activeCallbackName] = () => { };
            }
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types in placeId field
        if (name === 'placeId') {
            setError('');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, shopLogo: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const placeId = formData.placeId.trim();

        // Length Validation
        if (placeId.length !== 27) {
            setError('Place Id must be 27 characters');
            setLoading(false);
            return;
        }

        // Client-side Duplicate Check
        if (registeredPlaceIds.has(placeId)) {
            setError('Place id is alredy Ragistered');
            setLoading(false);
            return;
        }

        const data = new FormData();
        data.append('userName', formData.userName);
        data.append('placeId', formData.placeId);
        data.append('mapUrl', formData.mapUrl);
        data.append('password', formData.password);
        data.append('shopName', formData.shopName);
        data.append('shopUrl', formData.shopUrl);
        if (formData.shopLogo) {
            data.append('shopLogo', formData.shopLogo);
        }

        try {
            const response = await fetch('https://studio.pucho.ai/api/v1/webhooks/wLWbdxZPfCQZSYpnCLDmu', {
                method: 'POST',
                body: data,
            });

            if (response.ok) {
                // Additional check: Try to parse JSON to see if it contains a logical error despite 200 OK
                const jsonCheck = await response.clone().json().catch(() => null);

                // If the webhook returns a specific failure field, handle it here. 
                // For now, following instructions: if response IS coming (success), move to QR code.

                setToast({ message: 'User created successfully!', type: 'success' });

                // Reset form
                setFormData({
                    userName: '',
                    placeId: '',
                    mapUrl: '',
                    password: '',
                    shopName: '',
                    shopUrl: '',
                    shopLogo: null
                });
                setPreviewUrl(null);

                // Extract QR Code from response
                // We check multiple common field names since we don't have the exact schema
                const responseData = jsonCheck || {};
                const webhookQrCode = responseData.qrCodeUrl || responseData.qr_code_url || responseData.qrCode || responseData.url || responseData.image;

                // Delay redirect to allow user to see the toast
                setTimeout(() => {
                    navigate('/admin/qrcode', {
                        state: {
                            userName: formData.userName,
                            qrCodeUrl: webhookQrCode
                        }
                    });
                }, 1500);

            } else {
                // "if webhook response is not coming" -> checking !ok as failure/duplicate
                setError('This Place Id Is Alredy Ragistered...!');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-subtle">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* User Name */}
                        <Input
                            label="User Name"
                            name="userName"
                            type="text"
                            icon={User}
                            placeholder="Enter shop user name"
                            value={formData.userName}
                            onChange={handleChange}
                            required
                        />
                        {/* Password */}
                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            icon={Lock}
                            placeholder="Set a secure password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        {/* Shop Name */}
                        <Input
                            label="Shop Name"
                            name="shopName"
                            type="text"
                            icon={Store}
                            placeholder="Enter shop name"
                            value={formData.shopName}
                            onChange={handleChange}
                            required
                        />
                        {/* Shop URL */}
                        <Input
                            label="Shop URL"
                            name="shopUrl"
                            type="url"
                            icon={Link}
                            placeholder="https://myshop.com"
                            value={formData.shopUrl}
                            onChange={handleChange}
                        />
                        {/* Map URL */}
                        <Input
                            label="Map URL"
                            name="mapUrl"
                            type="text"
                            icon={Map}
                            placeholder="https://maps.google.com/..."
                            value={formData.mapUrl}
                            onChange={handleChange}
                            required
                        />

                        {/* Place Id */}
                        <Input
                            label="Place Id"
                            name="placeId"
                            type="text"
                            icon={MapPin}
                            placeholder="Enter Google Place ID"
                            value={formData.placeId}
                            onChange={handleChange}
                            required
                        />








                        {/* Shop Logo Upload */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 block">
                                Shop Logo
                            </label>
                            <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-pucho-purple transition-colors bg-gray-50/50">
                                <input
                                    type="file"
                                    name="shopLogo"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex flex-col items-center justify-center gap-2 text-gray-500 py-2">
                                    {previewUrl ? (
                                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                            <img src={previewUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-pucho-purple">
                                                <ImageIcon size={20} />
                                            </div>
                                            <p className="text-sm">Click or drag logo to upload</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm font-medium text-center bg-red-50 p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex items-center gap-2 px-6 py-3 bg-pucho-purple text-white font-medium rounded-xl hover:bg-pucho-hover transition-all shadow-md active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <Save size={18} />
                            {loading ? 'Creating...' : 'Create Vendor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserAdmin;
