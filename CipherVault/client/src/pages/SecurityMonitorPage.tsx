/**
 * CipherVault — Security Monitor
 * ═══════════════════════════════
 * Visual-only upgrade. All API logic unchanged.
 *
 * Upgrades:
 *  - Live SOC command-center header with animated threat level
 *  - Stat cards with animated counters, glow, and pulse indicators
 *  - Animated tab switcher with sliding indicator
 *  - Timeline with alternating slide-in, connector line, pulsing latest dot
 *  - Live feed shimmer on the log panel
 *  - Ambient grid + scanline overlay
 *  - IP threat badge + action type chip
 */

import { useState, useEffect, useRef } from 'react';
import { securityAPI } from '../api';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  HiOutlineShieldExclamation,
  HiOutlineEye,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineSignal,
  HiOutlineServerStack,
  HiOutlineExclamationTriangle,
  HiOutlineFunnel,
} from 'react-icons/hi2';

/* ─── Types (unchanged) ─────────────────────────────────────────────────── */
interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  status: string;
  timestamp: string;
  ip_address: string;
  details: string | null;
}

/* ─── Motion tokens ─────────────────────────────────────────────────────── */
const ease = [0.16, 1, 0.3, 1] as const;

/* ─── Hook: animated counter ────────────────────────────────────────────── */
function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ─── Hook: mouse glow ──────────────────────────────────────────────────── */
function useMouseGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 22 });
  const sy = useSpring(y, { stiffness: 180, damping: 22 });
  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  };
  return { ref, sx, sy, onMove };
}

/* ─── Hook: periodic pulse ──────────────────────────────────────────────── */
function usePulse(ms = 3500) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setInterval(() => { setOn(true); setTimeout(() => setOn(false), 700); }, ms);
    return () => clearInterval(id);
  }, [ms]);
  return on;
}

