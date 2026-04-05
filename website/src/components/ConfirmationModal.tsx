import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmationModal({
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel
}: ConfirmationModalProps) {
    const variantStyles = {
        danger: {
            icon: 'text-red-400',
            iconBg: 'bg-red-500/10 border-red-500/20',
            button: 'bg-red-500 hover:bg-red-400 shadow-red-500/20'
        },
        warning: {
            icon: 'text-amber-400',
            iconBg: 'bg-amber-500/10 border-amber-500/20',
            button: 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20'
        },
        default: {
            icon: 'text-accent-400',
            iconBg: 'bg-accent-500/10 border-accent-500/20',
            button: 'bg-accent-500 hover:bg-accent-400 shadow-accent-500/20'
        }
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative p-6 pb-4">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50" />
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${styles.iconBg} border`}>
                            <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
                        </div>
                        <div className="flex-1 pt-1">
                            <h2 className="text-lg font-bold text-white">{title}</h2>
                            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{message}</p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-2 -mr-2 -mt-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 border-t border-zinc-800/50 flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2.5 text-sm font-bold text-white rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${styles.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
