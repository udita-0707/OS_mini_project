import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineCpuChip,
  HiOutlineLockClosed,
  HiOutlineKey,
  HiOutlineShieldCheck,
  HiOutlineServerStack,
  HiOutlineArrowPath,
} from 'react-icons/hi2';

const concepts = [
  {
    id: 'userkernel',
    title: 'User Mode vs Kernel Mode',
    icon: HiOutlineCpuChip,
    color: 'vault-accent',
    description: 'The OS separates user-mode (applications) from kernel-mode (core OS). Encryption operations run in user mode, but disk I/O requires kernel-mode system calls.',
    steps: [
      { label: 'User Application', sub: 'SecureVault requests file encryption', position: 'top' },
      { label: 'System Call Interface', sub: 'Transition from user → kernel space', position: 'mid' },
      { label: 'Kernel Mode', sub: 'Direct hardware access for disk writes', position: 'bottom' },
    ],
  },
  {
    id: 'encryption',
    title: 'Encryption Pipeline',
    icon: HiOutlineLockClosed,
    color: 'cyber-400',
    description: 'The full encryption workflow: plaintext → key derivation → algorithm selection → ciphertext + integrity hash.',
    steps: [
      { label: 'Plaintext Input', sub: 'Original file bytes', position: 'top' },
      { label: 'PBKDF2 Key Derivation', sub: 'Password + Salt → 256-bit key (600K iterations)', position: 'mid1' },
      { label: 'AES-GCM / AES-CBC / ChaCha20', sub: 'Encrypt with derived key + random nonce', position: 'mid2' },
      { label: 'Ciphertext + SHA-256 Hash', sub: 'Encrypted data + integrity verification hash', position: 'bottom' },
    ],
  },
  {
    id: 'accesscontrol',
    title: 'Access Control',
    icon: HiOutlineShieldCheck,
    color: 'purple-400',
    description: 'JWT-based authentication ensures only authorized users access their files. Each request is validated against the user\'s identity.',
    steps: [
      { label: 'Authentication', sub: 'Username + Password → JWT Token', position: 'top' },
      { label: 'Authorization Check', sub: 'Verify JWT + check file ownership', position: 'mid' },
      { label: 'Access Granted / Denied', sub: 'Return encrypted file or 403 Forbidden', position: 'bottom' },
    ],
  },
  {
    id: 'keygen',
    title: 'Key Generation & PBKDF2',
    icon: HiOutlineKey,
    color: 'vault-warning',
    description: 'PBKDF2 transforms a weak passphrase into a strong cryptographic key. 600,000 iterations make brute-force attacks infeasible.',
    steps: [
      { label: 'User Passphrase', sub: '"my_secret_pass"', position: 'top' },
      { label: 'Random Salt (32 bytes)', sub: 'Prevents rainbow table attacks', position: 'mid1' },
      { label: 'PBKDF2-HMAC-SHA256', sub: '600,000 iterations of hashing', position: 'mid2' },
      { label: '256-bit Key', sub: 'Cryptographically strong encryption key', position: 'bottom' },
    ],
  },
  {
    id: 'securestorage',
    title: 'Secure Storage & Deletion',
    icon: HiOutlineServerStack,
    color: 'vault-danger',
    description: 'Files are stored encrypted on disk. Secure deletion overwrites data with random bytes 3 times before removing, preventing forensic recovery.',
    steps: [
      { label: 'Encrypted File on Disk', sub: 'Ciphertext stored in /encrypted_storage', position: 'top' },
      { label: 'Pass 1: Random Overwrite', sub: 'Overwrite all bytes with random data', position: 'mid1' },
      { label: 'Pass 2: Complement Pattern', sub: 'Flip all bits from Pass 1', position: 'mid2' },
      { label: 'Pass 3: Random + fsync + unlink', sub: 'Final random write, flush to disk, delete', position: 'bottom' },
    ],
  },
];

