import { useState } from "react";
import { api } from "../api/client";

interface Props {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/forgot-password", { email });
      setDone(true);
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
        <h2 className="text-xl font-semibold text-gray-800 mb-6">パスワードをお忘れの方</h2>

        {done ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              登録されているメールアドレスであれば、再設定用のリンクを記載したメールを送信しました。メールをご確認ください。
            </div>
            <button
              type="button"
              onClick={onBack}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              ログイン画面に戻る
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">
              登録しているメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
            </p>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? "送信中..." : "再設定メールを送信"}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full text-sm text-gray-500 hover:underline"
            >
              ログイン画面に戻る
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
