import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db,
  handleFirestoreError,
  OperationType
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { 
  FileText, 
  Shield, 
  Scale, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Search, 
  User, 
  LogOut,
  ChevronRight,
  MessageSquare,
  Award,
  Briefcase,
  Star,
  Clock,
  Moon,
  Sun,
  Lock,
  Unlock,
  Ban,
  DollarSign,
  Activity,
  Send,
  BarChart2,
  PieChart as PieChartIcon,
  Zap,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  analyzeContract, 
  simulateOutcome, 
  calculateInitialRating, 
  updateLawyerRating, 
  chatWithContract,
  findClosestDomain
} from './services/geminiService';
import { useDropzone } from 'react-dropzone';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Role = 'user' | 'lawyer' | 'admin';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  plan?: 'base' | 'pro';
  analysesThisMonth?: number;
  lastAnalysisReset?: any;
  blockedUntil?: any;
  isPermanentlyBlocked?: boolean;
}

interface Contract {
  id: string;
  ownerId: string;
  fileName: string;
  content: string;
  type: string;
  status: 'analyzing' | 'completed' | 'review_requested' | 'review_accepted' | 'review_ready' | 'reviewed';
  grade?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  lawyerFee?: number;
  platformFee?: number;
  aiAnalysis?: any;
  lawyerReviewId?: string;
  lawyerReview?: {
    content: string;
    recommendation: string;
    createdAt: string;
    lawyerId: string;
  };
  hasTrustSeal?: boolean;
  createdAt: any;
}

interface LawyerProfile {
  uid: string;
  qualifications: string;
  licenseNumber: string;
  history: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  domain: string;
  price: number;
  rating: number;
  reviewCount: number;
  casesWon: number;
  casesLost: number;
  maxActiveContracts?: number;
  activeContractsCount?: number;
  priceLimit?: { min: number, max: number };
  immutableFieldsVerified?: boolean;
  skillScore?: number;
  urgentPrice?: number;
  consultationPrice?: number;
  workingHours?: string;
  avgResponseTime?: string;
  maxRequestsPerDay?: number;
}

interface Payment {
  id: string;
  userId: string;
  lawyerId: string;
  contractId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: any;
}

interface AdminActivity {
  id: string;
  type: 'user_blocked' | 'lawyer_verified' | 'payment_received' | 'rating_changed' | 'contract_uploaded';
  description: string;
  metadata?: any;
  createdAt: any;
}

