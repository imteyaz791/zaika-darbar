import React, { useState, useEffect } from 'react';
import { auth, database, storage } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, set, get, remove, push, update, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { FiMenu, FiX, FiLogOut, FiHome, FiUsers, FiSettings, FiTrendingUp, FiDollarSign, FiDownload, FiPrinter, FiPlus, FiTrash2, FiEdit2, FiEye, FiEyeOff, FiSun, FiMoon, FiFilter, FiRefreshCw, FiLock, FiUnlock } from 'react-icons/fi';

const APP_NAME = "Zaika Darbar";
const CREDIT = "Imza Telecom by Imteyaz Khan";

// ============================================================================
// AUTHENTICATION COMPONENT
// ============================================================================
const AuthComponent = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile
        await set(ref(database, `users/${result.user.uid}`), {
          email: email,
          role: 'salesman',
          createdAt: new Date().toISOString(),
          status: 'active',
          counters: []
        });
        toast.success('Account created! Please sign in.');
        setIsSignUp(false);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const userSnap = await get(ref(database, `users/${result.user.uid}`));
        const userData = userSnap.val();
        
        if (userData && userData.status === 'active') {
          onAuthSuccess({
            uid: result.user.uid,
            email: email,
            role: userData.role,
            counters: userData.counters || [],
            name: userData.name || email.split('@')[0]
          });
          toast.success(`Welcome, ${userData.name || 'User'}!`);
        } else {
          toast.error('Account is inactive. Contact admin.');
          await signOut(auth);
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
              🍜 {APP_NAME}
            </div>
            <p className="text-gray-600 dark:text-gray-400">Restaurant Management Dashboard</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                placeholder="your@email.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 rounded-lg transition transform hover:scale-105 disabled:opacity-50"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>

            {/* Toggle */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-orange-600 dark:text-orange-400 font-semibold hover:underline"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
            {CREDIT}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
const MainDashboard = ({ user, onLogout }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [counters, setCounters] = useState([]);
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [partners, setPartners] = useState([]);
  const [filterMode, setFilterMode] = useState('all');
  const [filterDays, setFilterDays] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    loadCounters();
    loadUsers();
    loadPartners();
    loadTransactions();
  }, []);

  const loadCounters = async () => {
    const snap = await get(ref(database, 'counters'));
    setCounters(snap.val() ? Object.entries(snap.val()).map(([k, v]) => ({ id: k, ...v })) : []);
  };

  const loadUsers = async () => {
    const snap = await get(ref(database, 'users'));
    if (snap.val()) {
      setUsers(Object.entries(snap.val()).map(([k, v]) => ({ id: k, ...v })));
    }
  };

  const loadPartners = async () => {
    const snap = await get(ref(database, 'partners'));
    if (snap.val()) {
      setPartners(Object.entries(snap.val()).map(([k, v]) => ({ id: k, ...v })));
    }
  };

  const loadTransactions = async () => {
    const snap = await get(ref(database, 'transactions'));
    if (snap.val()) {
      setTransactions(Object.entries(snap.val()).map(([k, v]) => ({ id: k, ...v })));
    }
    setLoading(false);
  };

  // Check if user is admin
  const isAdmin = user.role === 'admin';

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Toaster position="top-right" />

        {/* ====== SIDEBAR ====== */}
        <motion.div
          initial={{ x: sidebarOpen ? 0 : -280 }}
          animate={{ x: sidebarOpen ? 0 : -280 }}
          className={`fixed md:relative w-64 h-full bg-gradient-to-b from-orange-600 to-red-600 dark:from-gray-800 dark:to-gray-900 text-white shadow-lg overflow-y-auto z-40`}
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <span className="text-3xl">🍜</span>
              <h1 className="text-xl font-bold">{APP_NAME}</h1>
            </div>

            {/* User Info */}
            <div className="mb-8 p-3 bg-white/20 rounded-lg">
              <p className="text-sm opacity-90">{user.email}</p>
              <p className="text-xs opacity-70 capitalize">{user.role}</p>
            </div>

            {/* Menu */}
            <nav className="space-y-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: FiHome },
                isAdmin && { id: 'counters', label: 'Manage Counters', icon: FiSettings },
                isAdmin && { id: 'users', label: 'Manage Users', icon: FiUsers },
                isAdmin && { id: 'partners', label: 'Partners', icon: FiUsers },
                { id: 'transactions', label: 'Transactions', icon: FiDollarSign },
                { id: 'reports', label: 'Reports & P&L', icon: FiTrendingUp },
                { id: 'backup', label: 'Backup & Export', icon: FiDownload }
              ].filter(Boolean).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                    currentPage === item.id
                      ? 'bg-white/30'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Logout */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
            >
              <FiLogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </motion.div>

        {/* ====== MAIN CONTENT ====== */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-gray-600 dark:text-gray-400"
            >
              {sidebarOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
            <h2 className="text-2xl font-bold">
              {currentPage === 'dashboard' && '📊 Dashboard'}
              {currentPage === 'counters' && '🏪 Manage Counters'}
              {currentPage === 'users' && '👥 Manage Users'}
              {currentPage === 'partners' && '🤝 Partners'}
              {currentPage === 'transactions' && '💰 Transactions'}
              {currentPage === 'reports' && '📈 Reports & P&L'}
              {currentPage === 'backup' && '💾 Backup & Export'}
            </h2>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
            >
              {darkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {currentPage === 'dashboard' && (
              <DashboardPage user={user} counters={counters} transactions={transactions} partners={partners} />
            )}
            {currentPage === 'counters' && isAdmin && (
              <CountersPage counters={counters} onUpdate={loadCounters} />
            )}
            {currentPage === 'users' && isAdmin && (
              <UsersPage users={users} onUpdate={loadUsers} />
            )}
            {currentPage === 'partners' && (
              <PartnersPage partners={partners} isAdmin={isAdmin} onUpdate={loadPartners} />
            )}
            {currentPage === 'transactions' && (
              <TransactionsPage 
                transactions={transactions} 
                counters={counters}
                user={user}
                onUpdate={loadTransactions}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                filterDays={filterDays}
                setFilterDays={setFilterDays}
              />
            )}
            {currentPage === 'reports' && (
              <ReportsPage transactions={transactions} counters={counters} partners={partners} />
            )}
            {currentPage === 'backup' && isAdmin && (
              <BackupPage transactions={transactions} counters={counters} users={users} partners={partners} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAGE COMPONENTS
// ============================================================================

// Dashboard Page
const DashboardPage = ({ user, counters, transactions, partners }) => {
  const todayTransactions = transactions.filter(t => {
    const tDate = new Date(t.date).toDateString();
    const today = new Date().toDateString();
    return tDate === today;
  });

  const totalReceived = todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const onlineTransactions = todayTransactions.filter(t => t.mode === 'online').length;
  const offlineTransactions = todayTransactions.filter(t => t.mode === 'offline').length;

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-500 to-red-500 dark:from-orange-600 dark:to-red-600 text-white rounded-2xl p-8 shadow-lg"
      >
        <h3 className="text-3xl font-bold mb-2">Welcome, {user.name}! 👋</h3>
        <p className="opacity-90">Ready to manage {APP_NAME}? Let's check today's performance.</p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon="💰"
          label="Today's Received"
          value={`₹${totalReceived.toLocaleString()}`}
          color="from-green-500 to-green-600"
        />
        <StatCard
          icon="🏪"
          label="Active Counters"
          value={counters.length}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          icon="📱"
          label="Online Transactions"
          value={onlineTransactions}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          icon="💵"
          label="Offline Transactions"
          value={offlineTransactions}
          color="from-yellow-500 to-yellow-600"
        />
      </div>

      {/* Counters Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
      >
        <h3 className="text-xl font-bold mb-4">📊 Counter Performance</h3>
        {counters.length === 0 ? (
          <p className="text-gray-500">No counters available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {counters.map((counter) => (
              <CounterPerformanceCard key={counter.id} counter={counter} transactions={todayTransactions} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
      >
        <h3 className="text-xl font-bold mb-4">📋 Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr className="text-gray-600 dark:text-gray-400">
                <th className="text-left py-3 px-4">Counter</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Mode</th>
                <th className="text-left py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {todayTransactions.slice(-5).reverse().map((t) => (
                <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4 font-medium">{counters.find(c => c.id === t.counterId)?.name || 'N/A'}</td>
                  <td className="py-3 px-4 text-green-600 dark:text-green-400 font-bold">₹{t.amount.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      t.mode === 'online' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {t.mode.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{new Date(t.date).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Footer Credit */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
        {CREDIT}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value, color }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`bg-gradient-to-br ${color} text-white rounded-xl p-6 shadow-lg`}
  >
    <div className="text-3xl mb-2">{icon}</div>
    <p className="text-sm opacity-90">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </motion.div>
);

// Counter Performance Card
const CounterPerformanceCard = ({ counter, transactions }) => {
  const counterTransactions = transactions.filter(t => t.counterId === counter.id);
  const totalAmount = counterTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const counterProfit = totalAmount * 0.6; // 60% for counter
  const ownerProfit = totalAmount * 0.4; // 40% for owner

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition">
      <h4 className="font-bold text-lg mb-3">{counter.name}</h4>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
          <span className="font-bold text-green-600 dark:text-green-400">₹{totalAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Counter (60%):</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">₹{counterProfit.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Owner (40%):</span>
          <span className="font-bold text-orange-600 dark:text-orange-400">₹{ownerProfit.toLocaleString()}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  );
};

// Counters Management Page
const CountersPage = ({ counters, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: '', status: 'active' });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await update(ref(database, `counters/${editingId}`), formData);
        toast.success('Counter updated!');
        setEditingId(null);
      } else {
        const newCounterRef = push(ref(database, 'counters'));
        await set(newCounterRef, { ...formData, createdAt: new Date().toISOString() });
        toast.success('Counter created!');
      }
      setFormData({ name: '', type: '', status: 'active' });
      setShowForm(false);
      onUpdate();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this counter?')) {
      try {
        await remove(ref(database, `counters/${id}`));
        toast.success('Counter deleted!');
        onUpdate();
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setShowForm(!showForm);
          setEditingId(null);
          setFormData({ name: '', type: '', status: 'active' });
        }}
        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition"
      >
        <FiPlus /> Add Counter
      </motion.button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Counter Name (e.g., Ice Cream Counter)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                  required
                />
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="ice-cream">Ice Cream</option>
                  <option value="chinese">Chinese</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="non-veg">Non-Veg</option>
                  <option value="beverages">Beverages</option>
                  <option value="desserts">Desserts</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition"
                >
                  {editingId ? 'Update Counter' : 'Create Counter'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {counters.map((counter) => (
          <motion.div
            key={counter.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 border-orange-500"
          >
            <h3 className="text-lg font-bold mb-2">{counter.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Type: {counter.type}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFormData(counter);
                  setEditingId(counter.id);
                  setShowForm(true);
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <FiEdit2 /> Edit
              </button>
              <button
                onClick={() => handleDelete(counter.id)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <FiTrash2 /> Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Users Management Page
const UsersPage = ({ users, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', role: 'salesman', status: 'active' });

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await update(ref(database, `users/${userId}`), { role: newRole });
      toast.success('User role updated!');
      onUpdate();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await update(ref(database, `users/${userId}`), { status: currentStatus === 'active' ? 'inactive' : 'active' });
      toast.success('User status updated!');
      onUpdate();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-700">
            <tr className="text-gray-600 dark:text-gray-400">
              <th className="text-left py-4 px-4">Email</th>
              <th className="text-left py-4 px-4">Role</th>
              <th className="text-left py-4 px-4">Status</th>
              <th className="text-left py-4 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="py-4 px-4 font-medium">{user.email}</td>
                <td className="py-4 px-4">
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                  >
                    <option value="salesman">Salesman</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.status === 'active' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <button
                    onClick={() => handleToggleStatus(user.id, user.status)}
                    className={`px-4 py-1 rounded-lg text-white text-sm font-semibold transition ${
                      user.status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {user.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Partners Management Page
const PartnersPage = ({ partners, isAdmin, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', share: 25, withdrawnAmount: 0 });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await update(ref(database, `partners/${editingId}`), formData);
        toast.success('Partner updated!');
      } else {
        const newPartnerRef = push(ref(database, 'partners'));
        await set(newPartnerRef, { ...formData, createdAt: new Date().toISOString() });
        toast.success('Partner added!');
      }
      setFormData({ name: '', email: '', share: 25, withdrawnAmount: 0 });
      setShowForm(false);
      setEditingId(null);
      onUpdate();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this partner?')) {
      try {
        await remove(ref(database, `partners/${id}`));
        toast.success('Partner removed!');
        onUpdate();
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ name: '', email: '', share: 25, withdrawnAmount: 0 });
          }}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
        >
          <FiPlus /> Add Partner
        </motion.button>
      )}

      <AnimatePresence>
        {showForm && isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Partner Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg"
                >
                  {editingId ? 'Update' : 'Add'} Partner
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partners.map((partner) => (
          <motion.div
            key={partner.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 border-green-500"
          >
            <h3 className="text-lg font-bold mb-2">{partner.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{partner.email}</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Share:</span>
                <span className="font-bold">{partner.share}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Withdrawn:</span>
                <span className="font-bold text-red-600">₹{partner.withdrawnAmount || 0}</span>
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFormData(partner);
                    setEditingId(partner.id);
                    setShowForm(true);
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <FiEdit2 /> Edit
                </button>
                <button
                  onClick={() => handleDelete(partner.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <FiTrash2 /> Remove
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Transactions Page
const TransactionsPage = ({ transactions, counters, user, onUpdate, filterMode, setFilterMode, filterDays, setFilterDays }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    counterId: '',
    amount: '',
    mode: 'offline',
    depositorName: '',
    description: '',
    type: 'income'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newTransactionRef = push(ref(database, 'transactions'));
      await set(newTransactionRef, {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date().toISOString(),
        userId: user.uid,
        userName: user.email
      });
      toast.success('Transaction recorded!');
      setFormData({
        counterId: '',
        amount: '',
        mode: 'offline',
        depositorName: '',
        description: '',
        type: 'income'
      });
      setShowForm(false);
      onUpdate();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Filter transactions
  let filtered = transactions;
  if (filterMode === 'online') filtered = filtered.filter(t => t.mode === 'online');
  if (filterMode === 'offline') filtered = filtered.filter(t => t.mode === 'offline');
  if (filterDays > 0) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - filterDays);
    filtered = filtered.filter(t => new Date(t.date) >= startDate);
  }

  return (
    <div className="space-y-6">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowForm(!showForm)}
        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
      >
        <FiPlus /> Record Transaction
      </motion.button>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg flex gap-4 flex-wrap items-center">
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
        >
          <option value="all">All Modes</option>
          <option value="online">Online Only</option>
          <option value="offline">Offline Only</option>
        </select>
        <select
          value={filterDays}
          onChange={(e) => setFilterDays(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
        >
          <option value={0}>All Time</option>
          <option value={1}>Last 24 Hours</option>
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={formData.counterId}
                  onChange={(e) => setFormData({ ...formData, counterId: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                  required
                >
                  <option value="">Select Counter</option>
                  {counters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                  required
                />
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>
                <input
                  type="text"
                  placeholder="Depositor Name"
                  value={formData.depositorName}
                  onChange={(e) => setFormData({ ...formData, depositorName: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                />
              </div>
              <textarea
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
              />
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg"
                >
                  Record Transaction
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-700">
            <tr className="text-gray-600 dark:text-gray-400">
              <th className="text-left py-4 px-4">Counter</th>
              <th className="text-left py-4 px-4">Amount</th>
              <th className="text-left py-4 px-4">Mode</th>
              <th className="text-left py-4 px-4">Depositor</th>
              <th className="text-left py-4 px-4">Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice().reverse().map((t) => (
              <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="py-4 px-4 font-medium">{counters.find(c => c.id === t.counterId)?.name || 'N/A'}</td>
                <td className="py-4 px-4 text-green-600 dark:text-green-400 font-bold">₹{t.amount.toLocaleString()}</td>
                <td className="py-4 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    t.mode === 'online' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                  }`}>
                    {t.mode.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-4">{t.depositorName || '-'}</td>
                <td className="py-4 px-4 text-gray-500 dark:text-gray-400 text-xs">{new Date(t.date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Reports & P&L Page
const ReportsPage = ({ transactions, counters, partners }) => {
  const todayTransactions = transactions.filter(t => {
    const tDate = new Date(t.date).toDateString();
    const today = new Date().toDateString();
    return tDate === today;
  });

  const totalRevenue = todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const counterShare = totalRevenue * 0.6;
  const ownerShare = totalRevenue * 0.4;

  const counterData = counters.map((counter) => {
    const counterTransactions = todayTransactions.filter(t => t.counterId === counter.id);
    const amount = counterTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    return {
      name: counter.name,
      revenue: amount,
      countershare: amount * 0.6,
      ownershare: amount * 0.4
    };
  });

  const modeData = [
    {
      name: 'Online',
      value: todayTransactions.filter(t => t.mode === 'online').reduce((sum, t) => sum + (t.amount || 0), 0),
      count: todayTransactions.filter(t => t.mode === 'online').length
    },
    {
      name: 'Offline',
      value: todayTransactions.filter(t => t.mode === 'offline').reduce((sum, t) => sum + (t.amount || 0), 0),
      count: todayTransactions.filter(t => t.mode === 'offline').length
    }
  ];

  const COLORS = ['#8B5CF6', '#F59E0B'];

  return (
    <div className="space-y-6">
      {/* P&L Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl p-8 shadow-lg"
      >
        <h3 className="text-2xl font-bold mb-6">📈 Today's P&L Statement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm opacity-90 mb-2">Total Revenue</p>
            <p className="text-4xl font-bold">₹{totalRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm opacity-90 mb-2">Counter Share (60%)</p>
            <p className="text-4xl font-bold">₹{counterShare.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm opacity-90 mb-2">Owner Share (40%)</p>
            <p className="text-4xl font-bold">₹{ownerShare.toLocaleString()}</p>
          </div>
        </div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mode Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
        >
          <h3 className="text-xl font-bold mb-4">Payment Mode Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={modeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                {modeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Counter Revenue */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
        >
          <h3 className="text-xl font-bold mb-4">Counter Revenue Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={counterData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip />
              <Legend />
              <Bar dataKey="countershare" fill="#3B82F6" name="Counter (60%)" />
              <Bar dataKey="ownershare" fill="#F59E0B" name="Owner (40%)" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Detailed Counter Report */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
      >
        <h3 className="text-xl font-bold mb-4">📊 Counter-wise Detailed Report</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr className="text-gray-600 dark:text-gray-400">
                <th className="text-left py-4 px-4">Counter</th>
                <th className="text-left py-4 px-4">Total Revenue</th>
                <th className="text-left py-4 px-4">Counter (60%)</th>
                <th className="text-left py-4 px-4">Owner (40%)</th>
                <th className="text-left py-4 px-4">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {counterData.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-4 px-4 font-medium">{row.name}</td>
                  <td className="py-4 px-4 text-green-600 dark:text-green-400 font-bold">₹{row.revenue.toLocaleString()}</td>
                  <td className="py-4 px-4 text-blue-600 dark:text-blue-400 font-bold">₹{row.countershare.toLocaleString()}</td>
                  <td className="py-4 px-4 text-orange-600 dark:text-orange-400 font-bold">₹{row.ownershare.toLocaleString()}</td>
                  <td className="py-4 px-4">{todayTransactions.filter(t => t.counterId === counters.find(c => c.name === row.name)?.id).length}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold bg-gray-50 dark:bg-gray-700">
                <td className="py-4 px-4">TOTAL</td>
                <td className="py-4 px-4 text-green-600 dark:text-green-400">₹{totalRevenue.toLocaleString()}</td>
                <td className="py-4 px-4 text-blue-600 dark:text-blue-400">₹{counterShare.toLocaleString()}</td>
                <td className="py-4 px-4 text-orange-600 dark:text-orange-400">₹{ownerShare.toLocaleString()}</td>
                <td className="py-4 px-4">{todayTransactions.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Print Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => window.print()}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
      >
        <FiPrinter /> Print Report
      </motion.button>
    </div>
  );
};

// Backup & Export Page
const BackupPage = ({ transactions, counters, users, partners }) => {
  const handleBackup = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      transactions,
      counters,
      users,
      partners,
      version: '1.0'
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zaika-darbar-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    toast.success('Backup downloaded!');
  };

  const handleExportCSV = () => {
    let csv = 'Counter,Amount,Mode,Depositor,Date,Time,UserId\n';
    transactions.forEach(t => {
      const date = new Date(t.date);
      csv += `"${counters.find(c => c.id === t.counterId)?.name || 'N/A'}",${t.amount},"${t.mode}","${t.depositorName || ''}","${date.toLocaleDateString()}","${date.toLocaleTimeString()}","${t.userId}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zaika-darbar-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exported!');
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl p-8 shadow-lg"
      >
        <h3 className="text-2xl font-bold mb-4">💾 Backup & Data Export</h3>
        <p className="mb-6 opacity-90">Securely backup your restaurant data and export for analysis.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBackup}
            className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <FiDownload /> Download JSON Backup
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportCSV}
            className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <FiDownload /> Export as CSV
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
      >
        <h3 className="text-xl font-bold mb-4">📊 Data Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="💰" label="Total Transactions" value={transactions.length} color="from-green-500 to-green-600" />
          <StatCard icon="🏪" label="Counters" value={counters.length} color="from-blue-500 to-blue-600" />
          <StatCard icon="👥" label="Users" value={users.length} color="from-purple-500 to-purple-600" />
          <StatCard icon="🤝" label="Partners" value={partners.length} color="from-orange-500 to-orange-600" />
        </div>
      </motion.div>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
        {CREDIT}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      toast.success('Logged out successfully!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🍜</div>
          <p className="text-gray-600 dark:text-gray-400">Loading Zaika Darbar...</p>
        </div>
      </div>
    );
  }

  return user ? <MainDashboard user={user} onLogout={handleLogout} /> : <AuthComponent onAuthSuccess={setUser} />;
}
