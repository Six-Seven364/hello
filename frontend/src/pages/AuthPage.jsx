import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, User, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      toast.success(isLogin ? "Access Granted" : "Identity Created");
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Authentication Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-black p-10 border-r border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1767481626894-bab78ae919be?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwzfHxjeWJlcnB1bmslMjBhYnN0cmFjdCUyMGRpZ2l0YWwlMjBncmlkJTIwbmVvbiUyMGRhcmt8ZW58MHx8fHwxNzcwNDc5NzMxfDA&ixlib=rb-4.1.0&q=85')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center"
        >
          <div className="flex items-center justify-center mb-8">
            <Shield className="w-16 h-16 text-cyan-400 neon-glow" />
          </div>
          <h1 className="text-5xl md:text-7xl font-orbitron font-black tracking-tighter uppercase mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
              GridLock
            </span>
          </h1>
          <p className="text-gray-400 font-mono text-lg tracking-widest uppercase">
            Secure Your Digital Soul
          </p>
          
          <div className="mt-12 flex flex-col gap-4 text-left">
            {["TOTP Authentication", "Password Vault", "QR Code Support"].map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.2 }}
                className="flex items-center gap-3 text-gray-500"
              >
                <div className="w-2 h-2 bg-cyan-400" />
                <span className="font-mono text-sm">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex flex-col justify-center items-center bg-black/95 p-8 relative">
        <div className="absolute inset-0 grid-bg opacity-10" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <Shield className="w-12 h-12 text-cyan-400 mr-3" />
            <span className="text-3xl font-orbitron font-black text-cyan-400">GRIDLOCK</span>
          </div>

          <div className="glass-effect p-8">
            <div className="flex mb-8">
              <button
                data-testid="auth-tab-login"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 font-orbitron text-sm uppercase tracking-widest border-b-2 transition-colors ${
                  isLogin
                    ? "text-cyan-400 border-cyan-400"
                    : "text-gray-500 border-transparent hover:text-gray-400"
                }`}
              >
                Login
              </button>
              <button
                data-testid="auth-tab-register"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 font-orbitron text-sm uppercase tracking-widest border-b-2 transition-colors ${
                  !isLogin
                    ? "text-cyan-400 border-cyan-400"
                    : "text-gray-500 border-transparent hover:text-gray-400"
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono mb-2 block">
                      Identity Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <Input
                        data-testid="auth-input-name"
                        type="text"
                        placeholder="Enter your name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="pl-11 bg-black/50 border-b-2 border-white/20 focus:border-cyan-400 h-12 font-mono rounded-none"
                        required={!isLogin}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono mb-2 block">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    data-testid="auth-input-email"
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-11 bg-black/50 border-b-2 border-white/20 focus:border-cyan-400 h-12 font-mono rounded-none"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono mb-2 block">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    data-testid="auth-input-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="pl-11 pr-11 bg-black/50 border-b-2 border-white/20 focus:border-cyan-400 h-12 font-mono rounded-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                data-testid="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-cyan-500 text-black font-orbitron font-bold uppercase tracking-widest hover:bg-cyan-400 hover:shadow-neon-strong transition-all duration-200 rounded-none clip-corner"
              >
                {loading ? (
                  <span className="animate-pulse">Processing...</span>
                ) : isLogin ? (
                  "Access System"
                ) : (
                  "Create Identity"
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-gray-600 text-xs font-mono mt-6 uppercase tracking-widest">
            End-to-end encrypted • Zero knowledge
          </p>
        </motion.div>
      </div>
    </div>
  );
}
