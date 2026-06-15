import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, BarChart3, Settings, AlertCircle, Loader2 } from 'lucide-react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

// --- UTILS ---
const cn = (...classes) => classes.filter(Boolean).join(' ');

const hexToRgb = (hex) => {
  try {
    const h = hex || '#00d2ff';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 210, 255';
  } catch { return '0, 210, 255'; }
};

// --- CONTEXT & HOOKS ---
import { AuthProvider, useAuth } from './context/AuthContext';
import { useRegistry } from './hooks/useRegistry';

// --- SHARED COMPONENTS ---
import { TopBanner } from './components/layout/TopBanner';
import { LogoutModal } from './components/modals/Modals';
import { DashboardSkeleton } from './components/dashboard/DashboardSkeleton';
import { ProtocolFormOverlay } from './components/modals/ProtocolFormOverlay';
import { EditOverlay } from './components/modals/EditOverlay';

// --- LAZY LOADED SCREENS (Code Splitting) ---
const AuthScreen = lazy(() => import('./components/auth/AuthScreen').then(m => ({ default: m.AuthScreen })));
const TrackerCard = lazy(() => import('./components/dashboard/TrackerCard').then(m => ({ default: m.TrackerCard })));
const MetricBanner = lazy(() => import('./components/dashboard/MetricBanner').then(m => ({ default: m.MetricBanner })));
const HistoryScreen = lazy(() => import('./components/history/HistoryScreen').then(m => ({ default: m.HistoryScreen })));
const SettingsScreen = lazy(() => import('./components/settings/SettingsScreen').then(m => ({ default: m.SettingsScreen })));

// --- GLOBAL CONSTANTS ---
const APP_VERSION = "29.4.2-BOOT-RECOVERY";

// --- GLOBAL COMPONENTS ---

const LoadingView = () => (
  <div className="min-h-screen w-full bg-[#020202] flex flex-col items-center justify-center space-y-12 text-white font-inter font-black">
    <Loader2 className="animate-spin text-rose-600" size={100} strokeWidth={3} />
    <span className="text-sm font-black tracking-[1.5em] uppercase text-white/40 animate-pulse ml-[1.2em]">Synchronizing</span>
  </div>
);

const ErrorView = ({ msg }) => (
  <div className="min-h-screen w-full bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter">
    <AlertCircle className="text-danger mb-12" size={120} strokeWidth={2} />
    <h2 className="text-5xl font-[1000] uppercase tracking-tighter leading-none mb-8 font-inter">Sync Failure</h2>
    <p className="text-white/60 text-sm max-w-sm font-bold opacity-60 leading-relaxed uppercase tracking-widest mb-16 font-inter">{msg}</p>
    <button onClick={() => window.location.reload()} className="rounded-[32px] font-[1000] uppercase tracking-[0.6em] px-20 h-24 bg-white text-black shadow-2xl active:scale-95 transition-all font-inter font-black">Try Again</button>
  </div>
);

const NavBtn = React.memo(({ id, icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className="relative flex-1 py-3 flex flex-col items-center gap-1.5 group transition-all duration-500 font-inter">
    <div className={cn("absolute -top-3 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_12px_var(--accent)] transition-all duration-500", active ? "opacity-100 scale-100" : "opacity-0 scale-0")} />
    <Icon size={24} className={cn("transition-all duration-500", active ? "text-accent scale-110 drop-shadow-[0_0_100px_var(--accent-rgb)]" : "text-white/60 group-hover:text-white/90")} style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}} strokeWidth={active ? 3 : 2} />
    <span className={cn("text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 font-inter", active ? "text-white opacity-100" : "text-white/60 opacity-0 group-hover:opacity-90 translate-y-2 group-hover:translate-y-0 font-inter")}>{label}</span>
  </button>
));

