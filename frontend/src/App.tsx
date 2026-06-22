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

type Page = "dashboard" | "schedule" | "admin";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [authView, setAuthView] = useState<"login" | "register" | "mentor_setup">("login");
  const [loading, setLoading] = useState(true);

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
    if (authView === "register") {
      return <Register onLogin={handleLogin} onBack={() => setAuthView("login")} />;
    }
    return (
      <Login
        onLogin={handleLogin}
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
      />
      <main className="ml-56 flex-1 min-h-screen overflow-auto">
        {page === "dashboard" && <Dashboard currentUser={user} />}
        {page === "schedule" && <Schedule currentUser={user} />}
        {page === "admin" && user.role === "admin" && <Admin />}
      </main>
    </div>
  );
}
