import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  HiOutlineShieldCheck, 
  HiOutlineLockClosed, 
  HiOutlineUser, 
  HiOutlineCpuChip, 
  HiOutlineBugAnt,
  HiOutlineArrowDownCircle,
  HiOutlineArrowRight,
  HiOutlineArrowPath,
  HiOutlineKey,
  HiOutlineExclamationTriangle,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineChevronRight,
  HiOutlineChevronLeft
} from 'react-icons/hi2';

// --- CONSTANTS ---
const OS_STEPS = [
  {
    id: 1,
    title: 'User Application',
    desc: 'SecureVault initiates an encryption request in User Space (Ring 3).',
    sub: 'Interface: React/Axios',
    icon: HiOutlineUser,
    color: '#00ff88'
  },
  {
    id: 2,
    title: 'System Call',
    desc: 'The process transitions from User Mode to Kernel Mode via CPU interrupts.',
    sub: 'Vector: syscall/0x80',
    icon: HiOutlineCpuChip,
    color: '#00b8ff',
    isTransition: true
  },
  {
    id: 3,
    title: 'Kernel Core',
    desc: 'The OS Kernel manages direct resource allocation and hardware protection.',
    sub: 'Control: Ring 0',
    icon: HiOutlineShieldCheck,
    color: '#7000ff'
  },
  {
    id: 4,
    title: 'Hardware I/O',
    desc: 'Final encrypted data is written to physical storage media.',
    sub: 'Physical: NVMe/SATA',
    icon: HiOutlineLockClosed,
    color: '#ff3366'
  }
];

const INITIAL_FILES = [
  { name: 'config.sys', encrypted: false, content: 'SYSTEM_SETTINGS: ENABLE_CRYPT=1' },
  { name: 'user_vault.db', encrypted: false, content: 'SQLITE_HEADER: KEY_INDEX_043' },
  { name: 'secrets.txt', encrypted: false, content: 'PASS: hunter2' },
];

const loginSchema = z.object({
  username: z.string().min(1, 'Identity verified required'),
  password: z.string().min(1, 'Passcode required'),
});
type LoginFormData = z.infer<typeof loginSchema>;

// --- UI COMPONENTS ---

const Typewriter = ({ text, delay = 50 }: { text: string, delay?: number }) => {
  const [currentText, setCurrentText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [index, text, delay]);

  return <span>{currentText}</span>;
};

