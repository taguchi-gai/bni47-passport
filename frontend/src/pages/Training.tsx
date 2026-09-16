import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Training {
  id: number;
  name: string;
  display_order: number;
  recommended_days: number | null;
}

interface TrainingRecord {
  is_completed: boolean;
  completed_at: string | null;
  completed_by_name: string | null;
}

interface TrainingMember {
  id: number;
  name: string;
  email: string;
  first_meeting_date: string | null;
  records: Record<number, TrainingRecord>;
  completed_count: number;
  total_count: number;
}

interface TrainingData {
  trainings: Training[];
  members: TrainingMember[];
}

interface Props {
  currentUser: { id: number; name: string; role: string };
}

type DeadlineLevel = "overdue" | "soon" | "ok";

interface DeadlineStatus {
  level: DeadlineLevel;
  label: string;
  dueLabel: string;
}

// first_meeting_date は日付のみを意味するので、タイムゾーン変換を避けて先頭10文字を使う
function deadlineStatus(
  firstMeeting: string | null,
  days: number | null,
  completed: boolean
): DeadlineStatus | null {
  if (completed || !firstMeeting || !days) return null;

  const base = new Date(`${firstMeeting.slice(0, 10)}T00:00:00`);
  if (isNaN(base.getTime())) return null;

  const due = new Date(base);
  due.setDate(due.getDate() + days);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  const dueLabel = `${due.getMonth() + 1}/${due.getDate()}まで`;

  if (diffDays < 0) return { level: "overdue", label: `${Math.abs(diffDays)}日超過`, dueLabel };
  if (diffDays <= 7) return { level: "soon", label: `残${diffDays}日`, dueLabel };
  return { level: "ok", label: `残${diffDays}日`, dueLabel };
}

const DEADLINE_STYLES: Record<DeadlineLevel, string> = {
  overdue: "bg-red-100 text-red-700",
  soon: "bg-amber-100 text-amber-700",
  ok: "bg-gray-100 text-gray-500",
};

