import { useState } from "react";
import { loginRequest } from "../api/client";

interface Props {
  onLogin: (token: string, role: string, name: string, userId: number) => void;
  onShowRegister?: () => void;
}

export default function Login({ onLogin, onShowRegister }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await loginRequest(email, password);
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
        <h2 className="text-xl font-semibold text-gray-800 mb-6">ログイン</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          アカウントをお持ちでない方は{" "}
          {onShowRegister ? (
            <button
              type="button"
              onClick={onShowRegister}
              className="text-indigo-600 hover:underline font-medium"
            >
              新規登録
            </button>
          ) : (
            <span>新規登録</span>
          )}
        </p>
      </div>
    </div>
  );
}
