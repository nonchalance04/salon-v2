// Bring in the tools for the auth provider view so this file can work with the rest of the application.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, type User } from "../../lib/api";

// Describe the information used by the auth provider view so different parts of the application agree on its contents.
type Session = { user: User | null; loading: boolean; error: string; refresh: () => Promise<void>; login: (username: string, password: string) => Promise<void>; logout: () => Promise<void> };
// Prepare the shared staff session so all workspace screens can read the same sign-in state.
const AuthContext = createContext<Session | null>(null);
// Share the staff sign-in state so protected screens can respond to login and logout.
export function AuthProvider({ children }: { children: ReactNode }) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const authenticating = useRef(false);
  const refresh = useCallback(async () => {
    if (authenticating.current) return;
    const attempt = ++generation.current;
    try {
      const result = await api<{ user: User }>("/auth/me");
      if (attempt !== generation.current) return;
      setUser(result.user); setError("");
    }
    catch (err) {
      if (attempt !== generation.current) return;
      setUser(null);
      setError(err instanceof ApiError && err.status === 401 ? "" : "Cannot reach the salon workspace. Please try again.");
    } finally { if (attempt === generation.current) setLoading(false); }
  }, []);
  // Listen for relevant browser actions while this view is open so it responds when the user returns or interacts.
  useEffect(() => {
    void refresh();
    // Clear the remembered staff account so expired access returns to sign-in.
    const expired = () => { generation.current++; setUser(null); };
    // Refresh the account when the window is revisited so access stays current.
    const focus = () => { void refresh(); };
    window.addEventListener("session-expired", expired);
    window.addEventListener("focus", focus);
    return () => { window.removeEventListener("session-expired", expired); window.removeEventListener("focus", focus); };
  }, [refresh]);
  // Submit the staff credentials and remember the returned account so the workspace can open.
  const login = async (username: string, password: string) => {
    generation.current++; authenticating.current = true;
    try {
      setUser((await api<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) })).user);
      setError("");
    } finally { authenticating.current = false; }
  };
  // End the staff session and clear its account so the workspace returns to signed-out access.
  const logout = async () => {
    generation.current++; authenticating.current = true;
    try { await api("/auth/logout", { method: "POST" }); setUser(null); }
    finally { authenticating.current = false; }
  };
  // Show the prepared content and actions so the user can review the information and continue.
  return <AuthContext.Provider value={{ user, loading, error, refresh, login, logout }}>{children}</AuthContext.Provider>;
}
// Read the shared sign-in state so a screen can use the current staff account.
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required.");
  return value;
}