const checkIcon = (
  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function Training({ currentUser }: Props) {
  const [data, setData] = useState<TrainingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const isNewMember = currentUser.role === "new_member";
  const canEditDate = currentUser.role === "admin" || currentUser.role === "mentor";

  const fetchData = async () => {
    try {
      const d = await api.get<TrainingData>("/api/trainings/records");
      setData(d);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  async function handleToggle(memberId: number, trainingId: number) {
    const key = `${memberId}-${trainingId}`;
    setToggling(key);

    // 楽観的更新: サーバー応答前にローカル state を反転
    setData((prev) => {
      if (!prev) return prev;
      const members = prev.members.map((m) => {
        if (m.id !== memberId) return m;
        const current = m.records[trainingId];
        const nextCompleted = !current?.is_completed;
        const records = {
          ...m.records,
          [trainingId]: {
            is_completed: nextCompleted,
            completed_at: nextCompleted ? new Date().toISOString() : null,
            completed_by_name: nextCompleted ? currentUser.name : null,
          },
        };
        const completed_count = Object.values(records).filter((r) => r.is_completed).length;
        return { ...m, records, completed_count };
      });
      return { ...prev, members };
    });

    try {
      await api.patch(`/api/trainings/records/${memberId}/${trainingId}`);
      await fetchData();
    } catch (err: unknown) {
      await fetchData();
      alert(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setToggling(null);
    }
  }

  async function handleFirstMeetingDate(memberId: number, value: string) {
    try {
      await api.put(`/api/trainings/members/${memberId}/first-meeting-date`, {
        first_meeting_date: value || null,
      });
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "初回定例会日の更新に失敗しました");
      await fetchData();
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">読み込み中...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!data) return null;

  const me = isNewMember && data.members.length > 0 ? data.members[0] : null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">トレーニング</h1>
        <p className="text-gray-500 text-sm mt-1">
          {isNewMember
            ? "受講が完了したトレーニングにチェックを入れてください"
            : "新メンバーのBNIトレーニング受講状況を管理します"}
        </p>
      </div>

      {/* 新メンバー向け: 自分のチェックリスト */}
      {isNewMember && me && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{me.name}</h2>
                <p className="text-sm text-gray-500">
                  初回定例会：
                  {me.first_meeting_date
                    ? me.first_meeting_date.slice(0, 10).replace(/-/g, "/")
                    : "未設定（メンターにご確認ください）"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-indigo-600">
                  {me.completed_count}
                  <span className="text-base text-gray-400"> / {me.total_count}</span>
                </div>
                <div className="text-xs text-gray-500">受講済み</div>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all"
                style={{ width: `${(me.completed_count / Math.max(me.total_count, 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
            {data.trainings.map((t) => {
              const record = me.records[t.id];
              const completed = !!record?.is_completed;
              const status = deadlineStatus(me.first_meeting_date, t.recommended_days, completed);
              const key = `${me.id}-${t.id}`;
              return (
                <button
                  key={t.id}
                  onClick={() => handleToggle(me.id, t.id)}
                  disabled={toggling === key}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition ${
                      completed
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {completed && checkIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
                      {t.name}
                    </div>
                    {t.recommended_days && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        初回定例会から{t.recommended_days}日以内に受講推奨
                      </div>
                    )}
                  </div>
                  {status && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${DEADLINE_STYLES[status.level]}`}>
                      {status.label}
                    </span>
                  )}
                  {completed && record?.completed_by_name && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {record.completed_by_name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* メンター・管理者向け: メンバー × トレーニングのマトリクス */}
      {!isNewMember && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 min-w-[140px] sticky left-0 bg-gray-50">
                    メンバー
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 min-w-[130px]">
                    初回定例会
                  </th>
                  {data.trainings.map((t) => (
                    <th
                      key={t.id}
                      className="px-2 py-3 text-center text-xs font-semibold text-gray-600 min-w-[92px]"
                      title={t.recommended_days ? `${t.recommended_days}日以内に受講推奨` : undefined}
                    >
                      <div className="leading-tight">{t.name}</div>
                      {t.recommended_days && (
                        <div className="text-[10px] font-normal text-gray-400 mt-0.5">
                          {t.recommended_days}日以内
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.members.map((member, idx) => (
                  <tr key={member.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className={`px-4 py-3 sticky left-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                      <div className="text-xs text-gray-400">
                        {member.completed_count}/{member.total_count}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {canEditDate ? (
                        <input
                          type="date"
                          defaultValue={member.first_meeting_date ? member.first_meeting_date.slice(0, 10) : ""}
                          key={`fmd-${member.id}-${member.first_meeting_date ?? ""}`}
                          onChange={(e) => handleFirstMeetingDate(member.id, e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          title="入会後に最初に参加した定例会の日付"
                        />
                      ) : (
                        <span className="text-xs text-gray-500">
                          {member.first_meeting_date ? member.first_meeting_date.slice(0, 10) : "—"}
                        </span>
                      )}
                    </td>
                    {data.trainings.map((t) => {
                      const record = member.records[t.id];
                      const completed = !!record?.is_completed;
                      const status = deadlineStatus(member.first_meeting_date, t.recommended_days, completed);
                      const key = `${member.id}-${t.id}`;
                      return (
                        <td key={t.id} className="px-2 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handleToggle(member.id, t.id)}
                              disabled={toggling === key}
                              title={
                                completed
                                  ? `クリックで取り消し${record?.completed_by_name ? `（${record.completed_by_name}が記録）` : ""}`
                                  : "クリックで受講完了にする"
                              }
                              className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center transition disabled:opacity-50 ${
                                completed
                                  ? "bg-emerald-500 hover:bg-amber-500"
                                  : "border-2 border-gray-300 bg-white hover:border-emerald-500 hover:bg-emerald-50"
                              }`}
                            >
                              {completed && checkIcon}
                            </button>
                            {status && status.level !== "ok" && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${DEADLINE_STYLES[status.level]}`}>
                                {status.label}
                              </span>
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
          {data.members.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              新メンバーが登録されていません
            </div>
          )}
        </div>
      )}

      {!isNewMember && (
        <p className="mt-4 text-xs text-gray-500">
          「初回定例会」は入会後に最初に参加した定例会の日付です。MSP2.0（30日以内）とアクセラレーター（90日以内）の推奨期限の起算日になります。
        </p>
      )}
    </div>
  );
}
