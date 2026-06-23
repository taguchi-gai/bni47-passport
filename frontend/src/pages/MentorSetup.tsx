import { useState, useEffect } from "react";
import { api } from "../api/client";

interface Props {
  onDone: () => void;
  embedded?: boolean;
}

export default function MentorSetup({ onDone, embedded = false }: Props) {
  const [zoomUrl, setZoomUrl] = useState("");
  const [preferredMeeting, setPreferredMeeting] = useState("google_meet");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<{ zoom_url: string | null; preferred_meeting: string }>("/api/mentors/me")
      .then((data) => {
        if (data.zoom_url) setZoomUrl(data.zoom_url);
        if (data.preferred_meeting) setPreferredMeeting(data.preferred_meeting);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/api/mentors/me/setup", {
        zoom_url: zoomUrl || null,
        preferred_meeting: preferredMeeting,
      });
      if (embedded) {
        setSuccess("設定を保存しました");
      } else {
        onDone();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  const containerClass = embedded
    ? "p-6"
    : "min-h-screen bg-gray-50 flex items-center justify-center";
  const cardClass = embedded
    ? "bg-white rounded-xl shadow p-8 w-full max-w-md"
    : "bg-white rounded-xl shadow p-8 w-full max-w-md";

  return (
    <div className={containerClass}>
      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            47
          </div>
          <div>
            <h1 className="font-bold text-gray-900">47∞チャプター</h1>
            <p className="text-sm text-gray-500">メンター初期設定</p>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">会議方法の設定</h2>
        <p className="text-sm text-gray-500 mb-6">面談で使用する会議ツールを選択してください。</p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 text-sm">{success}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">会議ツール</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="google_meet"
                  checked={preferredMeeting === "google_meet"}
                  onChange={() => setPreferredMeeting("google_meet")}
                  className="text-indigo-600"
                />
                <div>
                  <p className="font-medium text-gray-900">Google Meet（推奨）</p>
                  <p className="text-xs text-gray-500">予約時に自動でMeet URLが生成されます</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="zoom"
                  checked={preferredMeeting === "zoom"}
                  onChange={() => setPreferredMeeting("zoom")}
                  className="text-indigo-600"
                />
                <div>
                  <p className="font-medium text-gray-900">Zoom（固定URL）</p>
                  <p className="text-xs text-gray-500">自分のZoom URLを毎回使用します</p>
                </div>
              </label>
            </div>
          </div>
          {preferredMeeting === "zoom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zoom URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={zoomUrl}
                onChange={(e) => setZoomUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required={preferredMeeting === "zoom"}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? "保存中..." : embedded ? "設定を保存" : "設定を保存してダッシュボードへ"}
          </button>
        </form>
      </div>
    </div>
  );
}
