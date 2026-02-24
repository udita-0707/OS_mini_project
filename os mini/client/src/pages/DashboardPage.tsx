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
    fileAPI.stats().then((r) => setStats(r.data)).catch(() => {});
    securityAPI.getAuditLogs(10).then((r) => setLogs(r.data.logs)).catch(() => {});
  }, []);

  const algoColors = ['#00ff88', '#00b8ff', '#ff3366', '#ffaa00'];
  const algoLabels = stats ? Object.keys(stats.algorithm_distribution) : [];
  const algoValues = stats ? Object.values(stats.algorithm_distribution) : [];

  const doughnutData = {
    labels: algoLabels.length ? algoLabels : ['No files yet'],
    datasets: [{
      data: algoValues.length ? algoValues : [1],
      backgroundColor: algoValues.length ? algoColors.slice(0, algoLabels.length) : ['#1e293b'],
      borderWidth: 0,
    }],
  };

  const barData = {
    labels: algoLabels.length ? algoLabels : ['No data'],
    datasets: [{
      label: 'Files',
      data: algoValues.length ? algoValues : [0],
      backgroundColor: algoColors.slice(0, Math.max(algoLabels.length, 1)),
      borderRadius: 8,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
    },
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#1e293b' } },
    },
  };

  const infoCards = [
    {
      label: 'Total Files',
      value: stats?.storage.total_files ?? '—',
      icon: HiOutlineFolder,
      color: 'from-vault-accent to-emerald-400',
    },
    {
      label: 'Storage Used',
      value: stats ? `${stats.storage.total_size_mb} MB` : '—',
      icon: HiOutlineServerStack,
      color: 'from-cyber-400 to-blue-500',
    },
    {
      label: 'Last Login',
      value: user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'First login',
      icon: HiOutlineClock,
      color: 'from-purple-400 to-pink-500',
    },
    {
      label: 'Security Status',
      value: user?.is_locked ? 'LOCKED' : 'Secure',
      icon: user?.is_locked ? HiOutlineExclamationTriangle : HiOutlineShieldCheck,
      color: user?.is_locked ? 'from-vault-danger to-red-600' : 'from-vault-accent to-teal-400',
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome, <span className="bg-gradient-to-r from-vault-accent to-cyber-400 bg-clip-text text-transparent">{user?.username}</span>
        </h1>
        <p className="text-gray-400 mt-1">Your encrypted vault dashboard</p>
      </div>

      {/* Info Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {infoCards.map((card, i) => (
          <motion.div
            key={i}
            variants={item}
            whileHover={{ y: -4, scale: 1.02 }}
            className="glass-card p-5 group cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400 tracking-wider uppercase">{card.label}</span>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <card.icon className="w-5 h-5 text-vault-bg" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Algorithm Distribution</h2>
          <div className="h-64 flex items-center justify-center">
            <Doughnut data={doughnutData} options={chartOptions} />
          </div>
        </div>
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Encryption Usage</h2>
          <div className="h-64 flex items-center justify-center">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={item} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-vault-bg/50 border border-vault-border"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-vault-accent' : 'bg-vault-danger'}`} />
                  <span className="text-sm text-gray-300">{log.action}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{log.ip_address}</span>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
