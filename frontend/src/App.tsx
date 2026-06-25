import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MentorSetup from "./pages/MentorSetup";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Admin from "./pages/Admin";
import Sidebar from "./components/Sidebar";
import { api } from "./api/client";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

type Page = "dashboard" | "schedule" | "admin" | "mentor_setup";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [authView, setAuthView] = useState<"login" | "register" | "mentor_setup">("login");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // URL params でメンター設定ページへのリダイレクト対応
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      localStorage.setItem("token", tokenParam);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.get<User>("/api/auth/me")
      .then((u) => {
        setUser(u);
        if (window.location.pathname === "/mentor/setup") {
          setAuthView("mentor_setup");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  }, []);

  function handleLogin(_token: string, role: string, name: string, userId: number) {
    setUser({ id: userId, name, email: "", role });
    api.get<User>("/api/auth/me").then(setUser).catch(() => {});
    if (role === "mentor" && window.location.pathname === "/mentor/setup") {
      setAuthView("mentor_setup");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    setAuthView("login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    // URL ハッシュで登録画面を出せるようにする（招待リンクとして配布できる）
    const hash = window.location.hash;
    if (authView === "register" || hash === "#register") {
      return (
        <Register
          onLogin={handleLogin}
          onBack={() => {
            setAuthView("login");
            if (hash === "#register") window.location.hash = "";
          }}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        onShowRegister={() => setAuthView("register")}
      />
    );
  }

  if (authView === "mentor_setup" && (user.role === "mentor" || user.role === "admin")) {
    return <MentorSetup onDone={() => { setAuthView("login"); setPage("dashboard"); }} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        currentPage={page}
        onNavigate={(p) => setPage(p as Page)}
        user={user}
        onLogout={handleLogout}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      {/* モバイル用 上部バー */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 z-20 flex items-center px-3 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
          aria-label="メニューを開く"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-xs">47</div>
          <span className="text-sm font-bold text-gray-900">47∞チャプター</span>
        </div>
      </div>
      <main className="md:ml-56 pt-12 md:pt-0 flex-1 min-h-screen overflow-auto">
        {page === "dashboard" && <Dashboard currentUser={user} />}
        {page === "schedule" && <Schedule currentUser={user} />}
        {page === "admin" && user.role === "admin" && <Admin />}
        {page === "mentor_setup" && (user.role === "mentor" || user.role === "admin") && (
          <MentorSetup embedded onDone={() => setPage("dashboard")} />
        )}
      </main>
    </div>
  );
}
