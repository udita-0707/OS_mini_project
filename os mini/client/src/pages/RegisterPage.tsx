import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineShieldCheck, HiOutlineLockClosed, HiOutlineUser, HiOutlineEnvelope } from 'react-icons/hi2';

const registerSchema = z.object({
  username: z.string().min(3, 'Min 3 characters').max(20, 'Max 20 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
});
type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await signup(data.username, data.email, data.password);
      toast.success('Account created! Welcome to SecureVault OS');
      navigate('/dashboard');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Registration failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-vault-bg grid-bg p-4">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-cyber-400/30 rounded-full"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 2 }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-cyber-500/20 via-vault-accent/20 to-purple-500/20 rounded-3xl blur-xl" />

        <div className="relative glass-card p-8">
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyber-500 to-vault-accent flex items-center justify-center"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <HiOutlineShieldCheck className="w-8 h-8 text-vault-bg" />
            </motion.div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyber-400 to-vault-accent bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-sm text-gray-400 mt-1">Join SecureVault OS</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 tracking-wider uppercase">Username</label>
              <div className="relative">
                <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input {...register('username')} className="cyber-input pl-10" placeholder="Choose a username" />
              </div>
              {errors.username && <p className="text-xs text-vault-danger mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 tracking-wider uppercase">Email</label>
              <div className="relative">
                <HiOutlineEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input {...register('email')} className="cyber-input pl-10" placeholder="your@email.com" />
              </div>
              {errors.email && <p className="text-xs text-vault-danger mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 tracking-wider uppercase">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input {...register('password')} type="password" className="cyber-input pl-10" placeholder="Min 8 characters" />
              </div>
              {errors.password && <p className="text-xs text-vault-danger mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 tracking-wider uppercase">Confirm Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input {...register('confirmPassword')} type="password" className="cyber-input pl-10" placeholder="Re-enter password" />
              </div>
              {errors.confirmPassword && <p className="text-xs text-vault-danger mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="cyber-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-vault-bg border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <HiOutlineShieldCheck className="w-5 h-5" />
                  Create Account
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-vault-accent hover:underline">Login</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