export default function LandingPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);

  // Scroll animations
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  // OS Visualizer State
  const [activeStep, setActiveStep] = useState(1);

  // Ransomware State
  const [rsPhase, setRsPhase] = useState<'idle' | 'breach' | 'encrypting' | ' ransom' | 'recovered'>('idle');
  const [rsFiles, setRsFiles] = useState(INITIAL_FILES);
  const [terminalLogs, setTerminalLogs] = useState<string[]>(['root@securevault:~# _']);
  const [commandInput, setCommandInput] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setShake(false);
    try {
      await login(data.username, data.password);
      toast.success('Access Granted. Welcome Operative.');
      navigate('/dashboard');
    } catch (error: any) {
      setShake(true);
      toast.error('ACCESS DENIED: Credentials Invalid');
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const startAttack = async () => {
    setRsPhase('breach');
    setTerminalLogs(prev => [...prev, 'CRITICAL: Unauthorized access detected from 192.168.1.104', 'System intrusion in progress...']);
    
    await new Promise(r => setTimeout(r, 1500));
    setRsPhase('encrypting');
    
    for (let i = 0; i < rsFiles.length; i++) {
      setTerminalLogs(prev => [...prev, `LOCKING: ${rsFiles[i].name}... DONE`]);
      setRsFiles(prev => prev.map((f, idx) => idx === i ? { ...f, encrypted: true } : f));
      await new Promise(r => setTimeout(r, 800));
    }
    
    setRsPhase(' ransom');
    setTerminalLogs(prev => [...prev, '', '!!! ALL DATA ENCRYPTED !!!', 'DEPOSIT 0.05 BTC TO RECOVER', '----------------------------']);
  };

  const recoverSystem = () => {
    if (commandInput.toUpperCase() === 'SECUREVAULT_RECOVER') {
      setRsPhase('recovered');
      setTerminalLogs(prev => [...prev, 'Executing emergency kernel recovery...', 'Decryption starting...', 'SUCCESS: All sectors restored.']);
      setRsFiles(INITIAL_FILES);
      setCommandInput('');
    } else {
      setTerminalLogs(prev => [...prev, `Error: '${commandInput}' is not a valid recovery vector.`]);
      setCommandInput('');
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-gray-100 selection:bg-vault-accent/30 selection:text-vault-accent">
      <div className="scanline" />
      
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 grid-bg opacity-30" style={{ maskImage: 'radial-gradient(circle at center, black, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)' }} />
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-vault-accent/20 rounded-full"
            style={{ 
              left: `${Math.random() * 100}%`, 
              top: `${Math.random() * 100}%` 
            }}
            animate={{
              y: [0, -100],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      <nav className="fixed top-0 left-0 w-full p-6 z-50 flex justify-between items-center backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2 group cursor-default">
          <div className="w-8 h-8 rounded-lg bg-vault-accent flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] transition-all">
            <HiOutlineShieldCheck className="w-5 h-5 text-vault-bg" />
          </div>
          <span className="font-black tracking-tighter text-xl">SECURE<span className="text-vault-accent">VAULT</span></span>
        </div>
        <div className="flex gap-8 items-center text-xs font-bold tracking-widest text-gray-500">
          <a href="#arch" className="hover:text-vault-accent transition-colors">ARCHITECTURE</a>
          <a href="#demo" className="hover:text-vault-accent transition-colors">SIMULATOR</a>
          <button onClick={() => document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' })} className="cyber-btn py-2 text-[10px]">AUTH_MODE</button>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section 
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative h-screen flex flex-col items-center justify-center p-6 text-center z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vault-accent/10 border border-vault-accent/30 text-vault-accent text-[10px] font-bold tracking-[0.2em] uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-vault-accent animate-pulse" />
            KERNEL-LEVEL ENCRYPTION ACTIVE
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black mb-6 tracking-tighter max-w-5xl leading-none">
            <span className="block text-white">SECUREVAULT</span>
            <span className="bg-gradient-to-r from-vault-accent via-cyber-400 to-vault-accent bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent">
              OS DEFENDER
            </span>
          </h1>
          
          <p className="max-w-xl mx-auto text-lg md:text-xl text-gray-400 mb-12 font-medium leading-relaxed uppercase tracking-tight">
            Advanced system-level protection and data sovereignty platform for high-risk computing environments.
          </p>
          
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <button 
              onClick={() => document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' })}
              className="cyber-btn-primary group"
            >
              <span className="flex items-center gap-3">
                ACCESS SYSTEM <HiOutlineArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button 
              onClick={() => document.getElementById('arch')?.scrollIntoView({ behavior: 'smooth' })}
              className="cyber-btn"
            >
              VIEW PROTOCOLS
            </button>
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <HiOutlineArrowDownCircle className="w-10 h-10 text-white/20" />
        </motion.div>
      </motion.section>

      {/* OS Architecture Section */}
      <section id="arch" className="relative py-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div>
              <h2 className="text-5xl font-black mb-4 tracking-tighter text-glow-blue uppercase">System Sovereignty</h2>
              <p className="text-gray-500 text-lg uppercase tracking-widest font-bold">OS-Level Protection Matrix</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-vault-accent/20 hover:border-vault-accent/40 transition-all"
              >
                <HiOutlineChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setActiveStep(prev => Math.min(OS_STEPS.length, prev + 1))}
                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-vault-accent/20 hover:border-vault-accent/40 transition-all"
              >
                <HiOutlineChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Horizontal Line Connector */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -translate-y-1/2 hidden md:block z-0" />
            
            {OS_STEPS.map((step) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: step.id * 0.1 }}
                className={`relative z-10 transition-all duration-500 ${activeStep === step.id ? 'scale-105' : 'opacity-40 grayscale group-hover:grayscale-0'}`}
              >
                <div 
                  className={`glass-card p-10 cursor-pointer group transition-all duration-500 overflow-hidden ${activeStep === step.id ? 'border-vault-accent shadow-[0_0_50px_rgba(0,255,136,0.1)]' : 'hover:border-white/20'}`}
                  onClick={() => setActiveStep(step.id)}
                >
                  {/* Step Active Indicator background */}
                  {activeStep === step.id && (
                    <motion.div 
                      layoutId="step-bg"
                      className="absolute inset-0 bg-gradient-to-br from-vault-accent/5 to-transparent pointer-events-none"
                    />
                  )}

                  <div 
                    className="w-12 h-12 rounded-2xl mb-8 flex items-center justify-center transition-all group-hover:scale-110"
                    style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
                  >
                    <step.icon className="w-6 h-6" style={{ color: step.color }} />
                  </div>
                  
                  <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] mb-4 block uppercase">{step.sub}</span>
                  <h3 className="text-2xl font-black mb-4 tracking-tight uppercase leading-none">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                    {step.desc}
                  </p>

                  {step.isTransition && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-vault-accent rounded-full blur-xl animate-pulse" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ransomware Simulator Section */}
      <section id="demo" className="py-32 px-6 relative bg-black/40 border-y border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-20 items-center">
          <div className="lg:w-1/2 space-y-10">
            <div>
              <h2 className="text-5xl font-black mb-6 tracking-tighter uppercase leading-none">Emergency Protocols</h2>
              <div className="w-20 h-1 bg-vault-danger rounded-full mb-8" />
              <p className="text-xl text-gray-400 leading-relaxed uppercase tracking-tight">
                Experience critical resilience testing. See how SecureVault maintains sovereignty even under primary protocol compromise.
              </p>
            </div>
            
            <ul className="space-y-6">
              {[
                { label: 'Real-time Vector Analysis', icon: HiOutlineEye },
                { label: 'Entropy Pattern Detection', icon: HiOutlineBugAnt },
                { label: 'Kernel-Level Key Recovery', icon: HiOutlineKey }
              ].map((feature, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-vault-accent/40 group-hover:text-vault-accent transition-all">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold tracking-widest text-xs text-gray-400 uppercase">{feature.label}</span>
                </motion.li>
              ))}
            </ul>

            <div className="pt-6">
              {rsPhase === 'idle' ? (
                <button onClick={startAttack} className="cyber-btn-danger px-12 py-5">
                  INITIALIZE COMPROMISE SIM
                </button>
              ) : (
                <button onClick={() => { setRsPhase('idle'); setRsFiles(INITIAL_FILES); setTerminalLogs(['root@securevault:~# _']); }} className="cyber-btn px-12 py-5">
                  RESET PROTOCOL
                </button>
              )}
            </div>
          </div>

          <div className="lg:w-1/2 w-full relative group">
            <div className={`absolute -inset-4 bg-gradient-to-r ${rsPhase === ' ransom' ? 'from-vault-danger/20 to-red-600/20' : 'from-vault-accent/10 to-cyber-400/10'} rounded-[2.5rem] blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000`} />
            
            <div className="terminal-window relative z-10 w-full aspect-square md:aspect-video flex flex-col">
              <div className="terminal-header">
                <div className="flex gap-1.5 mr-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <span className="text-[10px] text-gray-600 font-bold tracking-widest uppercase">SECUREVAULT_SHELL_v4.2</span>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-2 text-[13px]">
                {terminalLogs.map((log, i) => (
                  <div key={i} className={log.includes('CRITICAL') || log.includes('!!!') ? 'text-vault-danger' : log.includes('SUCCESS') ? 'text-vault-accent' : 'text-gray-400'}>
                    <span className="text-gray-600 mr-2">{'>'}</span>{log}
                  </div>
                ))}
                
                {rsPhase === ' ransom' && (
                  <div className="mt-8 p-4 bg-vault-danger/10 border border-vault-danger/30 rounded-lg text-vault-danger animate-pulse">
                    <h4 className="font-black text-lg mb-2">SYSTEM LOCKDOWN</h4>
                    <p className="text-[11px] leading-relaxed">
                      All data sectors have been reassigned using AES-256-XTS. Primary keys have been purged from volatile RAM. Command input required for recovery sequence.
                    </p>
                    <p className="mt-4 text-[10px] font-bold">RECOVERY_VECTOR: SECUREVAULT_RECOVER</p>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <span className="text-vault-accent font-bold">root@securevault:~#</span>
                  <input 
                    type="text" 
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && rsPhase === ' ransom' && recoverSystem()}
                    disabled={rsPhase !== ' ransom'}
                    className="flex-1 bg-transparent border-none outline-none text-white p-0"
                    autoFocus
                  />
                  {rsPhase === ' ransom' && commandInput === '' && (
                    <motion.div 
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="w-2.5 h-5 bg-vault-accent"
                    />
                  )}
                </div>
              </div>

              {/* Status Bar */}
              <div className="bg-[#0a0a0a] px-4 py-2 border-t border-white/5 flex justify-between items-center text-[9px] font-bold text-gray-700 tracking-[0.2em] uppercase">
                <div className="flex gap-4">
                  <span>SECURE_SHELL: ACTIVE</span>
                  <span>MODE: {rsPhase === ' ransom' ? 'RESTRICTED' : 'ELEVATED'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${rsPhase === ' ransom' ? 'bg-vault-danger' : 'bg-vault-accent'}`} />
                  {rsPhase}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section id="login" className="py-20 flex flex-col items-center justify-center p-6 bg-black relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-vault-accent/[0.02] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={`w-full max-w-lg relative z-10 ${shake ? 'animate-shake' : ''}`}
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-vault-accent/30 via-cyber-500/30 to-vault-accent/30 rounded-[2.5rem] blur-2xl opacity-50" />
          
          <div className="glass-card p-12 md:p-16 border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                <HiOutlineLockClosed className="w-6 h-6 text-gray-600" />
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-4xl font-black mb-2 tracking-tighter uppercase">Authenticate</h2>
              <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">System Control Point 7-B</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="group space-y-3">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] group-focus-within:text-vault-accent transition-colors">
                  OPERATIVE_ID
                </label>
                <div className="relative">
                  <HiOutlineUser className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
                  <input
                    {...register('username')}
                    className="cyber-input pl-14"
                    placeholder="Enter ID..."
                  />
                </div>
                {errors.username && <p className="text-[10px] text-vault-danger font-bold uppercase tracking-widest px-2">{errors.username.message}</p>}
              </div>

              <div className="group space-y-3">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] group-focus-within:text-vault-accent transition-colors">
                  ACCESS_CODE
                </label>
                <div className="relative">
                  <HiOutlineLockClosed className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="cyber-input pl-14 pr-14"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-[10px] text-vault-danger font-bold uppercase tracking-widest px-2">{errors.password.message}</p>}
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                className="cyber-btn-primary w-full py-5 text-sm font-black tracking-[0.3em] uppercase flex items-center justify-center gap-4 relative overflow-hidden group"
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <HiOutlineArrowPath className="w-6 h-6 animate-spin" />
                ) : (
                  <>ESTABLISH_LINK</>
                )}
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12" />
              </motion.button>
            </form>

            <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between text-[10px] font-bold">
              <span className="text-gray-600 uppercase tracking-widest">New operative?</span>
              <Link to="/register" className="text-vault-accent hover:text-white transition-all uppercase tracking-widest flex items-center gap-2">
                JOIN COHORT <HiOutlineChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-gray-700 bg-black">
        <p>&copy; 2024 SECUREVAULT SYSTEMS. QUANTUM-RESISTANT PROTOCOL ENFORCED.</p>
        <div className="flex justify-center gap-12 mt-8 text-gray-600">
          <Link to="/" className="hover:text-vault-accent transition-colors">SECURITY.INI</Link>
          <Link to="/" className="hover:text-vault-accent transition-colors">CORE_LIBS</Link>
          <a href="https://github.com/sainathmeesala" target="_blank" rel="noopener noreferrer" className="hover:text-vault-accent transition-colors">GITSYS_v2</a>
        </div>
      </footer>
    </div>
  );
}
