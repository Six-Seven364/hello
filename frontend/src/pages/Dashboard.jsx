import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Key,
  Plus,
  Settings,
  LogOut,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  QrCode,
  Lock,
  RefreshCw,
  ScanLine,
  X,
  Globe,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { Scanner } from "@yudiel/react-qr-scanner";
import { QRCodeSVG } from "qrcode.react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function TOTPCard({ account, onDelete, onShowQR }) {
  const [timeRemaining, setTimeRemaining] = useState(account.time_remaining);
  const [currentCode, setCurrentCode] = useState(account.current_code);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setTimeRemaining(remaining);

      if (remaining === 30) {
        setCurrentCode(account.next_code);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [account.next_code]);

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const progress = (timeRemaining / 30) * 100;
  const color =
    timeRemaining <= 5
      ? "#FF003C"
      : timeRemaining <= 10
      ? "#FCEE0A"
      : "#00F0FF";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-black/40 border border-white/10 p-6 hover:border-cyan-500/30 transition-all duration-300 group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
        <motion.div
          className="h-full"
          style={{ backgroundColor: color }}
          initial={{ width: `${progress}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-orbitron font-bold text-white text-lg">{account.issuer}</h3>
          <p className="text-gray-500 text-sm font-mono">{account.name}</p>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            data-testid={`totp-qr-btn-${account.id}`}
            onClick={() => onShowQR(account)}
            className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            data-testid={`totp-delete-btn-${account.id}`}
            onClick={() => onDelete(account.id)}
            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <button
        data-testid={`totp-code-${account.id}`}
        onClick={copyCode}
        className="w-full text-left"
      >
        <div className="totp-code tracking-[0.5rem] mb-2" style={{ color }}>
          {currentCode.slice(0, 3)} {currentCode.slice(3)}
        </div>
      </button>

      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs font-mono uppercase">
          {copied ? "Copied!" : "Click to copy"}
        </span>
        <div className="flex items-center gap-2">
          <RefreshCw
            className="w-3 h-3"
            style={{ color }}
          />
          <span className="font-mono text-sm" style={{ color }}>
            {timeRemaining}s
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function PasswordCard({ entry, onDelete, onView }) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(`${type} copied`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-black/40 border border-white/10 p-4 hover:border-cyan-500/30 transition-all duration-300 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-orbitron font-bold text-white">{entry.name}</h3>
            <p className="text-gray-500 text-xs font-mono">{entry.url || "No URL"}</p>
          </div>
        </div>
        <button
          data-testid={`vault-delete-btn-${entry.id}`}
          onClick={() => onDelete(entry.id)}
          className="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between bg-black/30 p-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-mono text-sm text-gray-300">{entry.username}</span>
          </div>
          <button
            data-testid={`vault-copy-username-${entry.id}`}
            onClick={() => copyToClipboard(entry.username, "Username")}
            className="p-1 text-gray-500 hover:text-cyan-400 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between bg-black/30 p-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="font-mono text-sm text-gray-300">
              {showPassword ? entry.password : "••••••••••"}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              data-testid={`vault-toggle-password-${entry.id}`}
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-gray-500 hover:text-cyan-400 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              data-testid={`vault-copy-password-${entry.id}`}
              onClick={() => copyToClipboard(entry.password, "Password")}
              className="p-1 text-gray-500 hover:text-cyan-400 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("totp");
  const [totpAccounts, setTotpAccounts] = useState([]);
  const [passwordEntries, setPasswordEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showScannerDialog, setShowScannerDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [addType, setAddType] = useState("totp");

  const [totpForm, setTotpForm] = useState({ name: "", issuer: "", secret: "" });
  const [vaultForm, setVaultForm] = useState({
    name: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("gridlock_token")}` },
  });

  const fetchData = useCallback(async () => {
    try {
      const [totpRes, vaultRes] = await Promise.all([
        axios.get(`${API}/totp/accounts`, getAuthHeader()),
        axios.get(`${API}/vault/entries`, getAuthHeader()),
      ]);
      setTotpAccounts(totpRes.data);
      setPasswordEntries(vaultRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAddTOTP = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/totp/accounts`, totpForm, getAuthHeader());
      setTotpAccounts((prev) => [...prev, response.data]);
      setShowAddDialog(false);
      setTotpForm({ name: "", issuer: "", secret: "" });
      toast.success("Authenticator added");
    } catch (error) {
      toast.error("Failed to add authenticator");
    }
  };

  const handleAddPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/vault/entries`, vaultForm, getAuthHeader());
      setPasswordEntries((prev) => [...prev, response.data]);
      setShowAddDialog(false);
      setVaultForm({ name: "", username: "", password: "", url: "", notes: "" });
      toast.success("Password saved");
    } catch (error) {
      toast.error("Failed to save password");
    }
  };

  const handleDeleteTOTP = async (id) => {
    try {
      await axios.delete(`${API}/totp/accounts/${id}`, getAuthHeader());
      setTotpAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Authenticator deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleDeletePassword = async (id) => {
    try {
      await axios.delete(`${API}/vault/entries/${id}`, getAuthHeader());
      setPasswordEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Entry deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleQRScan = async (result) => {
    if (result && result[0]?.rawValue) {
      const uri = result[0].rawValue;
      try {
        const response = await axios.post(`${API}/totp/parse-qr`, { uri }, getAuthHeader());
        setTotpForm({
          name: response.data.name,
          issuer: response.data.issuer,
          secret: response.data.secret,
        });
        setShowScannerDialog(false);
        setAddType("totp");
        setShowAddDialog(true);
        toast.success("QR Code scanned successfully");
      } catch (error) {
        toast.error("Invalid QR Code");
      }
    }
  };

  const showAccountQR = (account) => {
    setSelectedAccount(account);
    setShowQRDialog(true);
  };

  return (
    <div className="min-h-screen bg-[#050505] relative">
      <div className="absolute inset-0 grid-bg opacity-10" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="w-8 h-8 text-cyan-400 neon-glow" />
            <h1 className="font-orbitron font-bold text-xl text-white">GRIDLOCK</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-400 font-mono text-sm hidden sm:block">
              {user?.email}
            </span>
            <Button
              data-testid="nav-settings-btn"
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-gray-400 hover:text-cyan-400 rounded-none"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              data-testid="nav-logout-btn"
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="text-gray-400 hover:text-red-500 rounded-none"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-8">
            <TabsList className="bg-black/40 border border-white/10 p-1 rounded-none">
              <TabsTrigger
                data-testid="tab-totp"
                value="totp"
                className="font-orbitron uppercase tracking-widest text-xs data-[state=active]:bg-cyan-500 data-[state=active]:text-black rounded-none px-6"
              >
                <Key className="w-4 h-4 mr-2" />
                Authenticator
              </TabsTrigger>
              <TabsTrigger
                data-testid="tab-vault"
                value="vault"
                className="font-orbitron uppercase tracking-widest text-xs data-[state=active]:bg-cyan-500 data-[state=active]:text-black rounded-none px-6"
              >
                <Lock className="w-4 h-4 mr-2" />
                Vault
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button
                data-testid="scan-qr-btn"
                onClick={() => setShowScannerDialog(true)}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 rounded-none font-orbitron uppercase tracking-widest text-xs"
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Scan QR
              </Button>
              <Button
                data-testid="add-new-btn"
                onClick={() => {
                  setAddType(activeTab);
                  setShowAddDialog(true);
                }}
                className="bg-cyan-500 text-black hover:bg-cyan-400 rounded-none font-orbitron uppercase tracking-widest text-xs clip-corner"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </Button>
            </div>
          </div>

          <TabsContent value="totp" className="mt-0">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-black/40 border border-white/10 p-6 animate-pulse">
                    <div className="h-4 bg-white/10 w-1/2 mb-4" />
                    <div className="h-8 bg-white/10 w-3/4 mb-4" />
                    <div className="h-3 bg-white/10 w-1/4" />
                  </div>
                ))}
              </div>
            ) : totpAccounts.length === 0 ? (
              <div className="text-center py-20">
                <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="font-orbitron text-xl text-gray-400 mb-2">No Authenticators</h3>
                <p className="text-gray-600 font-mono text-sm mb-6">
                  Add your first 2FA account to get started
                </p>
                <Button
                  data-testid="empty-add-totp-btn"
                  onClick={() => {
                    setAddType("totp");
                    setShowAddDialog(true);
                  }}
                  className="bg-cyan-500 text-black hover:bg-cyan-400 rounded-none font-orbitron uppercase tracking-widest clip-corner"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Authenticator
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {totpAccounts.map((account) => (
                    <TOTPCard
                      key={account.id}
                      account={account}
                      onDelete={handleDeleteTOTP}
                      onShowQR={showAccountQR}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="vault" className="mt-0">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-black/40 border border-white/10 p-4 animate-pulse">
                    <div className="h-4 bg-white/10 w-1/2 mb-4" />
                    <div className="h-8 bg-white/10 w-full mb-2" />
                    <div className="h-8 bg-white/10 w-full" />
                  </div>
                ))}
              </div>
            ) : passwordEntries.length === 0 ? (
              <div className="text-center py-20">
                <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="font-orbitron text-xl text-gray-400 mb-2">Vault Empty</h3>
                <p className="text-gray-600 font-mono text-sm mb-6">
                  Store your passwords securely
                </p>
                <Button
                  data-testid="empty-add-vault-btn"
                  onClick={() => {
                    setAddType("vault");
                    setShowAddDialog(true);
                  }}
                  className="bg-cyan-500 text-black hover:bg-cyan-400 rounded-none font-orbitron uppercase tracking-widest clip-corner"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Password
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                  {passwordEntries.map((entry) => (
                    <PasswordCard
                      key={entry.id}
                      entry={entry}
                      onDelete={handleDeletePassword}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#0A0A0A] border border-white/10 rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-cyan-400 uppercase tracking-widest">
              Add {addType === "totp" ? "Authenticator" : "Password"}
            </DialogTitle>
          </DialogHeader>

          {addType === "totp" ? (
            <form onSubmit={handleAddTOTP} className="space-y-4">
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono">
                  Account Name
                </Label>
                <Input
                  data-testid="add-totp-name"
                  value={totpForm.name}
                  onChange={(e) => setTotpForm({ ...totpForm, name: e.target.value })}
                  placeholder="user@example.com"
                  className="bg-black/50 border-white/20 focus:border-cyan-400 rounded-none font-mono mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono">
                  Issuer
                </Label>
                <Input
                  data-testid="add-totp-issuer"
                  value={totpForm.issuer}
                  onChange={(e) => setTotpForm({ ...totpForm, issuer: e.target.value })}
                  placeholder="Google, GitHub, etc."
                  className="bg-black/50 border-white/20 focus:border-cyan-400 rounded-none font-mono mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono">
                  Secret Key (Optional)
                </Label>
                <Input
                  data-testid="add-totp-secret"
                  value={totpForm.secret}
                  onChange={(e) => setTotpForm({ ...totpForm, secret: e.target.value })}
                  placeholder="Leave empty to auto-generate"
                  className="bg-black/50 border-white/20 focus:border-cyan-400 rounded-none font-mono mt-1"
                />
              </div>
              <Button
                data-testid="add-totp-submit"
                type="submit"
                className="w-full bg-cyan-500 text-black hover:bg-cyan-400 rounded-none font-orbitron uppercase tracking-widest clip-corner"
              >
                Add Authenticator
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAddPassword} className="space-y-4">
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono">
                  Name
                </Label>
                <Input
                  data-testid="add-vault-name"
                  value={vaultForm.name}
                  onChange={(e) => setVaultForm({ ...vaultForm, name: e.target.value })}
                  placeholder="My Account"
                  className="bg-black/50 border-white/20 focus:border-cyan-400 rounded-none font-mono mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono">
                  Username / Email
                </Label>
                <Input
                  data-testid="add-vault-username"
                  value={vaultForm.username}
                  onChange={(e) => setVaultForm({ ...vaultForm, username: e.target.value })}
                  placeholder="user@example.com"
                  className="bg-black/50 border-white/20 focus:border-cyan-400 rounded-none font-mono mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono">
                  Password
                </Label>
                <Input
                  data-testid="add-vault-password"
                  type="password"
                  value={vaultForm.password}
                  onChange={(e) => setVaultForm({ ...vaultForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="bg-black/50 border-white/20 focus:border-cyan-400 rounded-none font-mono mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-widest font-mono">
                  URL (Optional)
                </Label>
                <Input
                  data-testid="add-vault-url"
                  value={vaultForm.url}
                  onChange={(e) => setVaultForm({ ...vaultForm, url: e.target.value })}
                  placeholder="https://example.com"
                  className="bg-black/50 border-white/20 focus:border-cyan-400 rounded-none font-mono mt-1"
                />
              </div>
              <Button
                data-testid="add-vault-submit"
                type="submit"
                className="w-full bg-cyan-500 text-black hover:bg-cyan-400 rounded-none font-orbitron uppercase tracking-widest clip-corner"
              >
                Save Password
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="bg-[#0A0A0A] border border-white/10 rounded-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-cyan-400 uppercase tracking-widest text-center">
              Export QR Code
            </DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div className="flex flex-col items-center p-4">
              <div className="bg-white p-4 mb-4">
                <QRCodeSVG
                  value={`otpauth://totp/${encodeURIComponent(selectedAccount.issuer)}:${encodeURIComponent(selectedAccount.name)}?secret=${selectedAccount.secret || "PLACEHOLDER"}&issuer=${encodeURIComponent(selectedAccount.issuer)}`}
                  size={200}
                  level="H"
                />
              </div>
              <p className="text-gray-400 font-mono text-sm text-center">
                {selectedAccount.issuer} - {selectedAccount.name}
              </p>
              <p className="text-gray-600 text-xs font-mono mt-2 text-center">
                Scan this QR code to transfer the account
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Scanner Dialog */}
      <Dialog open={showScannerDialog} onOpenChange={setShowScannerDialog}>
        <DialogContent className="bg-[#0A0A0A] border border-white/10 rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-cyan-400 uppercase tracking-widest">
              Scan QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <div className="aspect-square w-full overflow-hidden border border-cyan-500/30">
              <Scanner
                onScan={handleQRScan}
                onError={(error) => console.error(error)}
                constraints={{ facingMode: "environment" }}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { width: "100%", height: "100%", objectFit: "cover" },
                }}
              />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-2 border-cyan-400/30" />
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cyan-400/50 animate-scan" />
              </div>
            </div>
            <p className="text-gray-500 text-xs font-mono text-center mt-4 uppercase">
              Position QR code within the frame
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
