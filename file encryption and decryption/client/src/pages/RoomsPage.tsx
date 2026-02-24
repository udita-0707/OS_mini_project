import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { roomsAPI } from '../api';
import toast from 'react-hot-toast';
import {
  HiOutlinePlusCircle,
  HiOutlineUserGroup,
  HiOutlineLockClosed,
  HiOutlineArrowRight,
} from 'react-icons/hi2';

interface Room {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  created_at: string;
  member_count: number;
  role: string;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      const res = await roomsAPI.list();
      setRooms(res.data.rooms || []);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const createRoom = async () => {
    if (!name.trim()) { toast.error('Room name is required'); return; }
    try {
      await roomsAPI.create({ name: name.trim(), description: description.trim() || null });
      toast.success('Room created');
      setShowCreate(false);
      setName('');
      setDescription('');
      fetchRooms();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create room');
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'text-vault-accent border-vault-accent/30 bg-vault-accent/10',
      admin: 'text-cyber-400 border-cyber-400/30 bg-cyber-400/10',
      member: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
      viewer: 'text-gray-400 border-gray-500/30 bg-gray-500/10',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-lg border ${colors[role] || colors.viewer}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Encrypted Rooms</h1>
          <p className="text-gray-400 mt-1">Secure collaboration workspaces with role-based access</p>
        </div>
        <motion.button
          onClick={() => setShowCreate(!showCreate)}
          className="cyber-btn-primary flex items-center gap-2"
          whileTap={{ scale: 0.95 }}
        >
          <HiOutlinePlusCircle className="w-5 h-5" />
          Create Room
        </motion.button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-white">New Room</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="cyber-input"
              placeholder="Room name"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="cyber-input"
              placeholder="Description (optional)"
            />
            <div className="flex gap-3">
              <button onClick={createRoom} className="cyber-btn-primary">Create</button>
              <button onClick={() => setShowCreate(false)} className="cyber-btn">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading rooms…</div>
      ) : rooms.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineLockClosed className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No rooms yet. Create one to start collaborating securely.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/rooms/${room.id}`} className="block">
                <div className="glass-card p-5 hover:border-vault-accent/30 transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white group-hover:text-vault-accent transition-colors">
                      {room.name}
                    </h3>
                    {roleBadge(room.role)}
                  </div>
                  {room.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{room.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <HiOutlineUserGroup className="w-4 h-4" />
                      {room.member_count} members
                    </span>
                    <HiOutlineArrowRight className="w-4 h-4 text-gray-600 group-hover:text-vault-accent transition-colors" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
