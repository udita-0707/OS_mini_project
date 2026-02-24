import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fileAPI, securityAPI } from '../api';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  HiOutlineFolder,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineServerStack,
} from 'react-icons/hi2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface Stats {
  storage: { total_files: number; total_size_mb: number };
  algorithm_distribution: Record<string, number>;
}

interface AuditLog {
  id: number;
  action: string;
  status: string;
  timestamp: string;
  ip_address: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fileAPI.stats().then((r) => setStats(r.data)).catch(() => { });
    securityAPI.getAuditLogs(10).then((r) => setLogs(r.data.logs)).catch(() => { });
  }, []);

  const algoColors = ['#00f5ff', '#a855f7', '#ff2d55', '#34d399'];
  const algoLabels = stats ? Object.keys(stats.algorithm_distribution) : [];
  const algoValues = stats ? Object.values(stats.algorithm_distribution) : [];

  const doughnutData = {
    labels: algoLabels.length ? algoLabels : ['No files yet'],
    datasets: [{
      data: algoValues.length ? algoValues : [1],
      backgroundColor: algoValues.length ? algoColors.slice(0, algoLabels.length) : ['#1e293b'],
      borderWidth: 0,
      hoverOffset: 10,
      cutout: '75%',
    }],
  };

  const barData = {
    labels: algoLabels.length ? algoLabels : ['No data'],
    datasets: [{
      label: 'Files',
      data: algoValues.length ? algoValues : [0],
      backgroundColor: algoColors.slice(0, Math.max(algoLabels.length, 1)),
      borderRadius: 12,
      barThickness: 20,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#64748b', font: { size: 10, weight: 'bold' as const }, padding: 20 }
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { color: '#64748b', font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(30, 41, 59, 0.5)' } },
    },
  };

  const infoCards = [
    {
      label: 'Total Files',
      value: stats?.storage.total_files ?? '0',
      icon: HiOutlineFolder,
      color: 'from-vault-accent/20 to-vault-accent/5',
      iconColor: 'text-vault-accent',
      shadow: 'shadow-vault-accent/10',
    },
    {
      label: 'Storage Used',
      value: stats ? `${stats.storage.total_size_mb} MB` : '0 MB',
      icon: HiOutlineServerStack,
      color: 'from-cyber-400/20 to-cyber-400/5',
      iconColor: 'text-cyber-400',
      shadow: 'shadow-cyber-400/10',
    },
    {
      label: 'Last Session',
      value: user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A',
      icon: HiOutlineClock,
      color: 'from-purple-500/20 to-purple-500/5',
      iconColor: 'text-purple-400',
      shadow: 'shadow-purple-500/10',
    },
    {
      label: 'Health Check',
      value: user?.is_locked ? 'COMPROMISED' : 'STABLE',
      icon: user?.is_locked ? HiOutlineExclamationTriangle : HiOutlineShieldCheck,
      color: user?.is_locked ? 'from-vault-danger/20 to-vault-danger/5' : 'from-emerald-500/20 to-emerald-500/5',
      iconColor: user?.is_locked ? 'text-vault-danger' : 'text-emerald-400',
      shadow: user?.is_locked ? 'shadow-vault-danger/10' : 'shadow-emerald-500/10',
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            SYSTEM <span className="bg-gradient-to-r from-vault-accent to-cyber-400 bg-clip-text text-transparent underline decoration-vault-accent/30 underline-offset-8">OVERVIEW</span>
          </h1>
          <p className="text-gray-500 mt-3 font-mono text-sm">SECURE_NODE: {user?.username?.toUpperCase()} // STATUS: ACTIVE</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-vault-accent/5 border border-vault-accent/20">
          <div className="w-1.5 h-1.5 rounded-full bg-vault-accent animate-pulse" />
          <span className="text-[10px] font-bold text-vault-accent uppercase tracking-tighter">Live Connection</span>
        </div>
      </div>

      {/* Info Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {infoCards.map((card, i) => (
          <motion.div
            key={i}
            variants={item}
            whileHover={{ y: -5, scale: 1.01 }}
            className={`glass-card p-6 relative overflow-hidden group border-t-2 ${card.shadow}`}
          >
            {/* Background Glow */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${card.color} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">{card.label}</span>
              <card.icon className={`w-6 h-6 ${card.iconColor} opacity-50 group-hover:opacity-100 transition-opacity`} />
            </div>
            <div className="relative z-10">
              <p className="text-3xl font-black text-white tracking-tighter tabular-nums">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-l-4 border-vault-accent">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Algorithm Matrix</h2>
            <div className="text-[10px] text-gray-500 font-mono">DISTRIBUTION_v1.0</div>
          </div>
          <div className="h-64 flex items-center justify-center relative">
            <Doughnut data={doughnutData} options={chartOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-white">{stats?.storage.total_files || 0}</span>
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Objects</span>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-cyber-400">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Encryption Load</h2>
            <div className="text-[10px] text-gray-500 font-mono">METRICS_SYS</div>
          </div>
          <div className="h-64">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={item} className="glass-card p-0 overflow-hidden border-vault-border/50">
        <div className="px-6 py-4 border-b border-vault-border flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <HiOutlineServerStack className="w-4 h-4 text-vault-accent" />
            Security Audit Trail
          </h2>
          <button className="text-[10px] font-bold text-vault-accent hover:underline uppercase tracking-widest">Refresh logs</button>
        </div>
        <div className="p-4">
          {logs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-600 text-sm italic">NO_RECORDS_FOUND_IN_LOCAL_STORE</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-vault-accent shadow-[0_0_8px_rgba(0,255,136,0.5)]' : 'bg-vault-danger shadow-[0_0_8px_rgba(255,51,102,0.5)]'}`} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-200 uppercase group-hover:text-white transition-colors">{log.action.replace('_', ' ')}</span>
                      <span className="text-[9px] font-mono text-gray-600 group-hover:text-gray-400 transition-colors uppercase tracking-tight">IP: {log.ip_address}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-gray-600 group-hover:text-vault-accent transition-colors tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
