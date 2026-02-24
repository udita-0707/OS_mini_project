import { useState, useCallback } from 'react';
import { fileAPI } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineCloudArrowUp,
  HiOutlineLockClosed,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineClock,
} from 'react-icons/hi2';

const algorithms = [
  { value: 'AES-GCM', label: 'AES-256-GCM', desc: 'Authenticated encryption (recommended)', color: 'vault-accent' },
  { value: 'AES-CBC', label: 'AES-256-CBC', desc: 'Classic block cipher mode', color: 'cyber-400' },
  { value: 'ChaCha20', label: 'ChaCha20-Poly1305', desc: 'Fast stream cipher', color: 'purple-400' },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [algorithm, setAlgorithm] = useState('AES-GCM');
  const [expiryHours, setExpiryHours] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleUpload = async () => {
    if (!file || !passphrase) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('passphrase', passphrase);
    formData.append('algorithm', algorithm);
    if (expiryHours) {
      if (parseFloat(expiryHours) <= 0) {
        toast.error('Expiry hours must be greater than 0');
        setUploading(false);
        return;
      }
      formData.append('expiry_hours', expiryHours);
    }

    // Simulate encryption progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 200);

    try {
      await fileAPI.upload(formData);
      clearInterval(interval);
      setProgress(100);
      setDone(true);
      toast.success('File encrypted and stored!');
      setTimeout(() => navigate('/vault'), 2000);
    } catch (error: any) {
      clearInterval(interval);
      setProgress(0);
      const msg = error.response?.data?.error || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Upload & Encrypt</h1>
        <p className="text-gray-400 mt-1">Files are encrypted before being stored. The server never sees your plaintext data.</p>
      </div>

      {done ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <HiOutlineCheckCircle className="w-20 h-20 mx-auto text-vault-accent mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Encrypted & Stored!</h2>
          <p className="text-gray-400">Redirecting to your vault...</p>
        </motion.div>
      ) : (
        <>
          {/* Drop zone */}
          <motion.div
            layout
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`glass-card p-8 border-2 border-dashed transition-all duration-300 cursor-pointer ${dragOver ? 'border-vault-accent bg-vault-accent/5' : 'border-vault-border hover:border-gray-600'
              }`}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.onchange = (e: any) => { if (e.target.files[0]) setFile(e.target.files[0]); };
              input.click();
            }}
          >
            {file ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-vault-accent/10 border border-vault-accent/20 flex items-center justify-center">
                  <HiOutlineDocumentText className="w-6 h-6 text-vault-accent" />
                </div>
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-sm text-gray-400">{formatSize(file.size)}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <HiOutlineCloudArrowUp className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                <p className="text-gray-300 font-medium">Drop file here or click to browse</p>
                <p className="text-sm text-gray-500 mt-1">Max 100 MB</p>
              </div>
            )}
          </motion.div>

          {/* Algorithm Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-3 tracking-wider uppercase">
              Encryption Algorithm
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {algorithms.map((algo) => (
                <motion.button
                  key={algo.value}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAlgorithm(algo.value)}
                  className={`p-4 rounded-xl border text-left transition-all duration-300 ${algorithm === algo.value
                    ? `border-${algo.color}/50 bg-${algo.color}/10`
                    : 'border-vault-border bg-vault-card/60 hover:border-gray-600'
                    }`}
                >
                  <p className={`text-sm font-semibold ${algorithm === algo.value ? `text-${algo.color}` : 'text-white'}`}>
                    {algo.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{algo.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Passphrase */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 tracking-wider uppercase">
              Encryption Passphrase
            </label>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="cyber-input pl-10"
                placeholder="Strong passphrase to encrypt your file"
              />
            </div>
          </div>

          {/* Expiry (Optional) */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 tracking-wider uppercase">
              Auto-Expire After (hours, optional)
            </label>
            <div className="relative">
              <HiOutlineClock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="number"
                min="1"
                value={expiryHours}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) > 0) setExpiryHours(val);
                }}
                className="cyber-input pl-10"
                placeholder="Leave empty for no expiry"
              />
            </div>
          </div>

          {/* Encrypt Progress */}
          <AnimatePresence>
            {uploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">Encrypting file...</span>
                  <span className="text-sm font-mono text-vault-accent">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-vault-bg rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-vault-accent to-cyber-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <motion.div
                    className="w-3 h-3 rounded-full bg-vault-accent"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-xs text-gray-500 font-mono">
                    PBKDF2 key derivation → {algorithm} encryption → SHA-256 integrity hash
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Button */}
          <motion.button
            onClick={handleUpload}
            disabled={!file || !passphrase || uploading}
            className="cyber-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.98 }}
          >
            <HiOutlineCloudArrowUp className="w-5 h-5" />
            Encrypt & Store
          </motion.button>
        </>
      )}
    </div>
  );
}
