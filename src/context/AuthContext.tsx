import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Employee } from '../types';

interface AuthContextType {
  user: User | null;
  employeeData: Employee | null;
  loading: boolean;
  isHR: boolean;
  isManager: boolean;
  isEmployee: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const isFetchingRef = useRef(false);
  const initializedRef = useRef(false);

  // 🔹 Fetch employee (SAFE + SINGLE CALL)
  const fetchEmployeeData = async (u: User) => {
    if (isFetchingRef.current) return;

    // 🔥 NEW: skip if already loaded
    if (employeeData && employeeData.auth_user_id === u.id) {
      console.log("⏭ Employee already loaded");
      return;
    }

    isFetchingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', u.id)
        .single();

      if (!error) {
        setEmployeeData(data);
      } else {
        setEmployeeData(null);
      }

    } finally {
      isFetchingRef.current = false;
    }
  };

  // 🔥 STEP 1: INITIAL SESSION (FIXES REFRESH ISSUE)
  useEffect(() => {
    const init = async () => {
      console.log("⚡ Initial session check");

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ Session error:", error.message);
        }

        if (session?.user) {
          console.log("✅ Session found");

          setUser(session.user);
          await fetchEmployeeData(session.user);
        } else {
          console.log("🚪 No session");

          setUser(null);
          setEmployeeData(null);
        }
      } catch (err) {
        console.error("❌ Init error:", err);
      } finally {
        initializedRef.current = true; // 🔥 VERY IMPORTANT
        setLoading(false);
      }
    };

    init();
  }, []);

  // 🔥 STEP 2: AUTH LISTENER (POST-INIT ONLY)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔄 EVENT:", event);

        // ⛔ wait for initial session
        if (!initializedRef.current) return;

        try {
          const newUser = session?.user ?? null;

          // 🔥 IMPORTANT: prevent duplicate calls
          if (newUser?.id === user?.id) {
            console.log("⏭ Same user → skip fetch");
            return;
          }

          if (newUser) {
            console.log("✅ SIGNED IN");

            setLoading(true); // 🔥 start loading

            setUser(newUser);
            await fetchEmployeeData(newUser);

          } else {
            console.log("🚪 SIGNED OUT");

            setUser(null);
            setEmployeeData(null);
          }

        } catch (err) {
          console.error("❌ Auth error:", err);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [user]);


  // 🔹 Roles
  const isHR = employeeData?.role === 'hr';
  const isManager = employeeData?.role === 'manager';
  const isEmployee = employeeData?.role === 'employee';

  // 🔹 Logout
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employeeData,
        loading,
        isHR,
        isManager,
        isEmployee,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 🔹 Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};