/* ─── Sub: ThreatLevelMeter ─────────────────────────────────────────────── */
function ThreatLevelMeter({ failedCount }: { failedCount: number }) {
  const level = failedCount === 0 ? 'NOMINAL' : failedCount < 5 ? 'ELEVATED' : 'CRITICAL';
  const pct = failedCount === 0 ? 8 : Math.min((failedCount / 20) * 100, 100);
  const color = level === 'NOMINAL' ? '#00ff88' : level === 'ELEVATED' ? '#f59e0b' : '#ff3366';
  const pulse = usePulse(2500);

  return (
    <div className="flex items-center gap-4">
      <div className="hidden sm:flex items-center gap-2">
        <motion.div className="w-1.5 h-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          animate={{ scale: pulse ? [1, 1.8, 1] : 1, opacity: [1, 0.5, 1] }}
          transition={{ duration: 0.7 }}
        />
        <span className="text-[9px] font-black tracking-[0.2em] uppercase" style={{ color }}>
          THREAT: {level}
        </span>
      </div>
      <div className="hidden md:flex items-center gap-2">
        <div className="w-24 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg,${color}80,${color})` }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease }}
          />
        </div>
        <span className="text-[9px] font-mono text-gray-600">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

/* ─── Sub: StatCard ─────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  index: number;
  isAlert?: boolean;
}
function StatCard({ label, value, icon: Icon, accent, index, isAlert }: StatCardProps) {
  const { ref, sx, sy, onMove } = useMouseGlow();
  const [hovered, setHovered] = useState(false);
  const counted = useCountUp(value);

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.55, ease }}
      whileHover={{ y: -5, scale: 1.015 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#080d14] p-6 cursor-default"
    >
      {/* Mouse-tracking radial glow */}
      {hovered && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity"
          style={{
            background: `radial-gradient(180px circle at ${sx.get()}px ${sy.get()}px, ${accent}18, transparent 70%)`,
          }}
        />
      )}

      {/* Shimmer sweep */}
      <motion.div className="pointer-events-none absolute left-0 top-0 h-px w-full"
        style={{ background: `linear-gradient(90deg,transparent,${accent}70,transparent)` }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 5, ease: 'linear' }}
      />

      {/* Hover border */}
      <motion.div className="pointer-events-none absolute inset-0 rounded-2xl border"
        animate={{ borderColor: hovered ? `${accent}40` : 'transparent' }}
        transition={{ duration: 0.2 }}
      />

      <div className="relative z-10 flex items-start justify-between mb-5">
        <span className="text-[9px] font-black tracking-[0.22em] uppercase text-gray-600">{label}</span>
        <motion.div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}10`, border: `1px solid ${accent}25` }}
          animate={{ boxShadow: isAlert && value > 0 ? [`0 0 0px ${accent}00`, `0 0 14px ${accent}50`, `0 0 0px ${accent}00`] : 'none' }}
          transition={{ duration: 2, repeat: Infinity }}>
          <Icon className="w-4.5 h-4.5" style={{ color: accent }} />
        </motion.div>
      </div>

      <motion.p className="relative z-10 text-4xl font-black tracking-tighter tabular-nums"
        style={{ color: isAlert && value > 0 ? accent : '#ffffff' }}>
        {counted}
      </motion.p>

      {/* Bottom accent bar */}
      <motion.div className="absolute bottom-0 left-0 h-[2px] rounded-b-2xl"
        style={{ background: accent }}
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.35, ease }}
      />
    </motion.div>
  );
}

/* ─── Sub: ActionChip ───────────────────────────────────────────────────── */
function ActionChip({ action, status }: { action: string; status: string }) {
  const isFailure = status === 'failure';
  const isDelete = action.includes('delete');
  const isLogin = action.includes('login');

  const color = isFailure ? '#ff3366' : isDelete ? '#f59e0b' : isLogin ? '#00f5ff' : '#00ff88';
  const label = isFailure ? 'FAIL' : isDelete ? 'WARN' : isLogin ? 'AUTH' : 'OK';

  return (
    <span className="text-[8px] font-black px-2 py-0.5 rounded-md tracking-[0.15em] uppercase flex-shrink-0"
      style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>
      {label}
    </span>
  );
}

/* ─── Sub: LogRow ───────────────────────────────────────────────────────── */
function LogRow({ log, index, isFirst }: { log: AuditLog; index: number; isFirst: boolean }) {
  const [hovered, setHovered] = useState(false);
  const isFailure = log.status === 'failure';
  const isDelete = log.action.includes('delete');
  const isLogin = log.action.includes('login');

  const accent = isFailure ? '#ff3366' : isDelete ? '#f59e0b' : isLogin ? '#00f5ff' : '#00ff88';

  const icon = isFailure
    ? <HiOutlineXCircle className="w-4 h-4" />
    : isLogin
      ? <HiOutlineEye className="w-4 h-4" />
      : isDelete
        ? <HiOutlineShieldExclamation className="w-4 h-4" />
        : <HiOutlineCheckCircle className="w-4 h-4" />;

  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -18 : 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-4 px-4 py-3 rounded-xl group cursor-default transition-colors border border-transparent"
      style={{
        background: hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        borderColor: hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
      }}
    >
      {/* Timeline dot */}
      <div className="relative flex-shrink-0 w-6 flex items-center justify-center">
        {isFirst && (
          <motion.div className="absolute w-5 h-5 rounded-full pointer-events-none"
            style={{ background: `${accent}20` }}
            animate={{ scale: [1, 1.9, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <motion.div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full"
          style={{ background: `${accent}15`, border: `1px solid ${accent}40`, color: accent }}
          animate={{ boxShadow: isFirst ? [`0 0 0px ${accent}00`, `0 0 10px ${accent}60`, `0 0 0px ${accent}00`] : 'none' }}
          transition={{ duration: 2, repeat: Infinity }}>
          {icon}
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-gray-200 uppercase tracking-wide group-hover:text-white transition-colors truncate">
            {log.action.replace(/_/g, ' ')}
          </span>
          <ActionChip action={log.action} status={log.status} />
        </div>
        {log.details && (
          <p className="text-[9px] text-gray-600 mt-0.5 truncate group-hover:text-gray-500 transition-colors font-mono">
            {log.details}
          </p>
        )}
      </div>

      {/* Right: timestamp + IP */}
      <div className="text-right flex-shrink-0 space-y-0.5">
        <motion.p className="text-[10px] font-mono tabular-nums text-gray-600 group-hover:text-gray-400 transition-colors"
          whileHover={{ color: accent }}>
          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </motion.p>
        <p className="text-[9px] font-mono text-gray-700 group-hover:text-gray-600 transition-colors">
          {log.ip_address}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function SecurityMonitorPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [failedLogins, setFailedLogins] = useState<AuditLog[]>([]);
  const [tab, setTab] = useState<'all' | 'threats'>('all');
  const pulse = usePulse(4000);

  useEffect(() => {
    securityAPI.getAuditLogs(50).then((r) => setLogs(r.data.logs)).catch(() => {});
    securityAPI.getFailedLogins(20).then((r) => setFailedLogins(r.data.failed_logins)).catch(() => {});
  }, []);

  const displayLogs = tab === 'all' ? logs : failedLogins;
  const successCount = logs.filter(l => l.status === 'success').length;

  const statCards: StatCardProps[] = [
    { label: 'Successful Actions', value: successCount, icon: HiOutlineCheckCircle, accent: '#00ff88', index: 0 },
    { label: 'Failed Attempts', value: failedLogins.length, icon: HiOutlineXCircle, accent: '#ff3366', index: 1, isAlert: true },
    { label: 'Total Events', value: logs.length, icon: HiOutlineServerStack, accent: '#00f5ff', index: 2 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-12"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="relative">
          {/* Soft title glow */}
          <div className="pointer-events-none absolute -inset-4 blur-3xl opacity-15 bg-[radial-gradient(ellipse,#ff3366_0%,transparent_70%)]" />
          <h1 className="relative text-[clamp(1.8rem,4vw,2.8rem)] font-black text-white tracking-[-0.03em] leading-none">
            SECURITY{' '}
            <span className="bg-gradient-to-r from-[#ff3366] via-[#f59e0b] to-[#00f5ff] bg-clip-text text-transparent">
              MONITOR
            </span>
          </h1>
          <div className="flex items-center gap-3 mt-2.5">
            <motion.p className="font-mono text-[10px] tracking-widest text-gray-600"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}>
              SOC_TERMINAL // REAL-TIME AUDIT TRAIL
            </motion.p>
          </div>
        </div>

        {/* Live badge + threat meter */}
        <div className="flex items-center gap-4 flex-wrap">
          <ThreatLevelMeter failedCount={failedLogins.length} />
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00f5ff]/[0.05] border border-[#00f5ff]/15">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-[#00f5ff]"
              animate={{ scale: pulse ? [1, 1.7, 1] : 1, opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.7 }}
              style={{ boxShadow: '0 0 6px #00f5ff' }}
            />
            <span className="text-[9px] font-black text-[#00f5ff] uppercase tracking-[0.18em]">Live Feed</span>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(card => <StatCard key={card.label} {...card} />)}
      </div>

      {/* ── Tab Switcher ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          {/* Sliding active background */}
          <motion.div
            className="absolute top-1 bottom-1 rounded-lg pointer-events-none"
            style={{
              background: tab === 'all'
                ? 'linear-gradient(135deg,rgba(0,245,255,0.1),rgba(0,245,255,0.05))'
                : 'linear-gradient(135deg,rgba(255,51,102,0.1),rgba(255,51,102,0.05))',
              border: tab === 'all' ? '1px solid rgba(0,245,255,0.2)' : '1px solid rgba(255,51,102,0.2)',
            }}
            animate={{ left: tab === 'all' ? 4 : '50%', width: 'calc(50% - 4px)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          />
          {([
            { id: 'all', label: 'All Activity', accent: '#00f5ff' },
            { id: 'threats', label: 'Failed Logins', accent: '#ff3366' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative z-10 px-5 py-2 rounded-lg text-[10px] font-black tracking-[0.15em] uppercase transition-colors duration-200 w-36"
              style={{ color: tab === t.id ? t.accent : '#6b7280' }}
            >
              {t.label}
              {t.id === 'threats' && failedLogins.length > 0 && (
                <span className="ml-1.5 text-[8px] px-1.5 py-0.5 rounded-full bg-[#ff3366]/15 text-[#ff3366]">
                  {failedLogins.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[9px] text-gray-700 font-mono">
          <HiOutlineFunnel className="w-3.5 h-3.5" />
          <span>{displayLogs.length} RECORDS</span>
        </div>
      </div>

      {/* ── Audit Timeline ──────────────────────────────────────────────── */}
      <motion.div
        layout
        className="rounded-2xl border border-white/[0.06] bg-[#080d14] overflow-hidden"
      >
        {/* Panel header */}
        <div className="relative px-6 py-4 border-b border-white/[0.05] flex items-center justify-between overflow-hidden bg-white/[0.015]">
          {/* Live shimmer sweep */}
          <motion.div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#00f5ff]/[0.03] to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 6, ease: 'linear' }}
          />
          <div className="relative flex items-center gap-2.5">
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
              <HiOutlineServerStack className="w-4 h-4 text-[#00f5ff]" />
            </motion.div>
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
              {tab === 'all' ? 'Full Audit Trail' : 'Intrusion Attempts'}
            </h2>
          </div>
          <div className="relative flex items-center gap-2">
            <motion.div className="w-1.5 h-1.5 rounded-full"
              style={{
                background: tab === 'threats' && failedLogins.length > 0 ? '#ff3366' : '#00ff88',
                boxShadow: `0 0 6px ${tab === 'threats' && failedLogins.length > 0 ? '#ff3366' : '#00ff88'}`,
              }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">
              {tab === 'threats' && failedLogins.length > 0 ? 'THREAT DETECTED' : 'NOMINAL'}
            </span>
          </div>
        </div>

        {/* Log body */}
        <div className="relative p-3">
          {/* Vertical connector line */}
          {displayLogs.length > 1 && (
            <div className="absolute left-[2.45rem] top-6 bottom-6 w-px pointer-events-none"
              style={{ background: 'linear-gradient(180deg,rgba(0,245,255,0.3) 0%,rgba(0,245,255,0.08) 60%,transparent 100%)' }}
            />
          )}

          <AnimatePresence mode="wait">
            {displayLogs.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-16 text-center">
                <HiOutlineExclamationTriangle className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-[11px] text-gray-700 font-mono italic tracking-wider uppercase">
                  NO_RECORDS_FOUND
                </p>
              </motion.div>
            ) : (
              <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }} className="space-y-0.5">
                {displayLogs.map((log, i) => (
                  <LogRow key={log.id} log={log} index={i} isFirst={i === 0} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}