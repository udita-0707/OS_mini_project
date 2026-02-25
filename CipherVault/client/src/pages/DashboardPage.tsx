/**
 * SecureVault — Premium SOC Command Center Dashboard
 * ─────────────────────────────────────────────────
 * Visual upgrades only. Backend / API logic unchanged.
 *
 * Motion system:
 *   micro  → 200 ms  (hover, tap)
 *   section→ 500 ms  (cards appear)
 *   major  → 900 ms  (page entrance, chart draw)
 *
 * New hooks:
 *   useCountUp    – animated numeric counter
 *   useMouseGlow  – radial glow follows cursor on card
 *   usePulse      – periodic boolean toggle for ambient ping
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fileAPI, securityAPI } from '../api';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  HiOutlineFolder,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineServerStack,
  HiOutlineSpeakerWave,
  HiOutlineSpeakerXMark,
} from 'react-icons/hi2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

/* ─── Types (unchanged) ─────────────────────────────────────────────────── */
interface Stats {
  storage: { total_files: number; total_size_mb: number };
  algorithm_distribution: Record<string, number>;
}
interface AuditLog {
  id: number; action: string; status: string;
  timestamp: string; ip_address: string;
}

/* ─── Motion tokens ─────────────────────────────────────────────────────── */
const ease = [0.16, 1, 0.3, 1] as const;          // premium spring-like cubic
const easeSoft = [0.4, 0, 0.2, 1] as const;

const pageVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1, ease: easeSoft } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 32, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

/* ─── Hook: animated counter ────────────────────────────────────────────── */
function useCountUp(target: number, duration = 900, enabled = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!enabled) { setVal(target); return; }
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);          // ease-out-quart
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);
  return val;
}

/* ─── Hook: mouse-tracking radial glow ─────────────────────────────────── */
function useMouseGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 20 });
  const sy = useSpring(y, { stiffness: 150, damping: 20 });
  const onMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  }, [x, y]);
  return { ref, sx, sy, onMove };
}

/* ─── Hook: periodic pulse ──────────────────────────────────────────────── */
function usePulse(interval = 3000) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setActive(true);
      setTimeout(() => setActive(false), 600);
    }, interval);
    return () => clearInterval(id);
  }, [interval]);
  return active;
}

