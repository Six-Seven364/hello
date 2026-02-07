import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  ArrowLeft,
  Lock,
  Download,
  Key,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Settings({ user, onLogout, onLockCodeSet }) {
  const navigate = useNavigate();
  const [lockType, setLockType] = useState(user?.lock_type || "pin4");
  const [lockCode, setLockCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportData, setExportData] = useState(null);
  const [showExportQR, setShowExportQR] = useState(false);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("gridlock_token")}` },
  });

  const handleSetLockCode = async (e) => {
    e.preventDefault();

    if (lockCode !== confirmCode) {
      toast.error("Codes do not match");
      return;
    }

    if (lockType === "pin4" && (lockCode.length !== 4 || !/^\d+$/.test(lockCode))) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    if (lockType === "pin6" && (lockCode.length !== 6 || !/^\d+$/.test(lockCode))) {
      toast.error("PIN must be exactly 6 digits");
      return;
    }

    if (lockType === "password" && lockCode.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/lock/setup`,
        { lock_type: lockType, lock_code: lockCode },
        getAuthHeader()
      );
      toast.success("Lock code set successfully");
      onLockCodeSet(lockType);
      setLockCode("");
      setConfirmCode("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to set lock code");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/export/all`, getAuthHeader());
      setExportData(response.data);
      setShowExportQR(true);
      toast.success("Export data generated");
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const downloadExport = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gridlock-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  return (
    <div className="min-h-screen bg-[#050505] relative">
      <div className="absolute inset-0 grid-bg opacity-10" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            data-testid="settings-back-btn"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-gray-400 hover:text-cyan-400 rounded-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" />
            <h1 className="font-orbitron font-bold text-lg text-white">SETTINGS</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* User Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect p-6"
        >
          <h2 className="font-orbitron text-cyan-400 uppercase tracking-widest text-sm mb-4">
            Identity
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-mono text-sm">Name</span>
              <span className="text-white font-mono">{user?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-mono text-sm">Email</span>
              <span className="text-white font-mono">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-mono text-sm">Lock Status</span>
              <span className={`font-mono ${user?.has_lock_code ? "text-green-400" : "text-yellow-400"}`}>
                {user?.has_lock_code ? `Active (${user.lock_type?.toUpperCase()})` : "Not Set"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Lock Code Setup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-effect p-6"
        >
          <h2 className="font-orbitron text-cyan-400 uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {user?.has_lock_code ? "Update Lock Code" : "Setup Lock Code"}
          </h2>

          <form onSubmit={handleSetLockCode} className="space-y-4">
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono mb-2 block">
                Lock Type
              </Label>
              <Select value={lockType} onValueChange={setLockType}>
                <SelectTrigger
                  data-testid="settings-lock-type-select"
                  className="bg-black/50 border-white/20 rounded-none font-mono"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-none">
                  <SelectItem value="pin4" className="font-mono">4-Digit PIN</SelectItem>
                  <SelectItem value="pin6" className="font-mono">6-Digit PIN</SelectItem>
                  <SelectItem value="password" className="font-mono">Password</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono mb-2 block">
                {lockType === "password" ? "Password" : "PIN"}
              </Label>
              <div className="relative">
                <Input
                  data-testid="settings-lock-code-input"
                  type={showCode ? "text" : "password"}
                  value={lockCode}
                  onChange={(e) => setLockCode(e.target.value)}
                  placeholder={
                    lockType === "pin4"
                      ? "••••"
                      : lockType === "pin6"
                      ? "••••••"
                      : "Enter password"
                  }
                  maxLength={lockType === "pin4" ? 4 : lockType === "pin6" ? 6 : undefined}
                  inputMode={lockType !== "password" ? "numeric" : undefined}
                  pattern={lockType !== "password" ? "\\d*" : undefined}
                  className="bg-black/50 border-white/20 focus:border-cyan-400 rounded-none font-mono pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-400"
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono mb-2 block">
                Confirm {lockType === "password" ? "Password" : "PIN"}
              </Label>
              <Input
                data-testid="settings-confirm-code-input"
                type={showCode ? "text" : "password"}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="Confirm"
                maxLength={lockType === "pin4" ? 4 : lockType === "pin6" ? 6 : undefined}
                inputMode={lockType !== "password" ? "numeric" : undefined}
                pattern={lockType !== "password" ? "\\d*" : undefined}
                className="bg-black/50 border-white/20 focus:border-cyan-400 rounded-none font-mono"
                required
              />
            </div>

            <Button
              data-testid="settings-save-lock-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 text-black hover:bg-cyan-400 rounded-none font-orbitron uppercase tracking-widest clip-corner"
            >
              {loading ? "Saving..." : user?.has_lock_code ? "Update Lock Code" : "Set Lock Code"}
            </Button>
          </form>
        </motion.div>

        {/* Export Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-effect p-6"
        >
          <h2 className="font-orbitron text-cyan-400 uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </h2>

          <p className="text-gray-500 font-mono text-sm mb-4">
            Export all your authenticators and passwords as a backup file or QR code.
          </p>

          <div className="flex gap-3">
            <Button
              data-testid="settings-export-btn"
              onClick={handleExport}
              variant="outline"
              className="flex-1 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 rounded-none font-orbitron uppercase tracking-widest text-xs"
            >
              Generate Export
            </Button>
            {exportData && (
              <Button
                data-testid="settings-download-btn"
                onClick={downloadExport}
                className="flex-1 bg-cyan-500 text-black hover:bg-cyan-400 rounded-none font-orbitron uppercase tracking-widest text-xs clip-corner"
              >
                Download JSON
              </Button>
            )}
          </div>

          {showExportQR && exportData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-6 pt-6 border-t border-white/10"
            >
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 mb-4">
                  <QRCodeSVG
                    value={JSON.stringify({
                      type: "gridlock-backup",
                      accounts: exportData.totp_accounts?.length || 0,
                      passwords: exportData.password_entries?.length || 0,
                      exported_at: exportData.exported_at,
                    })}
                    size={150}
                    level="M"
                  />
                </div>
                <p className="text-gray-500 text-xs font-mono text-center">
                  {exportData.totp_accounts?.length || 0} authenticators • {exportData.password_entries?.length || 0} passwords
                </p>
                <p className="text-gray-600 text-xs font-mono mt-1">
                  Download the JSON file for full backup
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-effect p-6 border-red-500/20"
        >
          <h2 className="font-orbitron text-red-500 uppercase tracking-widest text-sm mb-4">
            Danger Zone
          </h2>

          <Button
            data-testid="settings-logout-btn"
            onClick={onLogout}
            variant="outline"
            className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 rounded-none font-orbitron uppercase tracking-widest text-xs"
          >
            Sign Out
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