export default function OSVisualizerPage() {
  const [active, setActive] = useState(concepts[0].id);
  const current = concepts.find((c) => c.id === active)!;

  const colorMap: Record<string, string> = {
    'vault-accent': '#00ff88',
    'cyber-400': '#1ac5ff',
    'purple-400': '#a78bfa',
    'vault-warning': '#ffaa00',
    'vault-danger': '#ff3366',
  };

  const bgColorMap: Record<string, string> = {
    'vault-accent': 'bg-vault-accent/10 border-vault-accent/20',
    'cyber-400': 'bg-cyber-400/10 border-cyber-400/20',
    'purple-400': 'bg-purple-400/10 border-purple-400/20',
    'vault-warning': 'bg-vault-warning/10 border-vault-warning/20',
    'vault-danger': 'bg-vault-danger/10 border-vault-danger/20',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">OS Security Concepts</h1>
        <p className="text-gray-400 mt-1">Interactive visualizations of operating system data security principles</p>
      </div>

      {/* Concept Selector */}
      <div className="flex flex-wrap gap-2">
        {concepts.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              active === c.id
                ? `${bgColorMap[c.color]} border`
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <c.icon className="w-4 h-4" />
            {c.title}
          </button>
        ))}
      </div>

      {/* Visualization */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl ${bgColorMap[current.color]} border flex items-center justify-center`}>
              <current.icon className="w-5 h-5" style={{ color: colorMap[current.color] }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{current.title}</h2>
              <p className="text-sm text-gray-400">{current.description}</p>
            </div>
          </div>

          {/* Pipeline visualization */}
          <div className="mt-8 space-y-3">
            {current.steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
              >
                <div className="flex items-center gap-4">
                  {/* Step number */}
                  <motion.div
                    className="w-10 h-10 shrink-0 rounded-xl border font-bold text-sm flex items-center justify-center"
                    style={{ borderColor: colorMap[current.color] + '40', color: colorMap[current.color], background: colorMap[current.color] + '15' }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ delay: i * 0.15 + 0.3, duration: 0.5 }}
                  >
                    {i + 1}
                  </motion.div>

                  {/* Step content */}
                  <div className="flex-1 p-4 rounded-xl bg-vault-bg/60 border border-vault-border">
                    <p className="text-white font-medium text-sm">{step.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{step.sub}</p>
                  </div>
                </div>

                {/* Arrow connector */}
                {i < current.steps.length - 1 && (
                  <motion.div
                    className="flex items-center justify-center py-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.15 + 0.2 }}
                  >
                    <motion.div
                      animate={{ y: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <HiOutlineArrowPath className="w-5 h-5 rotate-90" style={{ color: colorMap[current.color] + '60' }} />
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Data flow animation */}
          <motion.div
            className="mt-6 h-1 rounded-full overflow-hidden bg-vault-border"
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, transparent, ${colorMap[current.color]}, transparent)` }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Educational note */}
      <div className="glass-card p-6 border-l-4" style={{ borderLeftColor: colorMap[current.color] }}>
        <p className="text-sm text-gray-300">
          <span className="font-semibold text-white">OS Security Principle:</span>{' '}
          {current.id === 'userkernel' && 'The dual-mode architecture prevents user applications from directly accessing hardware, enforcing security boundaries at the CPU level.'}
          {current.id === 'encryption' && 'Confidentiality is achieved by transforming readable data into ciphertext. Without the correct key, the data is computationally indistinguishable from random noise.'}
          {current.id === 'accesscontrol' && 'Access control lists (ACLs) and capability-based security ensure that each user can only access resources they are authorized to use.'}
          {current.id === 'keygen' && 'Key stretching functions like PBKDF2 increase the computational cost of trying each possible password, making brute-force attacks impractical.'}
          {current.id === 'securestorage' && 'Normal file deletion only removes the directory entry. The data persists on disk until overwritten. Secure deletion overwrites the actual disk sectors to prevent forensic recovery.'}
        </p>
      </div>
    </div>
  );
}
