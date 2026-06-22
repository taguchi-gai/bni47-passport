import { useState } from "react";
import { api } from "../api/client";

interface Props {
  onLogin: (token: string, role: string, name: string, userId: number) => void;
  onBack: () => void;
}

export default function Register({ onLogin, onBack }: Props) {
  const [form, setForm] = useState({ name: "", email: "", password: "", facebook_url: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.post<{
        access_token: string; role: string; name: string; user_id: number;
      }>("/api/auth/register", form);
      localStorage.setItem("token", data.access_token);
      onLogin(data.access_token, data.role, data.name, data.user_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            47
          </div>
          <div>
            <h1 className="font-bold text-gray-900">47∞チャプター</h1>
            <p className="text-sm text-gray-500">パスポートプログラム</p>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">新メンバー登録</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "お名前", key: "name", type: "text" },
            { label: "メールアドレス", key: "email", type: "email" },
            { label: "パスワード", key: "password", type: "password" },
            { label: "Facebook URL（任意）", key: "facebook_url", type: "url" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required={key !== "facebook_url"}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? "登録中..." : "登録する"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full text-gray-500 text-sm hover:underline"
          >
            ← ログインに戻る
          </button>
        </form>
      </div>
    </div>
  );
}
