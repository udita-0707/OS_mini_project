import { useState, useEffect } from 'react';
import { securityAPI } from '../api';
import { motion } from 'framer-motion';
import {
  HiOutlineShieldExclamation,
  HiOutlineEye,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from 'react-icons/hi2';

interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  status: string;
  timestamp: string;
  ip_address: string;
  details: string | null;
}

export default function SecurityMonitorPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [failedLogins, setFailedLogins] = useState<AuditLog[]>([]);
  const [tab, setTab] = useState<'all' | 'threats'>('all');

  useEffect(() => {
    securityAPI.getAuditLogs(50).then((r) => setLogs(r.data.logs)).catch(() => {});
    securityAPI.getFailedLogins(20).then((r) => setFailedLogins(r.data.failed_logins)).catch(() => {});
  }, []);

  const actionIcon = (action: string, status: string) => {
    if (status === 'failure') return <HiOutlineXCircle className="w-5 h-5 text-vault-danger" />;
    if (action.includes('login')) return <HiOutlineEye className="w-5 h-5 text-cyber-400" />;
    if (action.includes('delete')) return <HiOutlineShieldExclamation className="w-5 h-5 text-vault-warning" />;
    return <HiOutlineCheckCircle className="w-5 h-5 text-vault-accent" />;
  };

  const displayLogs = tab === 'all' ? logs : failedLogins;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Security Monitor</h1>
        <p className="text-gray-400 mt-1">Real-time audit trail and threat detection</p>
      </div>

      {/* Threat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-vault-accent/10 flex items-center justify-center">
              <HiOutlineCheckCircle className="w-5 h-5 text-vault-accent" />
            </div>
            <span className="text-sm text-gray-400">Successful Actions</span>
          </div>
          <p className="text-2xl font-bold text-white">{logs.filter(l => l.status === 'success').length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-vault-danger/10 flex items-center justify-center">
              <HiOutlineXCircle className="w-5 h-5 text-vault-danger" />
            </div>
            <span className="text-sm text-gray-400">Failed Attempts</span>
          </div>
          <p className="text-2xl font-bold text-vault-danger">{failedLogins.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-vault-warning/10 flex items-center justify-center">
              <HiOutlineShieldExclamation className="w-5 h-5 text-vault-warning" />
            </div>
            <span className="text-sm text-gray-400">Total Events</span>
          </div>
          <p className="text-2xl font-bold text-white">{logs.length}</p>
        </motion.div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === 'all' ? 'bg-vault-accent/10 text-vault-accent border border-vault-accent/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          All Activity
        </button>
        <button
          onClick={() => setTab('threats')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === 'threats' ? 'bg-vault-danger/10 text-vault-danger border border-vault-danger/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          Failed Logins
        </button>
      </div>

      {/* Activity Timeline */}
      <div className="glass-card p-6">
        {displayLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No activity recorded.</p>
        ) : (
          <div className="space-y-1">
            {displayLogs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-vault-bg/50 transition-colors group"
              >
                <div className="shrink-0">{actionIcon(log.action, log.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">{log.action}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${
                      log.status === 'success'
                        ? 'bg-vault-accent/10 text-vault-accent'
                        : 'bg-vault-danger/10 text-vault-danger'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  {log.details && <p className="text-xs text-gray-500 mt-0.5 truncate">{log.details}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                  <p className="text-xs text-gray-600 font-mono">{log.ip_address}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