// --- Components ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse((this.state.error as any).message);
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = (this.state.error as any).message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center space-y-4">
            <XCircle className="text-red-600 mx-auto" size={48} />
            <h2 className="text-2xl font-bold text-slate-900">Application Error</h2>
            <p className="text-slate-600">{errorMessage}</p>
            <Button className="w-full" onClick={() => window.location.reload()}>Reload Application</Button>
          </Card>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const Button = ({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm dark:bg-indigo-500 dark:hover:bg-indigo-600',
    secondary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm dark:bg-emerald-500 dark:hover:bg-emerald-600',
    outline: 'border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm dark:bg-red-500 dark:hover:bg-red-600',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm dark:bg-emerald-500 dark:hover:bg-emerald-600',
  };
  return (
    <button 
      className={cn('px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2', variants[variant], className)} 
      {...props} 
    />
  );
};

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800', className)} {...props}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) => {
  const variants = {
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider', variants[variant])}>
      {children}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'landing' | 'dashboard' | 'analysis' | 'marketplace' | 'lawyer-reg' | 'lawyer-dashboard' | 'admin-dashboard'>('landing');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [pendingLawyers, setPendingLawyers] = useState<LawyerProfile[]>([]);
  const [lawyerProfile, setLawyerProfile] = useState<LawyerProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allLawyers, setAllLawyers] = useState<LawyerProfile[]>([]);
  const [adminTab, setAdminTab] = useState<'activity' | 'users' | 'lawyers' | 'transactions'>('activity');
  const [dashboardTab, setDashboardTab] = useState<'all' | 'requests'>('all');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [isBlockingModalOpen, setIsBlockingModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [targetToBlock, setTargetToBlock] = useState<{ uid: string, type: 'user' | 'lawyer' } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);

  const [suggestedDomain, setSuggestedDomain] = useState<string | null>(null);
  const [isFindingDomain, setIsFindingDomain] = useState(false);

  const [reviewingContract, setReviewingContract] = useState<Contract | null>(null);
  const [lawyerReviewText, setLawyerReviewText] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    domain: '',
    price: 0,
    urgentPrice: 0,
    consultationPrice: 0,
    workingHours: '',
    avgResponseTime: '',
    maxRequestsPerDay: 5,
    qualifications: '',
    history: ''
  });

  // Dark Mode Effect
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          let docSnap = await getDoc(docRef);
          const pendingRole = sessionStorage.getItem('pending_role') as Role;
          
          let profileData: UserProfile;

          if (!docSnap.exists()) {
            // New user
            const role = user.email === 'navdeeprathee12@gmail.com' ? 'admin' : (pendingRole || 'user');
            profileData = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'User',
              role
            };
            await setDoc(docRef, profileData);
          } else {
            // Existing user
            profileData = docSnap.data() as UserProfile;
            
            // Force admin role for the specific email
            if (user.email === 'navdeeprathee12@gmail.com') {
              if (profileData.role !== 'admin') {
                try {
                  await setDoc(docRef, { role: 'admin' }, { merge: true });
                  profileData.role = 'admin';
                } catch (err) {
                  console.error('Admin promotion failed', err);
                }
              }
              // Aggressive redirection for admin
              setView('admin-dashboard');
            }

            // Role Mismatch Check (Admins are exempt)
            if (user.email !== 'navdeeprathee12@gmail.com' && pendingRole && profileData.role !== 'admin' && pendingRole !== profileData.role) {
              alert(`This account is already registered as a ${profileData.role}. You cannot join as a ${pendingRole}. Please use a different account.`);
              sessionStorage.removeItem('pending_role');
              await signOut(auth);
              return;
            }
          }

          // Blocking Check (Admin is never blocked)
          if (profileData.role !== 'admin') {
            if (profileData.isPermanentlyBlocked) {
              alert("Your account has been permanently blocked by the administrator.");
              await signOut(auth);
              return;
            }
            if (profileData.blockedUntil) {
              const blockedUntilDate = profileData.blockedUntil.toDate ? profileData.blockedUntil.toDate() : new Date(profileData.blockedUntil);
              if (blockedUntilDate > new Date()) {
                alert(`Your account is temporarily blocked until ${blockedUntilDate.toLocaleString()}.`);
                await signOut(auth);
                return;
              }
            }
          }

          setProfile(profileData);
          setUser(user);

          // Navigation Logic
          if (profileData.role === 'admin' || user.email === 'navdeeprathee12@gmail.com') {
            setView('admin-dashboard');
          } else if (profileData.role === 'lawyer') {
            const lawyerSnap = await getDoc(doc(db, 'lawyers', user.uid));
            if (lawyerSnap.exists()) {
              setLawyerProfile(lawyerSnap.data() as LawyerProfile);
              setView(pendingRole === 'user' ? 'dashboard' : 'lawyer-dashboard');
            } else {
              setView('lawyer-reg');
            }
          } else {
            setView('dashboard');
          }
        } catch (error) {
          console.error('Auth sync error:', error);
        } finally {
          sessionStorage.removeItem('pending_role');
        }
      } else {
        setUser(null);
        setProfile(null);
        setView('landing');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Profile Listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    }, (error) => {
      console.error("Error listening to profile:", error);
    });
    return unsubscribe;
  }, [user]);

  // Contracts Listener
  useEffect(() => {
    if (!user || !profile) return;
    
    let q;
    if (profile.role === 'lawyer') {
      // Lawyers see contracts assigned to them
      q = query(collection(db, 'contracts'), where('lawyerReviewId', '==', user.uid));
    } else {
      q = query(collection(db, 'contracts'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
      setContracts(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contracts');
    });
    return unsubscribe;
  }, [user, profile]);

  // Lawyers Listener
  useEffect(() => {
    if (!user) return; // Guard: Only fetch if authenticated

    const q = query(collection(db, 'lawyers'), where('verificationStatus', '==', 'verified'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as LawyerProfile);
      setLawyers(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lawyers');
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const findMatch = async () => {
      if (view === 'marketplace' && selectedContract?.type && lawyers.length > 0) {
        const exactMatch = lawyers.some(l => l.verificationStatus === 'verified' && l.domain === selectedContract.type);
        if (!exactMatch) {
          setIsFindingDomain(true);
          const domains = Array.from(new Set(lawyers.filter(l => l.verificationStatus === 'verified').map(l => l.domain))) as string[];
          if (domains.length > 0) {
            const closest = await findClosestDomain(selectedContract.type, domains);
            setSuggestedDomain(closest !== "None" ? closest : null);
          }
          setIsFindingDomain(false);
        } else {
          setSuggestedDomain(selectedContract.type);
        }
      }
    };
    findMatch();
  }, [view, selectedContract, lawyers]);

  // Pending Lawyers Listener (Admin only)
  useEffect(() => {
    if (!user || profile?.role !== 'admin') return;

    const q = query(collection(db, 'lawyers'), where('verificationStatus', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as LawyerProfile);
      setPendingLawyers(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lawyers');
    });

    // Fetch all users
    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    // Fetch all lawyers
    const lawyersUnsubscribe = onSnapshot(collection(db, 'lawyers'), (snapshot) => {
      setAllLawyers(snapshot.docs.map(doc => doc.data() as LawyerProfile));
    });

    // Fetch all payments
    const paymentsUnsubscribe = onSnapshot(query(collection(db, 'payments'), orderBy('createdAt', 'desc')), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });

    // Fetch activities
    const activitiesUnsubscribe = onSnapshot(query(collection(db, 'admin_activity'), orderBy('createdAt', 'desc')), (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminActivity)));
    });

    return () => {
      unsubscribe();
      usersUnsubscribe();
      lawyersUnsubscribe();
      paymentsUnsubscribe();
      activitiesUnsubscribe();
    };
  }, [user, profile]);

  const handleLogin = async (role: Role = 'user') => {
    try {
      const provider = new GoogleAuthProvider();
      // Store the requested role in session storage to use after redirect/popup
      sessionStorage.setItem('pending_role', role);
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        return; // Ignore user-initiated cancellations
      }
      console.error('Login failed', error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleVerifyLawyer = async (lawyerUid: string, status: 'verified' | 'rejected') => {
    try {
      await setDoc(doc(db, 'lawyers', lawyerUid), { verificationStatus: status }, { merge: true });
      
      await addDoc(collection(db, 'admin_activity'), {
        type: 'lawyer_verification',
        description: `Lawyer application ${status} for UID: ${lawyerUid}`,
        metadata: { lawyerUid, status },
        createdAt: serverTimestamp()
      });

      alert(`Lawyer application ${status} successfully.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lawyers/${lawyerUid}`);
    }
  };

  const handleChat = async () => {
    const currentContract = contracts.find(c => c.id === selectedContract?.id) || selectedContract;
    if (!chatInput || !currentContract || isChatLoading) return;
    
    const userMsg = { role: 'user' as const, text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await chatWithContract(
        currentContract.content,
        currentContract.aiAnalysis,
        chatInput,
        chatMessages.map(m => ({ role: m.role, text: m.text }))
      );
      
      setChatMessages(prev => [...prev, { role: 'model' as const, text: response }]);
    } catch (err) {
      console.error('Chat failed', err);
      setChatMessages(prev => [...prev, { role: 'model' as const, text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleBlock = async (uid: string, type: string, duration: string) => {
    try {
      const isPermanent = duration === 'permanent';
      const blockedUntil = isPermanent ? null : new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000);
      
      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, {
        isPermanentlyBlocked: isPermanent,
        blockedUntil: blockedUntil
      }, { merge: true });

      await addDoc(collection(db, 'admin_activity'), {
        type: 'user_blocked',
        description: `${type === 'user' ? 'User' : 'Lawyer'} with UID ${uid} blocked ${isPermanent ? 'permanently' : `for ${duration} days`}.`,
        createdAt: serverTimestamp()
      });

      setIsBlockingModalOpen(false);
      setTargetToBlock(null);
      alert("Account blocked successfully.");
    } catch (error) {
      console.error("Blocking failed:", error);
    }
  };

  const handleUnblock = async (uid: string, type: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, {
        isPermanentlyBlocked: false,
        blockedUntil: null
      }, { merge: true });

      await addDoc(collection(db, 'admin_activity'), {
        type: 'user_unblocked',
        description: `${type === 'user' ? 'User' : 'Lawyer'} with UID ${uid} unblocked.`,
        createdAt: serverTimestamp()
      });

      alert("Account unblocked successfully.");
    } catch (error) {
      console.error("Unblocking failed:", error);
    }
  };

  const handleUpdateLawyerProfile = async () => {
    if (!user || !lawyerProfile) return;
    try {
      if (!editFormData.qualifications.includes(lawyerProfile.qualifications)) {
        alert("You can only add to your education history, not delete existing entries.");
        return;
      }

      const updateData = {
        domain: editFormData.domain,
        price: editFormData.price,
        urgentPrice: editFormData.urgentPrice,
        consultationPrice: editFormData.consultationPrice,
        workingHours: editFormData.workingHours,
        avgResponseTime: editFormData.avgResponseTime,
        maxRequestsPerDay: editFormData.maxRequestsPerDay,
        qualifications: editFormData.qualifications,
        history: editFormData.history
      };

      await setDoc(doc(db, 'lawyers', user.uid), updateData, { merge: true });

      setLawyerProfile({ ...lawyerProfile, ...updateData });
      setIsEditingProfile(false);
      alert("Profile updated successfully.");
    } catch (error) {
      console.error("Profile update failed:", error);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (!user || !profile) return;
    const file = acceptedFiles[0];
    if (!file) return;

    // Check plan limits
    const isPro = profile.plan === 'pro';
    let currentAnalyses = profile.analysesThisMonth || 0;
    let lastReset = profile.lastAnalysisReset ? profile.lastAnalysisReset.toDate() : new Date(0);
    const now = new Date();

    let isNewMonth = false;
    if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      currentAnalyses = 0;
      isNewMonth = true;
    }

    if (!isPro && currentAnalyses >= 10) {
      setIsUpgradeModalOpen(true);
      return;
    }

    const isText = file.type === 'text/plain' || file.name.endsWith('.txt');
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      // Increment usage
      await setDoc(doc(db, 'users', user.uid), {
        analysesThisMonth: currentAnalyses + 1,
        ...(isNewMonth ? { lastAnalysisReset: serverTimestamp() } : {})
      }, { merge: true });

      let analysisInput: string | { data: string, mimeType: string };
      let initialContent = "";

      if (isText) {
        initialContent = e.target?.result as string;
        analysisInput = initialContent;
      } else {
        const base64 = (e.target?.result as string).split(',')[1];
        analysisInput = { data: base64, mimeType: file.type || 'application/octet-stream' };
        initialContent = `[Processing ${file.name}...]`;
      }
      
      // 1. Create contract doc
      const contractRef = await addDoc(collection(db, 'contracts'), {
        ownerId: user.uid,
        fileName: file.name,
        content: initialContent,
        status: 'analyzing',
        createdAt: serverTimestamp(),
        hasTrustSeal: false
      });

      // 2. Set as selected and switch to analysis view immediately
      setSelectedContract({
        id: contractRef.id,
        ownerId: user.uid,
        fileName: file.name,
        content: initialContent,
        status: 'analyzing',
        createdAt: new Date(),
        hasTrustSeal: false
      });
      setView('analysis');

      // 3. Run AI Analysis
      try {
        const analysis = await analyzeContract(analysisInput);
        await setDoc(doc(db, 'contracts', contractRef.id), {
          aiAnalysis: analysis,
          type: analysis.type,
          content: analysis.fullText || initialContent,
          status: 'completed'
        }, { merge: true });
        
        // Update local state if it's the selected one
        setSelectedContract(prev => prev?.id === contractRef.id ? {
          ...prev,
          aiAnalysis: analysis,
          type: analysis.type,
          content: analysis.fullText || initialContent,
          status: 'completed'
        } : prev);

      } catch (err: any) {
        console.error('Analysis failed', err);
        const errorMessage = err.message || "Analysis failed, but document uploaded.";
        await setDoc(doc(db, 'contracts', contractRef.id), {
          status: 'completed',
          aiAnalysis: { summary: errorMessage, clauses: [], fullText: initialContent }
        }, { merge: true });
        
        setSelectedContract(prev => prev?.id === contractRef.id ? {
          ...prev,
          status: 'completed',
          aiAnalysis: { summary: errorMessage, clauses: [], fullText: initialContent }
        } : prev);
      }
    };

    if (isText) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    multiple: false 
  } as any);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between bg-white/80 border-slate-200">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => {
          if (profile?.role === 'admin' || user?.email === 'navdeeprathee12@gmail.com') setView('admin-dashboard');
          else if (profile?.role === 'lawyer') setView('lawyer-dashboard');
          else if (profile) setView('dashboard');
          else setView('landing');
        }}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Scale size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">TrustSeal AI</span>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              {(profile?.role === 'admin' || user?.email === 'navdeeprathee12@gmail.com') && (
                <Button variant="ghost" className="text-indigo-600 font-bold" onClick={() => setView('admin-dashboard')}>
                  Admin Panel
                </Button>
              )}
              {profile?.role === 'user' && profile?.plan !== 'pro' && (
                <Button variant="secondary" onClick={() => setIsUpgradeModalOpen(true)}>
                  <Zap size={16} />
                  Upgrade to Pro
                </Button>
              )}
              <div 
                className="text-right hidden sm:block cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setView((profile?.role === 'admin' || user?.email === 'navdeeprathee12@gmail.com') ? 'admin-dashboard' : profile?.role === 'lawyer' ? 'lawyer-dashboard' : 'dashboard')}
              >
                <p className="text-sm font-semibold">{user.displayName || user.email}</p>
                <p className="text-xs capitalize text-slate-500 font-medium">{profile?.role || (user.email === 'navdeeprathee12@gmail.com' ? 'admin' : 'user')}</p>
              </div>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut size={18} />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleLogin('user')}>User Login</Button>
              <Button onClick={() => handleLogin('lawyer')}>Lawyer Login</Button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-20 py-12"
            >
              <div className="text-center space-y-6 max-w-3xl mx-auto">
                <Badge variant="info">Hackathon Project: GenAI Domain</Badge>
                <h1 className="text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Contract Intelligence <br />
                  <span className="text-indigo-600">Simplified.</span>
                </h1>
                <p className="text-xl text-slate-600 leading-relaxed">
                  Upload any contract and let our AI dissect clauses, simulate outcomes, and connect you with verified legal experts.
                </p>
                <div className="flex items-center justify-center gap-4 pt-4">
                  {user ? (
                    <Button className="px-8 py-4 text-lg" onClick={() => setView((profile?.role === 'admin' || user?.email === 'navdeeprathee12@gmail.com') ? 'admin-dashboard' : profile?.role === 'lawyer' ? 'lawyer-dashboard' : 'dashboard')}>
                      Go to {(profile?.role === 'admin' || user?.email === 'navdeeprathee12@gmail.com') ? 'Admin Panel' : 'Dashboard'}
                    </Button>
                  ) : (
                    <>
                      <Button className="px-8 py-4 text-lg" onClick={() => handleLogin('user')}>Get Started as User</Button>
                      <Button variant="outline" className="px-8 py-4 text-lg" onClick={() => handleLogin('lawyer')}>Join as Lawyer</Button>
                    </>
                  )}
                </div>
                <p className="text-sm text-slate-400 italic">Note: Accounts are restricted to a single role (User or Lawyer).</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: <Shield className="text-indigo-600" />, title: "Risk Assessment", desc: "AI-powered red/yellow/green flagging of clauses based on threat levels." },
                  { icon: <MessageSquare className="text-emerald-600" />, title: "Negotiation AI", desc: "Get counter-points and ready-to-send replacement wordings instantly." },
                  { icon: <Search className="text-amber-600" />, title: "Party Intelligence", desc: "Web-scraped insights about your contractor's reputation and history." },
                ].map((feature, i) => (
                  <Card key={i} className="p-8 hover:border-indigo-200 transition-colors group">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-slate-600">{feature.desc}</p>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Your Contracts</h2>
                  <p className="text-slate-500">Upload and manage your legal documents.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setView('marketplace')}>
                    <Briefcase size={18} />
                    Lawyer Marketplace
                  </Button>
                  <div {...getRootProps()}>
                    <input {...getInputProps()} />
                    <Button>
                      <Upload size={18} />
                      Upload New
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 border-b border-slate-200">
                <button 
                  onClick={() => setDashboardTab('all')}
                  className={cn(
                    "pb-4 text-sm font-bold transition-all border-b-2",
                    dashboardTab === 'all' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  All Contracts
                </button>
                <button 
                  onClick={() => setDashboardTab('requests')}
                  className={cn(
                    "pb-4 text-sm font-bold transition-all border-b-2",
                    dashboardTab === 'requests' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Review Requests ({contracts.filter(c => ['review_requested', 'review_accepted', 'review_ready', 'reviewed'].includes(c.status)).length})
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardTab === 'all' && (
                  <div 
                    {...getRootProps()} 
                    className={cn(
                      "p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[200px]",
                      isDragActive ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-indigo-400 bg-white"
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Upload size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Upload New Contract</h3>
                    <p className="text-slate-500 text-sm">Drag & drop your contract file here, or click to browse</p>
                  </div>
                )}

                {contracts
                  .filter(c => dashboardTab === 'all' || ['review_requested', 'review_accepted', 'review_ready', 'reviewed'].includes(c.status))
                  .map(contract => (
                  <Card key={contract.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => { setSelectedContract(contract); setView('analysis'); }}>
                    <div className="flex flex-col h-full justify-between gap-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                          <FileText size={24} />
                        </div>
                        <Badge variant={contract.status === 'completed' ? 'success' : contract.status === 'review_requested' ? 'warning' : 'info'}>
                          {contract.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="font-bold truncate">{contract.fileName}</h4>
                        <p className="text-sm text-slate-500">{contract.type || 'Detecting type...'}</p>
                        {contract.lawyerReviewId && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 font-medium">
                            <User size={12} />
                            Assigned to: {lawyers.find(l => l.uid === contract.lawyerReviewId)?.displayName || 'Legal Expert'}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {contract.hasTrustSeal && (
                            <div className="text-emerald-600 flex items-center gap-1 text-xs font-bold">
                              <Award size={14} />
                              Verified
                            </div>
                          )}
                        </div>
                        <ChevronRight className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'analysis' && selectedContract && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {(() => {
                const currentContract = contracts.find(c => c.id === selectedContract.id) || selectedContract;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => setView('dashboard')}>
                          <ChevronRight className="rotate-180" />
                        </Button>
                        <div>
                          <h2 className="text-3xl font-bold">{currentContract.fileName}</h2>
                          <p className="text-slate-500">AI Analysis Report • {currentContract.type || 'Processing...'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setView('marketplace')}>Request Lawyer Review</Button>
                        {currentContract.hasTrustSeal && (
                          <Button variant="secondary">
                            <Award size={18} />
                            Download Final Report
                          </Button>
                        )}
                      </div>
                    </div>

                    {currentContract.status === 'analyzing' ? (
                      <Card className="p-20 text-center space-y-4">
                        <motion.div 
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto"
                        >
                          <Search size={32} />
                        </motion.div>
                        <h3 className="text-2xl font-bold">AI is analyzing your contract...</h3>
                        <p className="text-slate-500">We are detecting clauses, assessing risks, and simulating outcomes.</p>
                        <p className="text-xs text-slate-400 mt-4">Using Gemini 3.1 Pro for high-precision exhaustive analysis.</p>
                      </Card>
                    ) : (
                      <div className="space-y-8">
                        {currentContract.status === 'review_ready' && (
                          <Card className="p-8 bg-indigo-50 border-indigo-200 text-center space-y-4">
                            <Lock className="mx-auto text-indigo-600" size={48} />
                            <h3 className="text-2xl font-bold text-indigo-900">Your Expert Review is Ready!</h3>
                            <p className="text-indigo-700 max-w-lg mx-auto">The lawyer has completed reviewing your contract. Pay the review fee to unlock the final report and trust seal.</p>
                            <div className="flex justify-center gap-4">
                              <div className="text-left bg-white p-4 rounded-xl border border-indigo-100">
                                <p className="text-xs text-slate-500 uppercase font-bold">Lawyer Fee</p>
                                <p className="font-bold">${currentContract.lawyerFee}</p>
                              </div>
                              <div className="text-left bg-white p-4 rounded-xl border border-indigo-100">
                                <p className="text-xs text-slate-500 uppercase font-bold">Platform Fee (10%)</p>
                                <p className="font-bold">${currentContract.platformFee}</p>
                              </div>
                              <div className="text-left bg-indigo-600 text-white p-4 rounded-xl">
                                <p className="text-xs text-indigo-200 uppercase font-bold">Total to Pay</p>
                                <p className="font-bold text-xl">${(currentContract.lawyerFee || 0) + (currentContract.platformFee || 0)}</p>
                              </div>
                            </div>
                            <Button size="lg" className="mt-4" onClick={async () => {
                              try {
                                await setDoc(doc(db, 'contracts', currentContract.id), { 
                                  status: 'reviewed',
                                  hasTrustSeal: currentContract.lawyerReview?.recommendation === 'Safe to Sign'
                                }, { merge: true });
                                
                                // Create payment record
                                await addDoc(collection(db, 'payments'), {
                                  userId: user?.uid,
                                  lawyerId: currentContract.lawyerReviewId,
                                  contractId: currentContract.id,
                                  amount: (currentContract.lawyerFee || 0) + (currentContract.platformFee || 0),
                                  status: 'completed',
                                  createdAt: serverTimestamp()
                                });

                                // Log activity
                                await addDoc(collection(db, 'admin_activity'), {
                                  type: 'payment_received',
                                  description: `Payment of $${(currentContract.lawyerFee || 0) + (currentContract.platformFee || 0)} received for contract review.`,
                                  metadata: { userId: user?.uid, lawyerId: currentContract.lawyerReviewId, amount: (currentContract.lawyerFee || 0) + (currentContract.platformFee || 0) },
                                  createdAt: serverTimestamp()
                                });

                                alert("Payment processed successfully! Your report is now unlocked.");
                              } catch (err) {
                                console.error('Payment failed', err);
                                alert("Failed to process payment.");
                              }
                            }}>Pay & Unlock Report</Button>
                          </Card>
                        )}
                        {currentContract.status === 'reviewed' && currentContract.lawyerReview && (
                          <Card className="p-6 bg-emerald-50 border-emerald-200">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                                <CheckCircle size={24} />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-emerald-900 mb-4">Expert Review Completed</h3>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Final Recommendation</p>
                                    <p className="font-bold text-emerald-900">{currentContract.lawyerReview.recommendation}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Detailed Assessment</p>
                                    <p className="text-sm text-emerald-800 whitespace-pre-wrap">{currentContract.lawyerReview.content}</p>
                                  </div>
                                  <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                                    alert("Downloading Final Report PDF...");
                                  }}>
                                    Download Final Report
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        )}
                        <div className="grid lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2 space-y-8">
                          {/* Summary & Grade */}
                          <Card className="p-8 bg-white border-l-4 border-indigo-600">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xl font-bold">Executive Summary</h3>
                              {currentContract.grade && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Risk Grade</span>
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-white",
                                    ['A', 'B'].includes(currentContract.grade) ? "bg-red-500" :
                                    ['C', 'D'].includes(currentContract.grade) ? "bg-amber-500" :
                                    "bg-emerald-500"
                                  )}>
                                    {currentContract.grade}
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className="text-slate-700 leading-relaxed">
                              {currentContract.aiAnalysis?.summary || "Summary not available."}
                            </p>
                          </Card>

                          {/* Clauses */}
                          <div className="space-y-4">
                            <h3 className="text-xl font-bold">Clause Analysis</h3>
                            {currentContract.aiAnalysis?.clauses?.map((clause: any, i: number) => {
                              const isPro = profile?.plan === 'pro';
                              
                              return (
                              <Card key={i} className="overflow-hidden">
                                {isPro && (
                                  <div className={cn(
                                    "px-6 py-3 flex items-center justify-between",
                                    clause.riskLevel === 'red' ? "bg-red-50 text-red-700" :
                                    clause.riskLevel === 'yellow' ? "bg-amber-50 text-amber-700" :
                                    "bg-emerald-50 text-emerald-700"
                                  )}>
                                    <div className="flex items-center gap-2 font-bold uppercase text-xs tracking-widest">
                                      {clause.riskLevel === 'red' ? <XCircle size={16} /> :
                                       clause.riskLevel === 'yellow' ? <AlertTriangle size={16} /> :
                                       <CheckCircle size={16} />}
                                      {clause.riskLevel} Risk
                                    </div>
                                    <Badge variant={clause.riskLevel === 'red' ? 'danger' : clause.riskLevel === 'yellow' ? 'warning' : 'success'}>
                                      Clause {i + 1}
                                    </Badge>
                                  </div>
                                )}
                                {!isPro && (
                                  <div className="px-6 py-3 bg-slate-50 text-slate-700 flex items-center justify-between">
                                    <div className="font-bold uppercase text-xs tracking-widest">Clause {i + 1}</div>
                                    <Badge variant="neutral">Base Plan</Badge>
                                  </div>
                                )}
                                
                                <div className="p-6 space-y-6">
                                  {isPro && clause.crux && (
                                    <h4 className="text-lg font-bold text-slate-800">{clause.crux}</h4>
                                  )}
                                  <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Original Clause</p>
                                      <p className="text-sm text-slate-600 italic">"{clause.original}"</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Plain English Translation</p>
                                      <p className="text-sm font-medium text-slate-800">{clause.plainEnglish}</p>
                                    </div>
                                  </div>
                                  
                                  {isPro && (
                                    <div className="pt-4 border-t border-slate-100 space-y-4">
                                      <div>
                                        <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Risk Reasoning</p>
                                        <p className="text-sm text-slate-600">{clause.reasoning}</p>
                                      </div>
                                      {clause.suggestedWording && clause.riskLevel === 'yellow' && (
                                        <div className="bg-slate-50 p-4 rounded-xl space-y-3 dark:bg-slate-800">
                                          <div>
                                            <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Negotiation Strategy</p>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">{clause.counterPoint}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Suggested Replacement</p>
                                            <div className="flex items-center justify-between gap-4">
                                              <code className="text-xs bg-white p-2 rounded border border-slate-200 flex-1 dark:bg-slate-900 dark:border-slate-700">{clause.suggestedWording}</code>
                                              <Button variant="outline" className="text-xs py-1 h-auto" onClick={() => navigator.clipboard.writeText(clause.suggestedWording)}>Copy</Button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      <div className="pt-2">
                                        <details className="group">
                                          <summary className="flex items-center justify-between cursor-pointer p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                                            Outcome Simulator
                                            <ChevronRight className="group-open:rotate-90 transition-transform" size={16} />
                                          </summary>
                                          <div className="p-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {clause.outcomeSimulator}
                                          </div>
                                        </details>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            )})}
                          </div>
                        </div>

                        <div className="space-y-8">
                          {/* Visualizations (Pro Only) */}
                          {profile?.plan === 'pro' && currentContract.aiAnalysis?.clauses && (
                            <Card className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <Activity className="text-indigo-600" size={20} />
                                  <h3 className="text-lg font-bold">Risk Distribution</h3>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                  <button
                                    onClick={() => setChartType('pie')}
                                    className={cn("p-1.5 rounded-md transition-all", chartType === 'pie' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700")}
                                  >
                                    <PieChartIcon size={16} />
                                  </button>
                                  <button
                                    onClick={() => setChartType('bar')}
                                    className={cn("p-1.5 rounded-md transition-all", chartType === 'bar' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700")}
                                  >
                                    <BarChart2 size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  {chartType === 'pie' ? (
                                    <PieChart>
                                      <Pie
                                        data={[
                                          { name: 'Safe', value: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'green').length, color: '#10b981' },
                                          { name: 'Caution', value: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'yellow').length, color: '#f59e0b' },
                                          { name: 'Threat', value: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'red').length, color: '#ef4444' }
                                        ].filter(d => d.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                      >
                                        {
                                          [
                                            { name: 'Safe', value: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'green').length, color: '#10b981' },
                                            { name: 'Caution', value: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'yellow').length, color: '#f59e0b' },
                                            { name: 'Threat', value: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'red').length, color: '#ef4444' }
                                          ].filter(d => d.value > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                          ))
                                        }
                                      </Pie>
                                      <RechartsTooltip />
                                      <Legend />
                                    </PieChart>
                                  ) : (
                                    <BarChart
                                      data={[
                                        { name: 'Safe', count: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'green').length, fill: '#10b981' },
                                        { name: 'Caution', count: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'yellow').length, fill: '#f59e0b' },
                                        { name: 'Threat', count: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'red').length, fill: '#ef4444' }
                                      ].filter(d => d.count > 0)}
                                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                                      <RechartsTooltip cursor={{fill: 'transparent'}} />
                                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {
                                          [
                                            { name: 'Safe', count: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'green').length, fill: '#10b981' },
                                            { name: 'Caution', count: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'yellow').length, fill: '#f59e0b' },
                                            { name: 'Threat', count: currentContract.aiAnalysis.clauses.filter((c: any) => c.riskLevel === 'red').length, fill: '#ef4444' }
                                          ].filter(d => d.count > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                          ))
                                        }
                                      </Bar>
                                    </BarChart>
                                  )}
                                </ResponsiveContainer>
                              </div>
                            </Card>
                          )}

                          {/* Party Intelligence */}
                          <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <Search className="text-indigo-600" size={20} />
                              <h3 className="text-lg font-bold">Party Intelligence</h3>
                            </div>
                            <div className="space-y-4">
                              <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Reputation Score</p>
                                <p className="font-bold text-indigo-600">{currentContract.aiAnalysis?.partyIntelligence?.reputation || "Neutral"}</p>
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {currentContract.aiAnalysis?.partyIntelligence?.summary || "No specific data found for this party."}
                              </p>
                            </div>
                          </Card>

                          {/* Interactive Chatbot (Pro Only) */}
                          {profile?.plan === 'pro' ? (
                            <Card className="p-6">
                              <div className="flex items-center gap-2 mb-4">
                                <MessageSquare className="text-indigo-600" size={20} />
                                <h3 className="text-lg font-bold">Outcome Simulator Chat</h3>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 h-[300px] flex flex-col">
                                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                                  {chatMessages.length === 0 && (
                                    <p className="text-center text-slate-400 text-sm mt-10">Ask anything about this contract or simulate a courtroom scenario...</p>
                                  )}
                                  {chatMessages.map((msg, i) => (
                                    <div key={i} className={cn(
                                      "max-w-[80%] p-3 rounded-2xl text-sm",
                                      msg.role === 'user' ? "bg-indigo-600 text-white ml-auto" : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 mr-auto"
                                    )}>
                                      {msg.text}
                                    </div>
                                  ))}
                                  {isChatLoading && (
                                    <div className="bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 mr-auto p-3 rounded-2xl text-sm animate-pulse">
                                      AI is thinking...
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <input 
                                    value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && !isChatLoading && handleChat()}
                                  placeholder="Ask a question..."
                                  className="flex-1 p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700"
                                />
                                <Button size="sm" onClick={handleChat} disabled={isChatLoading || !chatInput}>
                                  <Send size={16} />
                                </Button>
                              </div>
                            </div>
                          </Card>
                          ) : (
                            <Card className="p-6 text-center space-y-4 bg-indigo-50 border-indigo-100">
                              <Lock className="mx-auto text-indigo-400" size={32} />
                              <h3 className="text-lg font-bold text-indigo-900">Outcome Simulator Chat</h3>
                              <p className="text-sm text-indigo-700">Upgrade to Pro to chat with this contract and simulate courtroom scenarios.</p>
                              <Button variant="default" onClick={() => setIsUpgradeModalOpen(true)}>Upgrade to Pro</Button>
                            </Card>
                          )}

                          {/* Trust Seal */}
                          <Card className={cn(
                            "p-6 text-center space-y-4",
                            currentContract.hasTrustSeal ? "bg-emerald-50 border-emerald-200" : "bg-slate-50"
                          )}>
                            <div className={cn(
                              "w-16 h-16 rounded-full flex items-center justify-center mx-auto",
                              currentContract.hasTrustSeal ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
                            )}>
                              <Award size={32} />
                            </div>
                            <div>
                              <h3 className="font-bold">Trust Seal</h3>
                              <p className="text-xs text-slate-500 mt-1">
                                {currentContract.hasTrustSeal 
                                  ? "This contract has been reviewed and verified by a legal expert." 
                                  : "Get your contract reviewed by a verified lawyer to receive a Trust Seal."}
                              </p>
                            </div>
                            {!currentContract.hasTrustSeal ? (
                              <Button variant="outline" className="w-full" onClick={() => setView('marketplace')}>Find a Lawyer</Button>
                            ) : (
                              <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-100" onClick={() => alert("Downloading Trust Seal Badge...")}>Download Badge</Button>
                            )}
                          </Card>
                        </div>
                      </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}

          {view === 'marketplace' && (
            <motion.div 
              key="marketplace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => setView('dashboard')}>
                    <ChevronRight className="rotate-180" />
                  </Button>
                  <div>
                    <h2 className="text-3xl font-bold">Lawyer Marketplace</h2>
                    {selectedContract && (
                      <p className="text-sm text-indigo-600 font-bold">Filtering for: {selectedContract.type || 'Any'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isFindingDomain ? (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"
                    />
                    <p className="text-slate-500 font-medium">Finding the best legal expert for your contract...</p>
                  </div>
                ) : lawyers.filter(l => l.verificationStatus === 'verified').length === 0 ? (
                  <div className="col-span-full py-20 text-center text-slate-500 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    No verified lawyers available at the moment.
                  </div>
                ) : (
                  lawyers
                    .filter(l => l.verificationStatus === 'verified')
                    .sort((a, b) => {
                      // Sort recommended lawyers to the top
                      const aIsMatch = a.domain === suggestedDomain || a.domain === selectedContract?.type;
                      const bIsMatch = b.domain === suggestedDomain || b.domain === selectedContract?.type;
                      if (aIsMatch && !bIsMatch) return -1;
                      if (!aIsMatch && bIsMatch) return 1;
                      return 0;
                    })
                    .map((lawyer, i) => (
                    <Card key={i} className={cn(
                      "p-6 hover:border-indigo-300 transition-all group bg-white border-slate-100 shadow-sm",
                      (lawyer.domain === suggestedDomain || lawyer.domain === selectedContract?.type) && "border-indigo-200 ring-1 ring-indigo-100"
                    )}>
                      {(lawyer.domain === suggestedDomain || lawyer.domain === selectedContract?.type) && (
                        <div className="mb-4 px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-full inline-block">
                          AI Recommended Match
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                            <User size={28} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">Verified Expert</h4>
                            <p className="text-sm text-indigo-600 font-medium">{lawyer.domain}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-amber-500 font-bold mb-1">
                            <Star size={16} fill="currentColor" className="mr-1" />
                            {lawyer.rating}
                          </div>
                          <p className="text-xs text-slate-400">{lawyer.reviewCount} reviews</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Award size={16} className="text-emerald-500" />
                          <span>License: {lawyer.licenseNumber}</span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">{lawyer.history}</p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-bold">Review Fee</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">${lawyer.price}</p>
                        </div>
                        <Button onClick={async () => {
                          if (!selectedContract) {
                            alert("Please select a contract from your dashboard first.");
                            setView('dashboard');
                            return;
                          }
                          
                          // Check lawyer active contracts limit
                          const maxContracts = lawyer.maxActiveContracts || 5;
                          const activeContracts = lawyer.activeContractsCount || 0;
                          if (activeContracts >= maxContracts) {
                            alert("This lawyer has reached their maximum active contracts limit. Please select another lawyer.");
                            return;
                          }

                          try {
                            await setDoc(doc(db, 'contracts', selectedContract.id), { 
                              status: 'review_requested',
                              lawyerReviewId: lawyer.uid,
                              lawyerFee: lawyer.price,
                              platformFee: lawyer.price * 0.1 // 10% platform fee
                            }, { merge: true });
                            
                            // Log activity
                            await addDoc(collection(db, 'admin_activity'), {
                              type: 'contract_uploaded',
                              description: `Review requested for contract ${selectedContract.id} with lawyer ${lawyer.uid}.`,
                              metadata: { userId: user?.uid, lawyerId: lawyer.uid },
                              createdAt: serverTimestamp()
                            });

                            alert("Review requested successfully! The lawyer will review your contract soon.");
                            setView('dashboard');
                          } catch (err) {
                            console.error('Request failed', err);
                            alert("Failed to request review.");
                          }
                        }}>Request Review</Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'lawyer-reg' && (
            <motion.div 
              key="lawyer-reg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto"
            >
              <Card className="p-8 space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold">Lawyer Onboarding</h2>
                  <p className="text-slate-500">Join ContractSense as a verified legal expert.</p>
                </div>

                <form className="space-y-8" onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) return;
                  const formData = new FormData(e.currentTarget);
                  
                  // Mock Skill Score for the demo
                  const mockSkillScore = Math.floor(Math.random() * 20) + 80; // 80-100

                  const profile: LawyerProfile = {
                    uid: user.uid,
                    qualifications: formData.get('qualifications') as string,
                    licenseNumber: formData.get('license') as string,
                    history: formData.get('history') as string,
                    domain: formData.get('domain') as string,
                    price: Number(formData.get('price')),
                    urgentPrice: Number(formData.get('urgentPrice')),
                    consultationPrice: Number(formData.get('consultationPrice')),
                    workingHours: formData.get('workingHours') as string,
                    avgResponseTime: formData.get('avgResponseTime') as string,
                    maxRequestsPerDay: Number(formData.get('maxRequests')),
                    skillScore: mockSkillScore,
                    verificationStatus: 'pending',
                    rating: 5.0,
                    reviewCount: 0,
                    casesWon: 0,
                    casesLost: 0
                  };
                  await setDoc(doc(db, 'lawyers', user.uid), profile);
                  setLawyerProfile(profile);
                  alert(`Registration submitted! Your AI Skill Score: ${mockSkillScore}%. Awaiting admin verification.`);
                  setView('lawyer-dashboard');
                }}>
                  {/* Section 1: Basic & Identity */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold border-b pb-2">1. Identity & Credentials</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Bar Registration Number</label>
                        <input name="license" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., BAR/1234/2024" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Primary Specialization</label>
                        <select name="domain" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
                          <optgroup label="Popular Domains">
                            <option>Freelance Contract</option>
                            <option>Employment Contract</option>
                            <option>Service Agreement</option>
                            <option>Consulting Agreement</option>
                            <option>Independent Contractor Agreement</option>
                            <option>NDA (Non-Disclosure)</option>
                          </optgroup>
                          <optgroup label="Business & Tech">
                            <option>SaaS Agreement</option>
                            <option>Vendor Contract</option>
                            <option>Terms & Conditions</option>
                            <option>Privacy Policy</option>
                            <option>IP Licensing</option>
                          </optgroup>
                          <optgroup label="Corporate & Real Estate">
                            <option>M&A Agreement</option>
                            <option>Partnership Agreement</option>
                            <option>Shareholder Agreement</option>
                            <option>Commercial Lease</option>
                            <option>Residential Rental</option>
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Professional Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold border-b pb-2">2. Professional Pedigree</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Qualifications (LLB, LLM, etc.)</label>
                        <textarea name="qualifications" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]" placeholder="List your degrees and certifications..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Professional History</label>
                        <textarea name="history" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]" placeholder="Briefly describe your experience and key achievements..." />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Pricing & Availability */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold border-b pb-2">3. Pricing & Availability</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Standard Review ($)</label>
                        <input name="price" type="number" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="150" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Urgent Review ($)</label>
                        <input name="urgentPrice" type="number" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="300" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">15m Consult ($)</label>
                        <input name="consultationPrice" type="number" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="50" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Working Hours</label>
                        <input name="workingHours" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 9 AM - 6 PM" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Avg. Response</label>
                        <select name="avgResponseTime" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
                          <option>Under 1 hour</option>
                          <option>Under 3 hours</option>
                          <option>Under 12 hours</option>
                          <option>Under 24 hours</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Max Requests/Day</label>
                        <input name="maxRequests" type="number" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="5" />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: AI Skill Assessment */}
                  <div className="space-y-4 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="text-indigo-600" size={20} />
                      <h3 className="text-lg font-bold text-indigo-900">AI Skill Assessment</h3>
                    </div>
                    <p className="text-sm text-indigo-700 mb-4">
                      To maintain high quality, we require a quick analysis of a sample NDA. 
                      Identify the primary risk in the following clause:
                    </p>
                    <div className="bg-white p-4 rounded-xl text-xs text-slate-600 italic mb-4 border border-indigo-200">
                      "The Receiving Party shall maintain the confidentiality of the Disclosing Party's information for a period of ninety-nine (99) years from the date of disclosure, regardless of whether the information enters the public domain."
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-indigo-900">Your Analysis</label>
                      <textarea required className="w-full p-3 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]" placeholder="Briefly explain the legal risk here..." />
                    </div>
                  </div>

                  <Button type="submit" className="w-full py-4 text-lg">Complete Registration & Submit</Button>
                </form>
              </Card>
            </motion.div>
          )}

          {view === 'lawyer-dashboard' && (
            <motion.div 
              key="lawyer-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Lawyer Dashboard</h2>
                  <p className="text-slate-500">Manage reviews and your professional profile.</p>
                </div>
                <div className="flex gap-2">
                  {!lawyerProfile && (
                    <Button onClick={() => setView('lawyer-reg')}>Complete Registration</Button>
                  )}
                  {lawyerProfile?.verificationStatus === 'verified' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-bold text-sm">
                      <Award size={18} />
                      Verified Expert
                    </div>
                  )}
                </div>
              </div>

              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total Reviewed', value: lawyerProfile?.reviewCount || 0, icon: <FileText size={20} />, color: 'text-blue-600' },
                  { label: 'Earnings', value: `₹${(lawyerProfile?.reviewCount || 0) * (lawyerProfile?.price || 0)}`, icon: <DollarSign size={20} />, color: 'text-emerald-600' },
                  { label: 'Avg Rating', value: lawyerProfile?.rating || '5.0', icon: <Star size={20} />, color: 'text-amber-600' },
                  { label: 'Response Time', value: lawyerProfile?.avgResponseTime || 'N/A', icon: <Clock size={20} />, color: 'text-indigo-600' },
                  { label: 'Completion', value: '100%', icon: <CheckCircle size={20} />, color: 'text-emerald-600' },
                  { label: 'Skill Score', value: `${lawyerProfile?.skillScore || 0}%`, icon: <Activity size={20} />, color: 'text-purple-600' },
                ].map((stat, i) => (
                  <Card key={i} className="p-4 space-y-2">
                    <div className={cn("w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center", stat.color)}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</p>
                      <p className="text-lg font-bold">{stat.value}</p>
                    </div>
                  </Card>
                ))}
              </div>

              {lawyerProfile?.verificationStatus === 'pending' && (
                <Card className="p-8 bg-amber-50 border-amber-200 text-center space-y-4">
                  <Clock className="text-amber-600 mx-auto" size={48} />
                  <h3 className="text-xl font-bold text-amber-800">Verification Pending</h3>
                  <p className="text-amber-700 max-w-lg mx-auto">Your profile is currently being manually verified by our admins. You will be notified once you are allowed to review contracts in the marketplace.</p>
                </Card>
              )}

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Incoming Requests Panel */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Incoming Requests</h3>
                    {contracts.filter(c => c.lawyerReviewId === user?.uid && c.status === 'review_requested').length === 0 ? (
                      <Card className="p-12 text-center text-slate-500 bg-white/50">
                        No new requests from the marketplace.
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {contracts.filter(c => c.lawyerReviewId === user?.uid && c.status === 'review_requested').map(contract => (
                          <Card key={contract.id} className="p-6 hover:border-indigo-200 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                  <FileText size={24} />
                                </div>
                                <div>
                                  <h4 className="font-bold">{contract.fileName}</h4>
                                  <p className="text-sm text-slate-500">Type: {contract.type}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" onClick={async () => {
                                  try {
                                    await setDoc(doc(db, 'contracts', contract.id), { status: 'completed', lawyerReviewId: null }, { merge: true });
                                    alert("Review rejected.");
                                  } catch (error) {
                                    console.error("Error rejecting review:", error);
                                    alert("Failed to reject review.");
                                  }
                                }}>Reject</Button>
                                <Button onClick={async () => {
                                  // Check active contracts limit
                                  const maxContracts = lawyerProfile?.maxActiveContracts || 5;
                                  const activeContracts = lawyerProfile?.activeContractsCount || 0;
                                  if (activeContracts >= maxContracts) {
                                    alert("You have reached your maximum active contracts limit. Please complete some reviews before accepting new ones.");
                                    return;
                                  }
                                  try {
                                    await setDoc(doc(db, 'contracts', contract.id), { status: 'review_accepted' }, { merge: true });
                                    await setDoc(doc(db, 'lawyers', user!.uid), { activeContractsCount: (lawyerProfile?.activeContractsCount || 0) + 1 }, { merge: true });
                                    alert("Review accepted!");
                                  } catch (error) {
                                    console.error("Error accepting review:", error);
                                    alert("Failed to accept review.");
                                  }
                                }}>Accept Review</Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Work Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">Active Work</h3>
                      <Badge variant="info">In Progress</Badge>
                    </div>
                    {contracts.filter(c => c.lawyerReviewId === user?.uid && c.status === 'review_accepted').length === 0 ? (
                      <Card className="p-12 text-center text-slate-500 bg-white/50">
                        No active contracts currently being reviewed.
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {contracts.filter(c => c.lawyerReviewId === user?.uid && c.status === 'review_accepted').map(contract => (
                          <Card key={contract.id} className="p-6 hover:border-indigo-200 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                  <FileText size={24} />
                                </div>
                                <div>
                                  <h4 className="font-bold">{contract.fileName}</h4>
                                  <p className="text-sm text-slate-500">Type: {contract.type} • Urgency: High</p>
                                </div>
                              </div>
                              <Button onClick={() => {
                                setSelectedContract(contract);
                                setView('review-workspace');
                              }}>Continue Review</Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Performance Analytics */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Performance Analytics</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Card className="p-6 h-64 flex flex-col items-center justify-center text-center space-y-4">
                        <Activity className="text-indigo-600" size={48} />
                        <div>
                          <p className="font-bold">Reviews Over Time</p>
                          <p className="text-sm text-slate-500">Graph visualization coming soon in Phase 2.</p>
                        </div>
                      </Card>
                      <Card className="p-6 h-64 flex flex-col items-center justify-center text-center space-y-4">
                        <DollarSign className="text-emerald-600" size={48} />
                        <div>
                          <p className="font-bold">Earnings Growth</p>
                          <p className="text-sm text-slate-500">Financial trends visualization coming soon.</p>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Completed Work */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Completed Work</h3>
                    {contracts.filter(c => c.lawyerReviewId === user?.uid && c.status === 'reviewed').length === 0 ? (
                      <Card className="p-12 text-center text-slate-500 bg-white/50">
                        No completed reviews yet.
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {contracts.filter(c => c.lawyerReviewId === user?.uid && c.status === 'reviewed').map(contract => (
                          <Card key={contract.id} className="p-4 bg-slate-50/50 border-dashed">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CheckCircle className="text-emerald-500" size={20} />
                                <div>
                                  <p className="font-bold text-sm">{contract.fileName}</p>
                                  <p className="text-xs text-slate-500">Reviewed on {new Date(contract.updatedAt?.seconds * 1000).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-amber-500">
                                <Star size={12} fill="currentColor" />
                                <span className="text-xs font-bold">5.0</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Profile Management */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold">Profile Management</h3>
                      {lawyerProfile && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          setIsEditingProfile(!isEditingProfile);
                          if (!isEditingProfile) {
                            setEditFormData({
                              domain: lawyerProfile.domain,
                              price: lawyerProfile.price,
                              urgentPrice: lawyerProfile.urgentPrice || 0,
                              consultationPrice: lawyerProfile.consultationPrice || 0,
                              workingHours: lawyerProfile.workingHours || '',
                              avgResponseTime: lawyerProfile.avgResponseTime || '',
                              maxRequestsPerDay: lawyerProfile.maxRequestsPerDay || 5,
                              qualifications: lawyerProfile.qualifications,
                              history: lawyerProfile.history
                            });
                          }
                        }}>
                          {isEditingProfile ? 'Cancel' : 'Edit'}
                        </Button>
                      )}
                    </div>
                    {lawyerProfile ? (
                      <div className="space-y-6">
                        {isEditingProfile ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase">Domain</label>
                              <input 
                                value={editFormData.domain}
                                onChange={e => setEditFormData({...editFormData, domain: e.target.value})}
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Standard Fee ($)</label>
                                <input 
                                  type="number"
                                  value={editFormData.price}
                                  onChange={e => setEditFormData({...editFormData, price: Number(e.target.value)})}
                                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Urgent Fee ($)</label>
                                <input 
                                  type="number"
                                  value={editFormData.urgentPrice}
                                  onChange={e => setEditFormData({...editFormData, urgentPrice: Number(e.target.value)})}
                                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase">Working Hours</label>
                              <input 
                                value={editFormData.workingHours}
                                onChange={e => setEditFormData({...editFormData, workingHours: e.target.value})}
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g., 9 AM - 6 PM"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Avg Response</label>
                                <select 
                                  value={editFormData.avgResponseTime}
                                  onChange={e => setEditFormData({...editFormData, avgResponseTime: e.target.value})}
                                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                  <option>Under 1 hour</option>
                                  <option>Under 3 hours</option>
                                  <option>Under 12 hours</option>
                                  <option>Under 24 hours</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Max Req/Day</label>
                                <input 
                                  type="number"
                                  value={editFormData.maxRequestsPerDay}
                                  onChange={e => setEditFormData({...editFormData, maxRequestsPerDay: Number(e.target.value)})}
                                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>
                            <Button className="w-full" onClick={handleUpdateLawyerProfile}>Save Changes</Button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <User size={32} />
                              </div>
                              <div>
                                <p className="font-bold text-lg">{user?.displayName || 'Legal Expert'}</p>
                                <p className="text-sm text-slate-500">{lawyerProfile.domain}</p>
                              </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-100">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Verification</span>
                                <Badge variant={lawyerProfile.verificationStatus === 'verified' ? 'success' : 'warning'}>
                                  {lawyerProfile.verificationStatus}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Standard Fee</span>
                                <span className="font-bold">₹{lawyerProfile.price}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Urgent Fee</span>
                                <span className="font-bold">₹{lawyerProfile.urgentPrice || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Skill Score</span>
                                <span className="font-bold text-indigo-600">{lawyerProfile.skillScore}%</span>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Availability</p>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Clock size={14} />
                                {lawyerProfile.workingHours || 'Not set'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Please complete registration.</p>
                    )}
                  </Card>

                  {/* Verification Status Panel */}
                  <Card className="p-6 bg-slate-900 text-white">
                    <h3 className="text-lg font-bold mb-4">Trust Status</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                        <Shield className="text-emerald-400" size={20} />
                        <div>
                          <p className="text-sm font-bold">Bar License</p>
                          <p className="text-[10px] text-slate-400">{lawyerProfile?.licenseNumber || 'Pending'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                        <Award className="text-indigo-400" size={20} />
                        <div>
                          <p className="text-sm font-bold">AI Certification</p>
                          <p className="text-[10px] text-slate-400">Score: {lawyerProfile?.skillScore || 0}%</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'review-workspace' && selectedContract && (
            <motion.div 
              key="review-workspace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setView('lawyer-dashboard')}>
                  <ChevronRight className="rotate-180" />
                </Button>
                <div>
                  <h2 className="text-3xl font-bold">Review Workspace</h2>
                  <p className="text-slate-500">Reviewing: {selectedContract.fileName}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <FileText className="text-indigo-600" />
                      Original Contract Content
                    </h3>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl max-h-[500px] overflow-y-auto text-sm font-mono whitespace-pre-wrap">
                      {selectedContract.content}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Activity className="text-emerald-600" />
                      AI Analysis Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                        <p className="text-sm text-emerald-800 dark:text-emerald-200">{selectedContract.aiAnalysis?.summary}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Trust Score</p>
                          <p className="text-xl font-bold text-indigo-600">{selectedContract.aiAnalysis?.trustScore}%</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Risk Level</p>
                          <p className={cn("text-xl font-bold", 
                            selectedContract.aiAnalysis?.riskLevel === 'Low' ? 'text-emerald-600' :
                            selectedContract.aiAnalysis?.riskLevel === 'Medium' ? 'text-amber-600' : 'text-red-600'
                          )}>{selectedContract.aiAnalysis?.riskLevel}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <MessageSquare className="text-indigo-600" />
                      Expert Review
                    </h3>
                    <form className="space-y-6" onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const review = formData.get('review') as string;
                      const recommendation = formData.get('recommendation') as string;

                      try {
                        await setDoc(doc(db, 'contracts', selectedContract.id), {
                          status: 'review_ready',
                          lawyerReview: {
                            content: review,
                            recommendation,
                            createdAt: new Date().toISOString(),
                            lawyerId: user?.uid
                          }
                        }, { merge: true });

                        // Decrement active contracts count
                        if (lawyerProfile && lawyerProfile.activeContractsCount && lawyerProfile.activeContractsCount > 0) {
                          await setDoc(doc(db, 'lawyers', user!.uid), { activeContractsCount: lawyerProfile.activeContractsCount - 1 }, { merge: true });
                        }

                        alert("Review submitted successfully! The user will be notified to pay and unlock the report.");
                        setView('lawyer-dashboard');
                      } catch (err) {
                        console.error('Submit failed', err);
                        alert("Failed to submit review.");
                      }
                    }}>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Detailed Review</label>
                        <textarea 
                          name="review"
                          required
                          className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-64"
                          placeholder="Provide your professional assessment of the contract..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Final Recommendation</label>
                        <select 
                          name="recommendation"
                          required
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Safe to Sign">Safe to Sign</option>
                          <option value="Sign with Caution">Sign with Caution</option>
                          <option value="Negotiate Terms">Negotiate Terms</option>
                          <option value="Do Not Sign">Do Not Sign</option>
                        </select>
                      </div>
                      <Button type="submit" className="w-full py-4">Submit Expert Review</Button>
                    </form>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
          {view === 'admin-dashboard' && (
            <motion.div 
              key="admin-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Admin Control Center</h2>
                  <p className="text-slate-500">Platform-wide monitoring and management.</p>
                </div>
              </div>

              <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => setAdminTab('activity')}
                  className={cn("pb-4 px-2 font-bold transition-all", adminTab === 'activity' ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400")}
                >Activity Feed</button>
                <button 
                  onClick={() => setAdminTab('users')}
                  className={cn("pb-4 px-2 font-bold transition-all", adminTab === 'users' ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400")}
                >User Details</button>
                <button 
                  onClick={() => setAdminTab('lawyers')}
                  className={cn("pb-4 px-2 font-bold transition-all", adminTab === 'lawyers' ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400")}
                >Lawyer Details</button>
                <button 
                  onClick={() => setAdminTab('transactions')}
                  className={cn("pb-4 px-2 font-bold transition-all", adminTab === 'transactions' ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400")}
                >Transactions</button>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {adminTab === 'activity' && (
                    <Card className="p-6">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Activity className="text-indigo-600" />
                        Platform Activity Feed
                      </h3>
                      <div className="space-y-4">
                        {activities.length === 0 ? (
                          <p className="text-center text-slate-400 py-10">No recent activity.</p>
                        ) : (
                          activities.map((activity) => (
                            <div key={activity.id} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                                {activity.type === 'payment_received' ? <DollarSign size={20} /> : <Activity size={20} />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{activity.description}</p>
                                <p className="text-xs text-slate-400 mt-1">{activity.createdAt?.seconds ? new Date(activity.createdAt.seconds * 1000).toLocaleString() : 'Just now'}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  )}

                  {adminTab === 'users' && (
                    <Card className="p-6 bg-white border-slate-100">
                      <h3 className="text-xl font-bold mb-6">User Management</h3>
                      <div className="space-y-4">
                        {allUsers.map(u => (
                          <div key={u.uid} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold">{u.displayName}</p>
                                {u.isPermanentlyBlocked && <Badge variant="danger">Permanently Blocked</Badge>}
                                {u.blockedUntil && new Date(u.blockedUntil.seconds * 1000) > new Date() && (
                                  <Badge variant="warning">Timed Out</Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-500">{u.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-indigo-600 uppercase font-bold">{u.role}</p>
                                {u.role === 'user' && (
                                  <>
                                    <span className="text-xs text-slate-400">•</span>
                                    <p className="text-xs text-emerald-600 uppercase font-bold">Plan: {u.plan || 'base'}</p>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {u.role === 'user' && (
                                <select 
                                  className="text-xs p-1 border border-slate-200 rounded"
                                  value={u.plan || 'base'}
                                  onChange={async (e) => {
                                    try {
                                      await setDoc(doc(db, 'users', u.uid), { plan: e.target.value }, { merge: true });
                                      alert("Plan updated successfully!");
                                    } catch (err) {
                                      console.error("Failed to update plan", err);
                                    }
                                  }}
                                >
                                  <option value="base">Base Plan</option>
                                  <option value="pro">Pro Plan</option>
                                </select>
                              )}
                              {(u.isPermanentlyBlocked || (u.blockedUntil && new Date(u.blockedUntil.seconds * 1000) > new Date())) && (
                                <Button variant="success" className="text-xs" onClick={() => handleUnblock(u.uid, 'user')}>
                                  Unblock
                                </Button>
                              )}
                              <Button variant="outline" className="text-xs" onClick={() => {
                                setTargetToBlock({ uid: u.uid, type: 'user' });
                                setIsBlockingModalOpen(true);
                              }}>
                                {u.isPermanentlyBlocked || (u.blockedUntil && new Date(u.blockedUntil.seconds * 1000) > new Date()) ? 'Update Block' : 'Block / Timeout'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {adminTab === 'lawyers' && (
                    <Card className="p-6 bg-white border-slate-100">
                      <h3 className="text-xl font-bold mb-6">Lawyer Management</h3>
                      <div className="space-y-4">
                        {allLawyers.map(l => (
                          <div key={l.uid} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold">Verified Expert</p>
                                {l.isPermanentlyBlocked && <Badge variant="danger">Permanently Blocked</Badge>}
                                {l.blockedUntil && new Date(l.blockedUntil.seconds * 1000) > new Date() && (
                                  <Badge variant="warning">Timed Out</Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-500">{l.domain} • Rating: {l.rating}</p>
                              <Badge variant={l.verificationStatus === 'verified' ? 'success' : 'warning'}>{l.verificationStatus}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-500">Max Contracts:</label>
                                <input 
                                  type="number" 
                                  className="w-16 p-1 text-xs border border-slate-200 rounded"
                                  defaultValue={l.maxActiveContracts || 5}
                                  onBlur={async (e) => {
                                    try {
                                      await setDoc(doc(db, 'lawyers', l.uid), { maxActiveContracts: parseInt(e.target.value) }, { merge: true });
                                    } catch (err) {
                                      console.error("Failed to update max contracts", err);
                                    }
                                  }}
                                />
                              </div>
                              {(l.isPermanentlyBlocked || (l.blockedUntil && new Date(l.blockedUntil.seconds * 1000) > new Date())) && (
                                <Button variant="success" className="text-xs" onClick={() => handleUnblock(l.uid, 'lawyer')}>
                                  Unblock
                                </Button>
                              )}
                              <Button variant="outline" className="text-xs" onClick={() => {
                                setTargetToBlock({ uid: l.uid, type: 'lawyer' });
                                setIsBlockingModalOpen(true);
                              }}>
                                {l.isPermanentlyBlocked || (l.blockedUntil && new Date(l.blockedUntil.seconds * 1000) > new Date()) ? 'Update Block' : 'Block / Timeout'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {adminTab === 'transactions' && (
                    <Card className="p-6">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <DollarSign className="text-emerald-600" />
                        Transaction History
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                              <th className="pb-4">User</th>
                              <th className="pb-4">Lawyer</th>
                              <th className="pb-4">Amount</th>
                              <th className="pb-4">Status</th>
                              <th className="pb-4">Date</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm">
                            {payments.map((payment) => (
                              <tr key={payment.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                                <td className="py-4 font-medium">{payment.userId.slice(0, 8)}...</td>
                                <td className="py-4 font-medium">{payment.lawyerId.slice(0, 8)}...</td>
                                <td className="py-4 font-bold text-emerald-600">${payment.amount}</td>
                                <td className="py-4"><Badge variant="success">{payment.status}</Badge></td>
                                <td className="py-4 text-slate-400">{payment.createdAt?.seconds ? new Date(payment.createdAt.seconds * 1000).toLocaleDateString() : 'Today'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>

                <div className="space-y-8">
                  {/* Pending Verifications */}
                  <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4">Pending Verifications</h3>
                    <div className="space-y-4">
                      {pendingLawyers.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No pending applications.</p>
                      ) : (
                        pendingLawyers.map((lawyer) => (
                          <div key={lawyer.uid} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                <User size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-bold">Lawyer Applicant</p>
                                <p className="text-xs text-indigo-600">{lawyer.domain}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="primary" className="flex-1 text-xs py-1" onClick={() => handleVerifyLawyer(lawyer.uid, 'verified')}>Approve</Button>
                              <Button variant="danger" className="flex-1 text-xs py-1" onClick={() => handleVerifyLawyer(lawyer.uid, 'rejected')}>Reject</Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 px-6 mt-20 transition-colors bg-white border-slate-200">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Scale size={18} />
              </div>
              <span className="font-bold text-lg">TrustSeal AI</span>
            </div>
            <p className="text-sm text-slate-500">Revolutionizing legal transparency with AI-powered contract intelligence.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Privacy Policy</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              We value your data privacy. All uploaded contracts are processed securely using enterprise-grade encryption. We do not sell your data to third parties.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Terms of Service</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              By using TrustSeal AI, you agree to our terms. Admin reserves the right to block or timeout users/lawyers for policy violations, either permanently or for a specified duration.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Contact</h4>
            <p className="text-sm text-slate-500">support@trustseal.ai</p>
            <div className="flex gap-4 mt-4">
              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400"><Activity size={16} /></div>
              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400"><Shield size={16} /></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
          © 2026 TrustSeal AI. All rights reserved.
        </div>
      </footer>

      <AnimatePresence>
        {isBlockingModalOpen && targetToBlock && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-4 text-red-600">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Ban size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Block Account</h3>
                  <p className="text-sm text-slate-500">Target: {targetToBlock.type} ({targetToBlock.uid.slice(0, 8)}...)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Block Duration</label>
                  <select 
                    id="block-duration"
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1">1 Day</option>
                    <option value="3">3 Days</option>
                    <option value="7">1 Week</option>
                    <option value="30">1 Month</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" className="flex-1" onClick={() => setIsBlockingModalOpen(false)}>Cancel</Button>
                <Button variant="danger" className="flex-1" onClick={async () => {
                  const duration = (document.getElementById('block-duration') as HTMLSelectElement).value;
                  await handleBlock(targetToBlock.uid, targetToBlock.type, duration);
                  setIsBlockingModalOpen(false);
                }}>Confirm Block</Button>
              </div>
            </motion.div>
          </div>
        )}

        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-3xl w-full shadow-2xl relative"
            >
              <Button variant="ghost" className="absolute top-4 right-4" onClick={() => setIsUpgradeModalOpen(false)}>
                <X size={20} />
              </Button>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Upgrade to Pro</h2>
                <p className="text-slate-500">Unlock the full potential of TrustSeal AI</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Base Plan */}
                <Card className="p-6 border-slate-200">
                  <h3 className="text-xl font-bold mb-2">Base Plan</h3>
                  <div className="text-3xl font-bold mb-4">Free</div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-slate-600"><CheckCircle size={16} className="text-emerald-500" /> 10 AI Analyses per month</li>
                    <li className="flex items-center gap-2 text-slate-600"><CheckCircle size={16} className="text-emerald-500" /> Basic Risk Grading</li>
                    <li className="flex items-center gap-2 text-slate-600"><CheckCircle size={16} className="text-emerald-500" /> Access to Lawyer Marketplace</li>
                    <li className="flex items-center gap-2 text-slate-400"><XCircle size={16} /> No Outcome Simulator Chat</li>
                    <li className="flex items-center gap-2 text-slate-400"><XCircle size={16} /> No Advanced Visualizations</li>
                  </ul>
                  <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                </Card>

                {/* Pro Plan */}
                <Card className="p-6 border-indigo-200 bg-indigo-50/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
                  <h3 className="text-xl font-bold mb-2 text-indigo-900">Pro Plan</h3>
                  <div className="text-3xl font-bold mb-4 text-indigo-700">$29<span className="text-lg text-indigo-400 font-normal">/mo</span></div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-indigo-800"><CheckCircle size={16} className="text-indigo-600" /> Unlimited AI Analyses</li>
                    <li className="flex items-center gap-2 text-indigo-800"><CheckCircle size={16} className="text-indigo-600" /> Advanced Risk Grading</li>
                    <li className="flex items-center gap-2 text-indigo-800"><CheckCircle size={16} className="text-indigo-600" /> Priority Lawyer Access</li>
                    <li className="flex items-center gap-2 text-indigo-800"><CheckCircle size={16} className="text-indigo-600" /> Outcome Simulator Chat</li>
                    <li className="flex items-center gap-2 text-indigo-800"><CheckCircle size={16} className="text-indigo-600" /> Advanced Visualizations</li>
                  </ul>
                  <Button 
                    variant="primary" 
                    className="w-full"
                    onClick={async () => {
                      if (!user) return;
                      try {
                        await setDoc(doc(db, 'users', user.uid), { plan: 'pro' }, { merge: true });
                        setProfile(prev => prev ? { ...prev, plan: 'pro' } : null);
                        setIsUpgradeModalOpen(false);
                      } catch (e) {
                        console.error(e);
                        alert("Failed to upgrade.");
                      }
                    }}
                  >
                    Upgrade Now
                  </Button>
                </Card>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
