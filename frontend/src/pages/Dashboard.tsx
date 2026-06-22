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

  async function handleComplete(bookingId: number) {
    setCompleting(bookingId);
    try {
      await api.patch(`/api/bookings/${bookingId}/complete`);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setCompleting(null);
    }
  }

  function formatDate(dt: string | null) {
    if (!dt) return "";
    const d = new Date(dt);
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-500 text-sm mt-1">プログラム進捗と予定されているメンター面談の日程を確認できます</p>
        </div>
        <div className="text-sm text-gray-500">第12期</div>
      </div>

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
                    const isMyProgram = myMentorProgram?.number === p.number;

                    if (!booking) {
                      return (
                        <td key={p.id} className="px-3 py-3 text-center">
                          <span className="text-gray-200 text-lg">—</span>
                        </td>
                      );
                    }

                    if (booking.is_completed) {
                      return (
                        <td key={p.id} className="px-3 py-3 text-center">
                          <div className="w-7 h-7 bg-emerald-500 rounded-full mx-auto flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={p.id} className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="bg-indigo-100 text-indigo-700 rounded px-2 py-0.5 text-xs font-medium">
                            {formatDate(booking.start_datetime)}
                          </div>
                          {isMyProgram && (
                            <button
                              onClick={() => handleComplete(booking.booking_id)}
                              disabled={completing === booking.booking_id}
                              className="text-xs text-emerald-600 hover:text-emerald-700 underline disabled:opacity-50"
                            >
                              {completing === booking.booking_id ? "..." : "完了"}
                            </button>
                          )}
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