// --- ERROR BOUNDARY ---
class GlobalErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("FATAL_APP_CRASH:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter">
          <div className="p-8 bg-danger/10 rounded-[32px] text-danger border border-danger/20 shadow-2xl mb-8"><AlertCircle size={48} /></div>
          <h2 className="text-3xl font-[1000] uppercase tracking-tighter leading-none mb-4 font-inter">System Error</h2>
          <p className="text-white/60 text-sm mb-10 max-w-md font-bold leading-relaxed">{this.state.error?.toString() || "Sync failed."}</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-10 h-18 rounded-full bg-white text-black font-black uppercase tracking-widest active:scale-95 transition-all shadow-2xl">Reset System</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- ARCHITECTURAL CORE ---

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState({
    accent: localStorage.getItem('tabak_accent') || '#D4FF32',
    widgetSize: 'LARGE',
    avatar: null
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const registry = useRegistry(user, today);

  const {
    configs, logs, metrics, loading: registryLoading, error: registryError,
    increment, decrement, reorder, addProtocol, updateProtocol, deleteProtocol
  } = registry || { configs: [], logs: [], metrics: {}, loading: true, error: null };

  const [activeTab, setActiveTab] = useState('track');
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editProtocol, setEditProtocol] = useState(null);
  const [showLogout, setShowLogout] = useState(false);

  // RESET UI STATE ON AUTH CHANGE
  useEffect(() => {
    if (!user) {
      setShowLogout(false);
      setShowAdd(false);
      setEditTarget(null);
      setEditProtocol(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (s) => {
      if (s.exists()) {
        const d = s.data();
        if (d.accent) localStorage.setItem('tabak_accent', d.accent);
        setSettings(p => ({
          ...p,
          accent: d.accent || '#D4FF32',
          widgetSize: d.widgetSize || 'LARGE',
          avatar: d.avatar || null
        }));
      }
      setIsHydrated(true);
    });
  }, [user]);

  const onUpdateSettings = useCallback(async (upd) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), upd);
      if (upd.accent) localStorage.setItem('tabak_accent', upd.accent);
    } catch (e) { console.error(e); }
  }, [user]);

  const handleAddProtocol = async (data) => {
    try { await addProtocol(data); setShowAdd(false); } catch (e) { alert(e.message); }
  };

  const handleUpdateProtocol = async (data) => {
    try { await updateProtocol(editProtocol.id, data); setEditProtocol(null); } catch (e) { alert(e.message); }
  };

  if (authLoading) return <LoadingView />;

  // DYNAMIC GRID CONFIGURATION BASED ON WIDGET SIZE
  const gridClasses = {
    SMALL: "grid-cols-2 lg:grid-cols-6 gap-4",
    MEDIUM: "grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6",
    LARGE: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
  };

  return (
    <div className="min-h-screen w-full bg-[#020202] text-white font-inter selection:bg-accent/30 overflow-x-hidden flex flex-col font-inter" style={{ '--accent': settings.accent, '--accent-rgb': hexToRgb(settings.accent) }}>
      {!user ? (
        <Suspense fallback={<LoadingView />}>
          <AuthScreen accent={settings.accent} />
        </Suspense>
      ) : (
        <>
          <TopBanner user={{...user, photoURL: settings.avatar || user.photoURL}} onNavigate={setActiveTab} widgetSize={settings.widgetSize} onUpdateSettings={onUpdateSettings} onRequestLogout={() => setShowLogout(true)} />

          <main className="flex-1 overflow-y-auto pt-8 pb-[calc(env(safe-area-inset-bottom)+10rem)] w-full transition-all duration-500 overflow-x-hidden font-inter">
            <div className="max-w-7xl mx-auto w-full px-4 lg:px-8">
              <Suspense fallback={<LoadingView />}>
                <AnimatePresence mode="wait">
                  {activeTab === 'track' && (
              <motion.div key="track" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8 font-inter min-h-[600px]">
                {!isHydrated || registryLoading ? (
                  <DashboardSkeleton widgetSize={settings.widgetSize} />
                ) : (
                  <>
                    <div className={cn("grid transition-all duration-500", gridClasses[settings.widgetSize] || gridClasses.LARGE)}>
                      {configs.sort((a,b)=>a.order-b.order).map((c, i) => (
                        <TrackerCard key={c.id} config={c} count={(metrics.todayLog?.counts || {})[c.id] || 0} onInc={() => increment(c.id)} onDec={() => decrement(c.id)} index={i} globalSize={settings.widgetSize} />
                      ))}
                    </div>
                    <div className="w-full">
                      <MetricBanner m={metrics} />
                    </div>
                  </>
                )}
              </motion.div>
            )}
                  {activeTab === 'history' && <HistoryScreen logs={logs} m={metrics} onEdit={setEditTarget} userId={user.uid} today={today} />}
                  {activeTab === 'control' && <SettingsScreen configs={configs} user={user} settings={settings} onAdd={() => setShowAdd(true)} onReo={reorder} onEditP={setEditProtocol} onUpd={onUpdateSettings} onDel={deleteProtocol} />}
                </AnimatePresence>
              </Suspense>
            </div>
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-[#020202]/80 backdrop-blur-3xl border-t border-white/[0.03] pb-[env(safe-area-inset-bottom)] px-6 font-inter">
            <div className="max-w-xl mx-auto flex items-center justify-around h-20">
              <NavBtn id="track" icon={LayoutGrid} label="Track" active={activeTab === 'track'} onClick={() => setActiveTab('track')} />
              <NavBtn id="history" icon={BarChart3} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
              <NavBtn id="control" icon={Settings} label="Settings" active={activeTab === 'control'} onClick={() => setActiveTab('control')} />
            </div>
          </nav>

          <AnimatePresence>
            {showLogout && (
              <LogoutModal
                isOpen={showLogout}
                onClose={() => setShowLogout(false)}
                onConfirm={() => { setShowLogout(false); auth.signOut(); }}
              />
            )}
            {showAdd && (
              <ProtocolFormOverlay
                isOpen={showAdd}
                onClose={() => setShowAdd(false)}
                onApply={handleAddProtocol}
                title="Create Counter"
              />
            )}
            {editProtocol && (
              <ProtocolFormOverlay
                isOpen={!!editProtocol}
                onClose={() => setEditProtocol(null)}
                onApply={handleUpdateProtocol}
                title="Configure Counter"
                initialData={editProtocol}
              />
            )}
            {editTarget && (
              <EditOverlay
                log={editTarget}
                configs={configs}
                onClose={() => setEditTarget(null)}
                user={user}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

const App = () => (
  <GlobalErrorBoundary>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </GlobalErrorBoundary>
);

export default App;
