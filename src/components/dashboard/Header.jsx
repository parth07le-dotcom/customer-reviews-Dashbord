import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BellIcon from '../../assets/icons/bell.png';

const Header = () => {
    const location = useLocation();
    const { user } = useAuth();

    const getPageTitle = (path) => {
        if (path.includes('/admin/user-admin')) {
            return {
                title: 'User Admin',
                subtitle: 'Create new shop users and manage access'
            };
        }
        if (path.includes('/admin/qrcode')) {
            return {
                title: 'Scan QR Code',
                subtitle: 'View and scan vendor QR code'
            };
        }
        return {
            title: 'Overview',
            subtitle: 'Welcome back'
        };
    };

    const { title, subtitle } = getPageTitle(location.pathname);

    // Update Browser Tab Title with Shop Name
    React.useEffect(() => {
        if (user?.shop_name) {
            document.title = `${user.shop_name} - Dashboard`;
        } else if (user?.full_name) {
            document.title = `${user.full_name} - Dashboard`;
        } else {
            document.title = 'Pucho Dashboard';
        }
    }, [user]);

    return (
        <header className="sticky top-0 z-20 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between pl-5 py-4 pr-8">
            {/* Title & Search (Left) */}
            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">{title}</h1>
                    <p className="text-xs text-gray-500">{subtitle}</p>
                </div>

                {/* Search Bar Removed */}

            </div>

            {/* Actions (Right) */}
            <div className="flex items-center gap-4">
                {user && (
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-gray-900 leading-none">
                                {user.role === 'admin' ? 'Admin User' : (user.shop_name || user.full_name)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {user.role === 'admin' ? 'admin@pucho.ai' : 'Shop Owner'}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                            {user.role === 'admin' ? (
                                <img
                                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                                    alt="Admin User"
                                    className="h-full w-full object-cover"
                                />
                            ) : user.shop_logo ? (
                                <img src={user.shop_logo} alt="Shop Logo" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-lg font-bold text-gray-400">
                                    {(user.shop_name || user.full_name || 'U').charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header >
    );
};

export default Header;