/* ─── Sub: GlowCard ─────────────────────────────────────────────────────── */
interface GlowCardProps {
  label: string; rawValue: string | number;
  icon: React.ElementType; accentColor: string; isNumeric?: boolean;
  highlight?: boolean;
}
function GlowCard({ label, rawValue, icon: Icon, accentColor, isNumeric, highlight }: GlowCardProps) {
  const { ref, sx, sy, onMove } = useMouseGlow();
  const [hovered, setHovered] = useState(false);
  const numTarget = isNumeric ? (typeof rawValue === 'number' ? rawValue : parseFloat(rawValue as string) || 0) : 0;
  const counted = useCountUp(numTarget, 900, isNumeric);
  const displayValue = isNumeric ? counted : rawValue;

  return (
    <motion.div
      ref={ref}
      variants={cardVariants}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.2, ease } }}
      style={{ willChange: 'transform' }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#080d14] p-6 cursor-default group"
    >
      {/* Radial mouse glow */}
      {hovered && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100"
          style={{
            background: `radial-gradient(220px circle at ${sx.get()}px ${sy.get()}px, ${accentColor}22, transparent 70%)`,
          }}
        />
      )}

      {/* Animated ambient shimmer strip */}
      <motion.div
        className="pointer-events-none absolute left-0 top-0 h-px w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)` }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: 'linear' }}
      />

      {/* Border accent on hover */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl border"
        animate={{ borderColor: hovered ? `${accentColor}50` : 'transparent' }}
        transition={{ duration: 0.2 }}
      />

      {/* Top row */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <span className="text-[9px] font-black tracking-[0.25em] uppercase text-gray-500">{label}</span>
        <motion.div
          animate={{ scale: hovered ? 1.15 : 1, color: hovered ? accentColor : '#4b5563' }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="w-5 h-5" style={{ color: hovered ? accentColor : '#4b5563' }} />
        </motion.div>
      </div>

      {/* Value */}
      <div className="relative z-10">
        <motion.p
          className="text-4xl font-black tracking-tighter text-white tabular-nums"
          animate={{ color: highlight ? '#ff3366' : '#ffffff' }}
        >
          {displayValue}
        </motion.p>
      </div>

      {/* Bottom pulse bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] rounded-b-2xl"
        style={{ background: accentColor }}
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.35, ease }}
      />
    </motion.div>
  );
}

/* ─── Sub: AuditTimeline ────────────────────────────────────────────────── */
function AuditTimeline({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="relative px-6 py-2">
      {/* Vertical connector */}
      {logs.length > 1 && (
        <div className="absolute left-[2.35rem] top-4 bottom-4 w-px bg-gradient-to-b from-[#00ff88]/40 via-[#00f5ff]/20 to-transparent pointer-events-none" />
      )}
      <div className="space-y-0.5">
        {logs.map((log, i) => {
          const success = log.status === 'success';
          const isFirst = i === 0;
          const accent = success ? '#00ff88' : '#ff3366';
          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.45, ease }}
              className="flex items-center gap-4 px-2 py-3 rounded-xl group hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/[0.05] cursor-default"
            >
              {/* Timeline dot */}
              <div className="relative flex-shrink-0 w-5 flex items-center justify-center">
                {isFirst && (
                  <motion.div
                    className="absolute w-5 h-5 rounded-full"
                    style={{ background: `${accent}25` }}
                    animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                <div
                  className="w-2 h-2 rounded-full relative z-10 transition-all duration-200 group-hover:scale-150"
                  style={{
                    background: accent,
                    boxShadow: `0 0 ${isFirst ? 10 : 6}px ${accent}`,
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-200 uppercase tracking-wide group-hover:text-white transition-colors truncate">
                  {log.action.replace(/_/g, ' ')}
                </p>
                <p className="text-[9px] font-mono text-gray-600 group-hover:text-gray-400 transition-colors mt-0.5">
                  IP: {log.ip_address}
                </p>
              </div>

              {/* Timestamp */}
              <motion.span
                className="text-[10px] font-mono tabular-nums flex-shrink-0 text-gray-600"
                whileHover={{ color: accent }}
                transition={{ duration: 0.15 }}
                style={{ textShadow: 'none' }}
              >
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Sub: ScanlineOverlay ──────────────────────────────────────────────── */
function ScanlineOverlay() {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[1] select-none"
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      }}
    />
  );
}

/* ─── Sub: AmbientGrid ──────────────────────────────────────────────────── */
function AmbientGrid() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Soft vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#000_100%)]" />
      {/* Grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#00f5ff" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Animated sweep */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-64 opacity-10"
        style={{
          background: 'linear-gradient(180deg, #00f5ff18 0%, transparent 100%)',
        }}
        animate={{ y: ['-100%', '200vh'] }}
        transition={{ duration: 8, repeat: Infinity, repeatDelay: 12, ease: 'linear' }}
      />
    </div>
  );
}

/* ─── Chart.js animation configs ────────────────────────────────────────── */
const DOUGHNUT_ANIMATION = {
  animateRotate: true,
  animateScale: true,
  duration: 1200,
  easing: 'easeOutQuart' as const,
};
const BAR_ANIMATION = {
  duration: 900,
  easing: 'easeOutQuart' as const,
  delay(ctx: { dataIndex: number }) { return ctx.dataIndex * 60; },
};

const ALGO_COLORS = ['#00f5ff', '#a855f7', '#ff2d55', '#34d399'];

/* ─── Main Dashboard ─────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const pulse = usePulse(4000);

  // Audio state
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Pre-load audio
    audioRef.current = new Audio('/ambience.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4;

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isMusicPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        toast.error('Interaction required to play audio');
      });
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  useEffect(() => {
    fileAPI.stats().then((r) => setStats(r.data)).catch(() => { });
    securityAPI.getAuditLogs(10).then((r) => setLogs(r.data.logs)).catch(() => { });
  }, []);

  const algoLabels = stats ? Object.keys(stats.algorithm_distribution) : [];
  const algoValues = stats ? Object.values(stats.algorithm_distribution) : [];

  const doughnutData = {
    labels: algoLabels.length ? algoLabels : ['No files yet'],
    datasets: [{
      data: algoValues.length ? algoValues : [1],
      backgroundColor: algoValues.length ? ALGO_COLORS.slice(0, algoLabels.length) : ['#1e293b'],
      borderWidth: 0,
      hoverOffset: 14,
    }],
  };

  const barData = {
    labels: algoLabels.length ? algoLabels : ['No data'],
    datasets: [{
      label: 'Files',
      data: algoValues.length ? algoValues : [0],
      backgroundColor: ALGO_COLORS.slice(0, Math.max(algoLabels.length, 1)).map(c => `${c}cc`),
      borderRadius: 14,
      barThickness: 22,
      hoverBackgroundColor: ALGO_COLORS.slice(0, Math.max(algoLabels.length, 1)),
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: DOUGHNUT_ANIMATION,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#64748b', font: { size: 10, weight: 'bold' as const }, padding: 20, usePointStyle: true, pointStyleWidth: 8 },
      },
      tooltip: {
        backgroundColor: '#0a1120',
        borderColor: '#00f5ff30',
        borderWidth: 1,
        titleColor: '#00f5ff',
        bodyColor: '#94a3b8',
        padding: 12,
        cornerRadius: 10,
      },
    },
    cutout: '74%',
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: BAR_ANIMATION,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0a1120',
        borderColor: '#a855f730',
        borderWidth: 1,
        titleColor: '#a855f7',
        bodyColor: '#94a3b8',
        padding: 12,
        cornerRadius: 10,
      },
    },
    scales: {
      x: {
        ticks: { color: '#475569', font: { size: 10 } },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        ticks: { color: '#475569', font: { size: 10 }, stepSize: 1 },
        grid: { color: 'rgba(15, 23, 42, 0.8)', lineWidth: 1 },
        border: { display: false },
      },
    },
  };

  /* Stat card definitions (same data, enhanced props) */
  const infoCards: GlowCardProps[] = [
    {
      label: 'Total Files',
      rawValue: stats?.storage.total_files ?? 0,
      icon: HiOutlineFolder,
      accentColor: '#00f5ff',
      isNumeric: true,
    },
    {
      label: 'Storage Used',
      rawValue: stats ? `${stats.storage.total_size_mb} MB` : '0 MB',
      icon: HiOutlineServerStack,
      accentColor: '#a855f7',
      isNumeric: false,
    },
    {
      label: 'Last Session',
      rawValue: user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A',
      icon: HiOutlineClock,
      accentColor: '#f59e0b',
      isNumeric: false,
    },
    {
      label: 'Health Check',
      rawValue: user?.is_locked ? 'COMPROMISED' : 'STABLE',
      icon: user?.is_locked ? HiOutlineExclamationTriangle : HiOutlineShieldCheck,
      accentColor: user?.is_locked ? '#ff3366' : '#00ff88',
      isNumeric: false,
      highlight: !!user?.is_locked,
    },
  ];

  return (
    <>
      <ScanlineOverlay />
      <AmbientGrid />

      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 space-y-8 pb-16 px-1"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div variants={rowVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="relative">
            {/* Soft glow behind title */}
            <div className="absolute -inset-4 blur-3xl opacity-20 bg-[radial-gradient(ellipse,#00f5ff_0%,transparent_70%)] pointer-events-none" />

            <h1 className="relative text-[clamp(2rem,5vw,3.25rem)] font-black text-white tracking-[-0.03em] leading-none">
              SYSTEM{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-[#00f5ff] via-[#a855f7] to-[#00ff88] bg-clip-text text-transparent">
                  OVERVIEW
                </span>
                {/* Animated underline sweep */}
                <motion.span
                  className="absolute bottom-[-4px] left-0 h-[2px] rounded-full bg-gradient-to-r from-[#00f5ff] to-[#a855f7]"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.7, ease }}
                />
              </span>
            </h1>

            <div className="mt-3 flex items-center gap-2">
              {/* Username shimmer */}
              <motion.span
                className="font-mono text-[11px] tracking-widest text-gray-500"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                SECURE_NODE: <span className="text-[#00f5ff]">{user?.username?.toUpperCase()}</span> // STATUS: ACTIVE
              </motion.span>
            </div>
          </div>

          {/* Actions and connection status */}
          <div className="flex items-center gap-3">
            {/* Music Toggle */}
            <motion.button
              onClick={toggleMusic}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 backdrop-blur-sm ${isMusicPlaying ? 'bg-vault-accent/10 border-vault-accent/40 text-vault-accent' : 'bg-white/5 border-white/10 text-gray-500'}`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isMusicPlaying ? 'on' : 'off'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  {isMusicPlaying ? <HiOutlineSpeakerWave className="w-4 h-4" /> : <HiOutlineSpeakerXMark className="w-4 h-4" />}
                </motion.div>
              </AnimatePresence>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ambience</span>
              {isMusicPlaying && (
                <div className="flex gap-0.5 items-end h-2 ml-1">
                  {[0.4, 0.7, 0.5].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-[2px] bg-vault-accent rounded-full"
                      animate={{ height: ['20%', '100%', '20%'] }}
                      transition={{ duration: 0.6 + i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
              )}
            </motion.button>

            {/* Live connection pill */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#00f5ff]/5 border border-[#00f5ff]/20 backdrop-blur-sm">
              <motion.div
                className="w-2 h-2 rounded-full bg-[#00f5ff]"
                animate={{ scale: pulse ? [1, 1.6, 1] : 1, opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.6 }}
                style={{ boxShadow: '0 0 8px #00f5ff' }}
              />
              <span className="text-[10px] font-black text-[#00f5ff] uppercase tracking-[0.2em]">Live Connection</span>
            </div>
          </div>
        </motion.div>

        {/* ── Info Cards ─────────────────────────────────────────────────── */}
        <motion.div variants={rowVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {infoCards.map((card, i) => (
            <GlowCard key={i} {...card} />
          ))}
        </motion.div>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        <motion.div variants={rowVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Doughnut */}
          <div className="relative rounded-2xl border border-white/[0.06] bg-[#080d14] p-6 overflow-hidden group">
            {/* Left accent bar */}
            <motion.div
              className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full"
              style={{ background: 'linear-gradient(180deg, #00f5ff, #00ff88)' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.4, duration: 0.6, ease }}
            />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Algorithm Matrix</h2>
              <span className="text-[9px] text-gray-600 font-mono">DISTRIBUTION_v1.0</span>
            </div>
            <div className="h-64 relative flex items-center justify-center">
              {/* Subtle rotating bg ring */}
              <motion.div
                className="absolute w-52 h-52 rounded-full border border-[#00f5ff]/5 pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute w-44 h-44 rounded-full border border-[#a855f7]/5 pointer-events-none"
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              />
              <Doughnut data={doughnutData} options={doughnutOptions} />
              {/* Animated center counter */}
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5, ease }}
              >
                <span className="text-2xl font-black text-white tabular-nums">
                  {stats?.storage.total_files || 0}
                </span>
                <span className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em] mt-0.5">Objects</span>
              </motion.div>
            </div>
          </div>

          {/* Bar */}
          <div className="relative rounded-2xl border border-white/[0.06] bg-[#080d14] p-6 overflow-hidden">
            <motion.div
              className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full"
              style={{ background: 'linear-gradient(180deg, #a855f7, #00f5ff)' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.5, duration: 0.6, ease }}
            />
            {/* Horizontal scanline sweep */}
            <motion.div
              className="pointer-events-none absolute left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#a855f7]/30 to-transparent"
              animate={{ y: [0, 240, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
            />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Encryption Load</h2>
              <span className="text-[9px] text-gray-600 font-mono">METRICS_SYS</span>
            </div>
            <div className="h-64">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </motion.div>

        {/* ── Audit Timeline ─────────────────────────────────────────────── */}
        <motion.div variants={rowVariants} className="rounded-2xl border border-white/[0.06] bg-[#080d14] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between relative overflow-hidden">
            {/* Live feed shimmer */}
            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#00f5ff]/[0.04] to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'linear' }}
            />
            <h2 className="relative text-[11px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2.5">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <HiOutlineServerStack className="w-4 h-4 text-[#00f5ff]" />
              </motion.div>
              Security Audit Trail
            </h2>
            <button className="relative text-[9px] font-black text-[#00f5ff] hover:text-white uppercase tracking-[0.2em] transition-colors">
              ↻ Refresh
            </button>
          </div>

          {/* Log body */}
          <div className="py-2">
            <AnimatePresence>
              {logs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="py-14 text-center"
                >
                  <p className="text-gray-700 text-[11px] font-mono italic">NO_RECORDS_FOUND_IN_LOCAL_STORE</p>
                </motion.div>
              ) : (
                <AuditTimeline logs={logs} />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}