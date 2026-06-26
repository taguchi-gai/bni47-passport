import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Program {
  id: number;
  number: number;
  title: string;
  mentor_id: number | null;
  mentor_name: string | null;
}

interface BookingInfo {
  booking_id: number;
  is_completed: boolean;
  completed_at: string | null;
  start_datetime: string | null;
  meeting_url: string | null;
}

interface Member {
  id: number;
  name: string;
  email: string;
  completed_count: number;
  total_count: number;
  bookings: Record<number, BookingInfo>;
}

interface DashboardData {
  members: Member[];
  programs: Program[];
}

interface Props {
  currentUser: { id: number; name: string; role: string };
}

export default function Dashboard({ currentUser }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const d = await api.get<DashboardData>("/api/admin/dashboard");
      setData(d);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  async function handleManualComplete(memberId: number, programNumber: number) {
    if (!confirm(`プログラム#${programNumber}を「過去に完了済み」として記録しますか？\n（実施日時の記録なしで完了扱いになります）`)) return;
    try {
      await api.post("/api/admin/manual-complete", {
        new_member_id: memberId,
        program_number: programNumber,
      });
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "記録に失敗しました");
    }
  }

  async function handleComplete(bookingId: number) {
    setCompleting(bookingId);
    // 楽観的更新: サーバー応答前にローカル state を即座に反転
    setData((prev) => {
      if (!prev) return prev;
      const members = prev.members.map((m) => {
        const updatedBookings: Record<number, BookingInfo> = {};
        let changed = false;
        for (const [k, b] of Object.entries(m.bookings)) {
          if (b.booking_id === bookingId) {
            updatedBookings[Number(k)] = {
              ...b,
              is_completed: !b.is_completed,
              completed_at: !b.is_completed ? new Date().toISOString() : null,
            };
            changed = true;
          } else {
            updatedBookings[Number(k)] = b;
          }
        }
        if (!changed) return m;
        const completed_count = Object.values(updatedBookings).filter((b) => b.is_completed).length;
        return { ...m, bookings: updatedBookings, completed_count };
      });
      return { ...prev, members };
    });
    try {
      await api.patch(`/api/bookings/${bookingId}/complete`);
      await fetchData();
    } catch (err: unknown) {
      // 失敗時は再取得して元に戻す
      await fetchData();
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setCompleting(null);
    }
  }

  function formatDate(dt: string | null) {
    if (!dt) return "";
    // バックは naive datetime を UTC として保存・返却するので、Z を補ってパース
    const iso = /[Zz]|[+-]\d{2}:?\d{2}$/.test(dt) ? dt : dt + "Z";
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!data) return null;

  const myMentorProgram = data.programs.find(
    (p) => p.mentor_name === currentUser.name
  );

  const isAdmin = currentUser.role === "admin";
  const isNewMember = currentUser.role === "new_member";
  // 新メンバーの場合、バックは自分のデータのみ返すので members[0] が自分
  const me = isNewMember && data.members.length > 0 ? data.members[0] : null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isNewMember
              ? "あなたのプログラム進捗と予定されているメンター面談の日程を確認できます"
              : "プログラム進捗と予定されているメンター面談の日程を確認できます"}
          </p>
        </div>
        <div className="text-sm text-gray-500">第12期</div>
      </div>

      {isNewMember && me && (
        <div className="mb-6 bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{me.name}</h2>
              <p className="text-sm text-gray-500">あなたの進捗</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">
                {me.completed_count}<span className="text-base text-gray-400"> / {me.total_count}</span>
              </div>
              <div className="text-xs text-gray-500">完了済みプログラム</div>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-full transition-all"
              style={{ width: `${(me.completed_count / Math.max(me.total_count, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 min-w-[140px]">
                  メンバー
                </th>
                {data.programs.map((p) => (
                  <th key={p.id} className="px-3 py-3 text-center text-sm font-semibold text-gray-600 min-w-[80px]">
                    #{p.number}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.members.map((member, idx) => (
                <tr key={member.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                    <div className="text-xs text-gray-400">
                      {member.completed_count}/{member.total_count}
                    </div>
                  </td>
                  {data.programs.map((p) => {
                    const booking = member.bookings[p.number];
                    const isMyProgram = isAdmin || myMentorProgram?.number === p.number;

                    if (!booking) {
                      return (
                        <td key={p.id} className="px-3 py-3 text-center">
                          {isAdmin ? (
                            <button
                              onClick={() => handleManualComplete(member.id, p.number)}
                              title="過去に完了したものとして記録"
                              className="text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 rounded w-7 h-7 mx-auto flex items-center justify-center text-xs transition"
                            >
                              ＋
                            </button>
                          ) : (
                            <span className="text-gray-200 text-lg">—</span>
                          )}
                        </td>
                      );
                    }

                    if (booking.is_completed) {
                      const checkIcon = (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      );
                      return (
                        <td key={p.id} className="px-3 py-3 text-center">
                          {isMyProgram ? (
                            <button
                              onClick={() => handleComplete(booking.booking_id)}
                              disabled={completing === booking.booking_id}
                              title="クリックで完了を取り消す"
                              className="w-7 h-7 bg-emerald-500 hover:bg-amber-500 rounded-full mx-auto flex items-center justify-center transition disabled:opacity-50"
                            >
                              {checkIcon}
                            </button>
                          ) : (
                            <div className="w-7 h-7 bg-emerald-500 rounded-full mx-auto flex items-center justify-center">
                              {checkIcon}
                            </div>
                          )}
                        </td>
                      );
                    }

                    const startDate = booking.start_datetime
                      ? new Date(
                          /[Zz]|[+-]\d{2}:?\d{2}$/.test(booking.start_datetime)
                            ? booking.start_datetime
                            : booking.start_datetime + "Z"
                        )
                      : null;
                    const isFuture = startDate ? startDate > new Date() : false;
                    return (
                      <td key={p.id} className="px-3 py-3 text-center relative">
                        {isMyProgram && (
                          <button
                            onClick={() => handleComplete(booking.booking_id)}
                            disabled={completing === booking.booking_id || isFuture}
                            title={isFuture ? "予約日時が経過してから完了マークできます" : "クリックで完了にする"}
                            className={`absolute top-1.5 right-1.5 w-4 h-4 border-2 rounded disabled:cursor-not-allowed ${
                              isFuture
                                ? "border-gray-200 bg-gray-50 opacity-50"
                                : "border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50"
                            }`}
                          />
                        )}
                        <div className="flex flex-col items-center gap-1">
                          <div className="bg-indigo-100 text-indigo-700 rounded px-2 py-0.5 text-xs font-medium">
                            {formatDate(booking.start_datetime)}
                          </div>
                          {booking.meeting_url && (
                            <a
                              href={booking.meeting_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline"
                            >
                              参加
                            </a>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {data.programs.map((p) => (
          <div key={p.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-400">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-600">プログラム第{p.number}号</span>
                <p className="text-sm font-medium text-gray-900 mt-1 line-clamp-2">{p.title}</p>
              </div>
              <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            {p.mentor_name && (
              <p className="text-xs text-gray-500 mt-2">
                <span className="font-medium">メンター：</span>{p.mentor_name}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
