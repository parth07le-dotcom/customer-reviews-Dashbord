import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle size={20} className="text-green-500" />,
        error: <AlertCircle size={20} className="text-red-500" />,
        info: <Info size={20} className="text-blue-500" />
    };

    const styles = {
        success: 'bg-white border-green-200 text-gray-800',
        error: 'bg-white border-red-200 text-gray-800',
        info: 'bg-white border-blue-200 text-gray-800'
    };

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-fade-in-down ${styles[type] || styles.info} max-w-sm w-full`}>
            <div className="shrink-0">
                {icons[type] || icons.info}
            </div>
            <div className="flex-1 text-sm font-medium">
                {message}
            </div>
            <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
