import { useState, useEffect } from 'react';
import { fileAPI, securityAPI } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiOutlineFolder,
  HiOutlineArrowDownTray,
  HiOutlineTrash,
  HiOutlineLockClosed,
  HiOutlineLink,
} from 'react-icons/hi2';

interface FileItem {
  id: number;
  filename: string;
  algorithm: string;
  file_size: number;
  upload_time: string;
  expiry_time: string | null;
  hash_value: string;
}

export default function VaultPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [decryptId, setDecryptId] = useState<number | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [shareModal, setShareModal] = useState<number | null>(null);
  const [sharePass, setSharePass] = useState('');
  const [shareHours, setShareHours] = useState('24');
  const [shareResult, setShareResult] = useState('');
  const [decrypting, setDecrypting] = useState(false);

  const load = () => {
    fileAPI.list().then((r) => setFiles(r.data.files)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDecrypt = async () => {
    if (!decryptId || !passphrase) return;
    setDecrypting(true);
    try {
      const res = await fileAPI.decrypt(decryptId, passphrase);
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const file = files.find((f) => f.id === decryptId);
      a.href = url;
      a.download = file?.filename || 'decrypted_file';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('File decrypted successfully');
      setDecryptId(null);
      setPassphrase('');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Decryption failed';
      toast.error(msg);
    } finally {
      setDecrypting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Securely delete this file? This cannot be undone.')) return;
    try {
      await fileAPI.delete(id);
      toast.success('File securely deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleShare = async () => {
    if (!shareModal) return;
    try {
      const hours = parseFloat(shareHours);
      if (hours <= 0) {
        toast.error('Expiry must be greater than 0 hours');
        return;
      }
      const res = await securityAPI.createShareLink({
        file_id: shareModal,
        expiry_hours: hours,
        passphrase: sharePass || undefined,
      });
      setShareResult(window.location.origin + res.data.link);
      toast.success('Share link created');
    } catch {
      toast.error('Failed to create share link');
    }
  };

  const algoColor: Record<string, string> = {
    'AES-GCM': 'text-vault-accent border-vault-accent/30 bg-vault-accent/10',
    'AES-CBC': 'text-cyber-400 border-cyber-400/30 bg-cyber-400/10',
    'ChaCha20': 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-vault-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Vault</h1>
          <p className="text-gray-400 mt-1">{files.length} encrypted file{files.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {files.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <HiOutlineFolder className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">Your vault is empty</p>
          <p className="text-gray-500 text-sm mt-1">Upload your first file to get started</p>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {files.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="glass-card p-5 hover:border-vault-accent/20 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-vault-accent/10 border border-vault-accent/20 flex items-center justify-center shrink-0">
                      <HiOutlineLockClosed className="w-5 h-5 text-vault-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{file.filename}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-lg border ${algoColor[file.algorithm] || 'text-gray-400'}`}>
                          {file.algorithm}
                        </span>
                        <span className="text-xs text-gray-500">{formatSize(file.file_size)}</span>
                        <span className="text-xs text-gray-500">{new Date(file.upload_time).toLocaleDateString()}</span>
                        {file.expiry_time && (
                          <span className="text-xs text-vault-warning">Expires: {new Date(file.expiry_time).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setDecryptId(file.id)} className="p-2 rounded-lg hover:bg-vault-accent/10 text-vault-accent transition-colors" title="Decrypt & download">
                      <HiOutlineArrowDownTray className="w-5 h-5" />
                    </button>
                    <button onClick={() => { setShareModal(file.id); setShareResult(''); }} className="p-2 rounded-lg hover:bg-cyber-400/10 text-cyber-400 transition-colors" title="Share">
                      <HiOutlineLink className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(file.id)} className="p-2 rounded-lg hover:bg-vault-danger/10 text-vault-danger transition-colors" title="Secure delete">
                      <HiOutlineTrash className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Decrypt Modal */}
      <AnimatePresence>
        {decryptId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setDecryptId(null); setPassphrase(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-2">Decrypt File</h2>
              <p className="text-sm text-gray-400 mb-6">Enter the passphrase used during encryption</p>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="cyber-input mb-4"
                placeholder="Encryption passphrase"
              />
              <div className="flex gap-3">
                <button onClick={() => { setDecryptId(null); setPassphrase(''); }} className="cyber-btn flex-1">Cancel</button>
                <button onClick={handleDecrypt} disabled={!passphrase || decrypting} className="cyber-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  {decrypting ? (
                    <div className="w-5 h-5 border-2 border-vault-bg border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <HiOutlineArrowDownTray className="w-5 h-5" />
                      Decrypt
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {shareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setShareModal(null); setShareResult(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">Share File</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Expiry (hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={shareHours}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) > 0) setShareHours(val);
                    }}
                    className="cyber-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Passphrase (optional)</label>
                  <input type="password" value={sharePass} onChange={(e) => setSharePass(e.target.value)} className="cyber-input" placeholder="Protect with passphrase" />
                </div>
                {shareResult && (
                  <div className="p-3 bg-vault-accent/10 border border-vault-accent/20 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Share link:</p>
                    <p className="text-sm text-vault-accent break-all font-mono">{shareResult}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => { setShareModal(null); setShareResult(''); }} className="cyber-btn flex-1">Close</button>
                  <button onClick={handleShare} className="cyber-btn-primary flex-1">Generate Link</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
