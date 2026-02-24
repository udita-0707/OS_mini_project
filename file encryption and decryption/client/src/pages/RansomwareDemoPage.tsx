import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineBugAnt,
  HiOutlineLockClosed,
  HiOutlineKey,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineDocumentText,
} from 'react-icons/hi2';

interface SimFile {
  name: string;
  content: string;
  encrypted: boolean;
  encryptedContent?: string;
}

const initialFiles: SimFile[] = [
  { name: 'report.docx', content: 'Quarterly financial report with revenue data...', encrypted: false },
  { name: 'photo.jpg', content: 'Family vacation photo, 4.2MB JPEG image data...', encrypted: false },
  { name: 'database.sql', content: 'CREATE TABLE users (id INT, name VARCHAR(100))...', encrypted: false },
  { name: 'passwords.txt', content: 'admin: p@ssw0rd123 (DO NOT SHARE)...', encrypted: false },
  { name: 'project.zip', content: 'Source code archive, 12.8MB compressed data...', encrypted: false },
];

export default function RansomwareDemoPage() {
  const [phase, setPhase] = useState<'ready' | 'attacking' | 'locked' | 'recovering' | 'recovered'>('ready');
  const [files, setFiles] = useState<SimFile[]>(initialFiles);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [correctKey] = useState('SECUREVAULT-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [currentEncrypting, setCurrentEncrypting] = useState(-1);
  const [error, setError] = useState('');

  const simulateAttack = async () => {
    setPhase('attacking');
    setError('');

    for (let i = 0; i < files.length; i++) {
      setCurrentEncrypting(i);
      await new Promise((r) => setTimeout(r, 800));

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i
            ? {
                ...f,
                encrypted: true,
                encryptedContent: btoa(f.content).split('').reverse().join('').substring(0, 40) + '...',
              }
            : f
        )
      );
    }
    setCurrentEncrypting(-1);
    setPhase('locked');
  };

  const attemptRecovery = () => {
    if (recoveryKey === correctKey) {
      setPhase('recovering');
      setTimeout(() => {
        setFiles(initialFiles);
        setPhase('recovered');
      }, 2000);
    } else {
      setError('INVALID KEY — Access remains locked');
    }
  };

  const reset = () => {
    setPhase('ready');
    setFiles(initialFiles);
    setRecoveryKey('');
    setError('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <HiOutlineBugAnt className="w-8 h-8 text-vault-danger" />
          Ransomware Simulator
        </h1>
        <p className="text-gray-400 mt-1">Educational demonstration of how ransomware encrypts files and how proper key management enables recovery</p>
      </div>

      {/* Warning */}
      <div className="glass-card p-4 border-l-4 border-vault-warning">
        <div className="flex items-center gap-2">
          <HiOutlineExclamationTriangle className="w-5 h-5 text-vault-warning shrink-0" />
          <p className="text-sm text-gray-300">
            <strong className="text-vault-warning">Educational Purpose Only.</strong>{' '}
            This is a simulation. No real files are affected. This demonstrates why encryption key management is critical.
          </p>
        </div>
      </div>

      {/* File List */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sample Files</h2>
        <div className="space-y-2">
          {files.map((file, i) => (
            <motion.div
              key={file.name}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${
                file.encrypted
                  ? 'bg-vault-danger/5 border-vault-danger/20'
                  : 'bg-vault-bg/50 border-vault-border'
              } ${currentEncrypting === i ? 'ring-2 ring-vault-danger/50' : ''}`}
              animate={currentEncrypting === i ? { x: [0, -3, 3, -3, 0] } : {}}
              transition={{ duration: 0.3 }}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                file.encrypted ? 'bg-vault-danger/10' : 'bg-vault-accent/10'
              }`}>
                {file.encrypted ? (
                  <HiOutlineLockClosed className="w-5 h-5 text-vault-danger" />
                ) : (
                  <HiOutlineDocumentText className="w-5 h-5 text-vault-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${file.encrypted ? 'text-vault-danger' : 'text-white'}`}>
                  {file.encrypted ? file.name + '.locked' : file.name}
                </p>
                <p className="text-xs text-gray-500 truncate font-mono mt-0.5">
                  {file.encrypted ? file.encryptedContent : file.content}
                </p>
              </div>
              <div>
                {file.encrypted ? (
                  <span className="text-xs text-vault-danger px-2 py-1 bg-vault-danger/10 rounded-lg border border-vault-danger/20">ENCRYPTED</span>
                ) : currentEncrypting === i ? (
                  <motion.span
                    className="text-xs text-vault-warning"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    ENCRYPTING...
                  </motion.span>
                ) : (
                  <span className="text-xs text-vault-accent px-2 py-1 bg-vault-accent/10 rounded-lg border border-vault-accent/20">SAFE</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Locked screen */}
      <AnimatePresence>
        {phase === 'locked' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card p-8 border-2 border-vault-danger/30 bg-vault-danger/5"
          >
            <div className="text-center mb-6">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <HiOutlineLockClosed className="w-16 h-16 mx-auto text-vault-danger mb-3" />
              </motion.div>
              <h2 className="text-2xl font-bold text-vault-danger">FILES LOCKED</h2>
              <p className="text-gray-400 mt-2 text-sm">
                Your files have been encrypted. Enter the recovery key to restore them.
              </p>
              <div className="mt-3 p-3 bg-vault-bg/80 rounded-xl border border-vault-border">
                <p className="text-xs text-gray-500 mb-1">Recovery key (for educational purposes):</p>
                <p className="text-sm font-mono text-vault-accent">{correctKey}</p>
              </div>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div className="relative">
                <HiOutlineKey className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={recoveryKey}
                  onChange={(e) => { setRecoveryKey(e.target.value); setError(''); }}
                  className="cyber-input pl-10"
                  placeholder="Enter recovery key"
                />
              </div>
              {error && <p className="text-sm text-vault-danger text-center">{error}</p>}
              <button onClick={attemptRecovery} className="cyber-btn-primary w-full">Attempt Recovery</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recovering animation */}
      <AnimatePresence>
        {phase === 'recovering' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card p-8 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <HiOutlineKey className="w-12 h-12 mx-auto text-vault-accent mb-4" />
            </motion.div>
            <h2 className="text-xl font-bold text-white">Decrypting Files...</h2>
            <div className="mt-4 h-2 bg-vault-border rounded-full overflow-hidden max-w-xs mx-auto">
              <motion.div
                className="h-full bg-gradient-to-r from-vault-accent to-cyber-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recovered */}
      <AnimatePresence>
        {phase === 'recovered' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card p-8 text-center border-2 border-vault-accent/30"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <HiOutlineCheckCircle className="w-16 h-16 mx-auto text-vault-accent mb-3" />
            </motion.div>
            <h2 className="text-2xl font-bold text-vault-accent">Files Recovered!</h2>
            <p className="text-gray-400 mt-2 text-sm">
              All files have been successfully decrypted. This demonstrates why secure key management is essential.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-4">
        {phase === 'ready' && (
          <motion.button
            onClick={simulateAttack}
            className="cyber-btn-danger flex items-center gap-2"
            whileTap={{ scale: 0.95 }}
          >
            <HiOutlineBugAnt className="w-5 h-5" />
            Simulate Ransomware Attack
          </motion.button>
        )}
        {(phase === 'locked' || phase === 'recovered') && (
          <button onClick={reset} className="cyber-btn">Reset Simulation</button>
        )}
      </div>

      {/* Educational info */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-3">How Ransomware Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-vault-bg/60 border border-vault-border">
            <p className="font-semibold text-vault-danger mb-1">1. Infection</p>
            <p className="text-gray-400">Ransomware enters through phishing emails, vulnerabilities, or malicious downloads.</p>
          </div>
          <div className="p-4 rounded-xl bg-vault-bg/60 border border-vault-border">
            <p className="font-semibold text-vault-warning mb-1">2. Encryption</p>
            <p className="text-gray-400">It encrypts user files using strong algorithms (often AES-256), making them inaccessible.</p>
          </div>
          <div className="p-4 rounded-xl bg-vault-bg/60 border border-vault-border">
            <p className="font-semibold text-vault-accent mb-1">3. Prevention</p>
            <p className="text-gray-400">Regular backups, OS updates, and security software are the best defenses against ransomware.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
