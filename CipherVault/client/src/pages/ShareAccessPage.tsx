import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { securityAPI } from '../api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    HiOutlineShieldCheck,
    HiOutlineLockClosed,
    HiOutlineArrowDownTray,
} from 'react-icons/hi2';

export default function ShareAccessPage() {
    const { token } = useParams<{ token: string }>();
    const [encPass, setEncPass] = useState('');
    const [sharePass, setSharePass] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !encPass) {
            toast.error('Passphrase is required');
            return;
        }

        setLoading(true);
        try {
            const res = await securityAPI.accessSharedFile({
                token,
                encryption_passphrase: encPass,
                share_passphrase: sharePass || undefined,
            });

            // Get filename from response headers if possible, or fallback
            const contentDisposition = res.headers['content-disposition'];
            let filename = 'shared_file';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }

            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Download started');
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Access denied. Check your passphrases.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-vault-bg grid-bg flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-vault-accent to-cyber-500 flex items-center justify-center">
                        <HiOutlineShieldCheck className="w-7 h-7 text-vault-bg" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-vault-accent to-cyber-400 bg-clip-text text-transparent">
                        SecureVault OS
                    </h1>
                </div>

                <div className="glass-card p-8 group">
                    <div className="flex items-center gap-3 mb-6">
                        <HiOutlineLockClosed className="w-6 h-6 text-vault-accent" />
                        <h2 className="text-xl font-semibold text-white">Access Shared File</h2>
                    </div>

                    <p className="text-gray-400 text-sm mb-6">
                        This file is encrypted. Enter the required passphrases to decrypt and download it.
                    </p>

                    <form onSubmit={handleAccess} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                                Encryption Passphrase
                            </label>
                            <input
                                type="password"
                                required
                                value={encPass}
                                onChange={(e) => setEncPass(e.target.value)}
                                className="cyber-input"
                                placeholder="The secret used to encrypt the file"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                                Share Passphrase (if any)
                            </label>
                            <input
                                type="password"
                                value={sharePass}
                                onChange={(e) => setSharePass(e.target.value)}
                                className="cyber-input"
                                placeholder="Optional passphrase for this link"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="cyber-btn-primary w-full flex items-center justify-center gap-2 mt-6 h-12"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-vault-bg border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <HiOutlineArrowDownTray className="w-5 h-5" />
                                    Decrypt & Download
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-gray-600 text-[10px] mt-8 uppercase tracking-[0.2em]">
                    Zero Knowledge End-to-End Encryption
                </p>
            </motion.div>
        </div>
    );
}
