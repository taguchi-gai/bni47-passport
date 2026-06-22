import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  facebook_url?: string;
  new_member_id?: number;
  mentor_id?: number;
  program_number?: number;
  zoom_url?: string;
  preferred_meeting?: string;
  is_active: boolean;
}

interface Program {
  id: number;
  number: number;
  title: string;
  mentor_id: number | null;
  mentor_name: string | null;
}

interface Mentor {
  id: number;
  name: string;
  program_number: number | null;
}

export default function Admin() {
  const [members, setMembers] = useState<Member[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"members" | "programs" | "mentors">("members");

  const [newMember, setNewMember] = useState({ name: "", email: "", facebook_url: "", role: "new_member" });
  const [adding, setAdding] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [m, p, mt] = await Promise.all([
        api.get<Member[]>("/api/admin/members"),
        api.get<Program[]>("/api/admin/programs"),
        api.get<Mentor[]>("/api/admin/mentors"),
      ]);
      setMembers(m);
      setPrograms(p);
      setMentors(mt);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post("/api/admin/members", newMember);
      setNewMember({ name: "", email: "", facebook_url: "", role: "new_member" });
      await fetchAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteMember(userId: number) {
    if (!confirm("このメンバーを無効化しますか？")) return;
    try {
      await api.delete(`/api/admin/members/${userId}`);
      await fetchAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    }
  }

  async function handleUpdateProgramMentor(programId: number, mentorId: string) {
    try {
      await api.put(`/api/admin/programs/${programId}`, { mentor_id: mentorId ? Number(mentorId) : null });
      await fetchAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    }
  }

  async function handleUpdateMentorSetting(mentorId: number, field: string, value: string) {
    try {
      await api.put(`/api/admin/mentors/${mentorId}`, { [field]: value || null });
      await fetchAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">読み込み中...</div>;

  const newMembers = members.filter((m) => m.role === "new_member");
  const mentorMembers = members.filter((m) => m.role === "mentor" || m.role === "admin");

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">管理・各種設定</h1>
          <p className="text-gray-500 text-sm mt-1">メンバーの入退会管理と、期ごとのメンター変更を行います</p>
        </div>
        <div className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">第12期</div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

      <div className="flex gap-2 mb-6">
        {(["members", "programs", "mentors"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-400"
            }`}
          >
            {t === "members" ? "新メンバー管理" : t === "programs" ? "プログラム担当変更" : "メンター設定"}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <span>👥</span> 新メンバー（入会登録）
              </h2>
            </div>
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["メンバー氏名", "通知用GMAIL", "FACEBOOK", "完了状況", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {newMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{m.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.email}</td>
                    <td className="px-4 py-3 text-sm">
                      {m.facebook_url ? (
                        <a href={m.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">
                          Facebook
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">—/10</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteMember(m.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">+ 新規入会メンバーを追加</h3>
              <form onSubmit={handleAddMember} className="flex gap-3 flex-wrap">
                <input
                  placeholder="氏名"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
                  required
                />
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
                  required
                />
                <input
                  placeholder="Facebook URL（任意）"
                  value={newMember.facebook_url}
                  onChange={(e) => setNewMember({ ...newMember, facebook_url: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
                />
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="new_member">新メンバー</option>
                  <option value="mentor">メンター</option>
                  <option value="admin">管理者</option>
                </select>
                <button
                  type="submit"
                  disabled={adding}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {adding ? "追加中..." : "追加"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {tab === "programs" && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-900">プログラム担当・メンター変更（期の交替）</h2>
            <p className="text-xs text-gray-500 mt-1">変更すると最終更新日が記録されます</p>
          </div>
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">プログラム</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">メンター名</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">通知先GMAIL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {programs.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-xs text-indigo-600 font-semibold">プログラム第{p.number}号</span>
                    <p className="text-sm text-gray-700 mt-0.5 line-clamp-1">{p.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.mentor_id ?? ""}
                      onChange={(e) => handleUpdateProgramMentor(p.id, e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">未設定</option>
                      {mentors.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {mentorMembers.find((m) => m.mentor_id === p.mentor_id)?.email ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "mentors" && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-900">メンター設定（Zoom URL / 会議方法）</h2>
          </div>
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">氏名</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">会議方法</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Zoom URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mentors.map((m) => {
                const fullMentor = mentorMembers.find((mm) => mm.mentor_id === m.id);
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-sm text-gray-900">{m.name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={fullMentor?.preferred_meeting ?? "google_meet"}
                        onChange={(e) => handleUpdateMentorSetting(m.id, "preferred_meeting", e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="google_meet">Google Meet</option>
                        <option value="zoom">Zoom</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={fullMentor?.zoom_url ?? ""}
                        onBlur={(e) => handleUpdateMentorSetting(m.id, "zoom_url", e.target.value)}
                        placeholder="https://zoom.us/j/..."
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
