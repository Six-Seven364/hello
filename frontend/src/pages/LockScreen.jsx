import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LockScreen({ user, onUnlock }) {
  const [lockCode, setLockCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRefs = useRef([]);

  const isPinMode = user?.lock_type === "pin4" || user?.lock_type === "pin6";
  const pinLength = user?.lock_type === "pin4" ? 4 : user?.lock_type === "pin6" ? 6 : 0;

  useEffect(() => {
    if (isPinMode && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [isPinMode]);

  const handlePinInput = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = lockCode.split("");
    newCode[index] = value;
    const updatedCode = newCode.join("").slice(0, pinLength);
    setLockCode(updatedCode);
    setError(false);

    if (value && index < pinLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (updatedCode.length === pinLength) {
      verifyCode(updatedCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !lockCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (code = lockCode) => {
    setLoading(true);
    setError(false);

    try {
      const token = localStorage.getItem("gridlock_token");
      await axios.post(
        `${API}/lock/verify`,
        { lock_code: code },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Access Granted");
      onUnlock();
    } catch (err) {
      setError(true);
      setAttempts((prev) => prev + 1);
      setLockCode("");
      if (isPinMode && inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
      toast.error("Invalid Lock Code");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (lockCode.length >= 6) {
      verifyCode();
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-flex items-center justify-center mb-6"
          >
            <Shield className={`w-20 h-20 ${error ? "text-red-500 neon-glow-red" : "text-cyan-400 neon-glow"}`} />
          </motion.div>
          
          <h1 className="text-4xl font-orbitron font-black text-cyan-400 mb-2 neon-text">
            GRIDLOCK
          </h1>
          <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">
            {user?.lock_type === "password" ? "Enter Password" : `Enter ${pinLength}-Digit PIN`}
          </p>
        </div>

        {isPinMode ? (
          <div className="glass-effect p-8">
            <div className="flex justify-center gap-3 mb-8">
              {Array.from({ length: pinLength }).map((_, index) => (
                <motion.div
                  key={index}
                  animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <Input
                    ref={(el) => (inputRefs.current[index] = el)}
                    data-testid={`lock-pin-input-${index}`}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={lockCode[index] || ""}
                    onChange={(e) => handlePinInput(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-14 h-16 text-center text-2xl font-mono bg-black/50 border-2 rounded-none transition-all duration-200 ${
                      error
                        ? "border-red-500 text-red-500"
                        : lockCode[index]
                        ? "border-cyan-400 text-cyan-400"
                        : "border-white/20 text-white"
                    }`}
                    disabled={loading}
                  />
                </motion.div>
              ))}
            </div>

            {attempts > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2 text-yellow-500 mb-4"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="font-mono text-xs uppercase">
                  {attempts} Failed Attempt{attempts > 1 ? "s" : ""}
                </span>
              </motion.div>
            )}

            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"].map((num, i) => (
                <button
                  key={i}
                  data-testid={num !== null ? `lock-keypad-${num}` : undefined}
                  onClick={() => {
                    if (num === "del") {
                      const newCode = lockCode.slice(0, -1);
                      setLockCode(newCode);
                      const focusIndex = Math.max(0, newCode.length);
                      inputRefs.current[focusIndex]?.focus();
                    } else if (num !== null && lockCode.length < pinLength) {
                      handlePinInput(lockCode.length, String(num));
                    }
                  }}
                  disabled={loading || (num !== "del" && num !== null && lockCode.length >= pinLength)}
                  className={`h-14 font-mono text-xl transition-all duration-200 rounded-none ${
                    num === null
                      ? "invisible"
                      : num === "del"
                      ? "bg-transparent border border-white/10 text-gray-400 hover:text-red-500 hover:border-red-500/50"
                      : "bg-black/40 border border-white/10 text-white hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400"
                  }`}
                >
                  {num === "del" ? "←" : num}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="glass-effect p-8">
            <div className="relative mb-6">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                data-testid="lock-password-input"
                type="password"
                placeholder="Enter your password"
                value={lockCode}
                onChange={(e) => {
                  setLockCode(e.target.value);
                  setError(false);
                }}
                className={`pl-11 bg-black/50 border-2 h-14 font-mono text-lg rounded-none ${
                  error ? "border-red-500" : "border-white/20 focus:border-cyan-400"
                }`}
                disabled={loading}
                autoFocus
              />
            </div>

            {attempts > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2 text-yellow-500 mb-4"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="font-mono text-xs uppercase">
                  {attempts} Failed Attempt{attempts > 1 ? "s" : ""}
                </span>
              </motion.div>
            )}

            <Button
              data-testid="lock-submit-btn"
              type="submit"
              disabled={loading || lockCode.length < 6}
              className="w-full h-12 bg-cyan-500 text-black font-orbitron font-bold uppercase tracking-widest hover:bg-cyan-400 hover:shadow-neon-strong transition-all duration-200 rounded-none clip-corner"
            >
              {loading ? "Verifying..." : "Unlock"}
            </Button>
          </form>
        )}

        <p className="text-center text-gray-600 text-xs font-mono mt-8 uppercase tracking-widest">
          Locked by {user?.name}
        </p>
      </motion.div>
    </div>
  );
}
