import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Slot {
  id: number;
  start_datetime: string;
  is_booked: boolean;
  booked_mentor_name?: string | null;
  booked_program_number?: number | null;
}

interface NewMember {
  id: number;
  name: string;
  available_slots: Slot[];
  already_booked: boolean;
}

interface Program {
  id: number;
  number: number;
  title: string;
}

interface Props {
  currentUser: { id: number; name: string; role: string };
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8〜20時

function getWeekDays(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const sunday = new Date(baseDate);
  sunday.setDate(baseDate.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function sameHour(a: Date, b: Date) {
  return sameDay(a, b) && a.getHours() === b.getHours();
}

// バックエンドは naive datetime を UTC として保存・返却するため、
// "Z" がない ISO 文字列に Z を補って UTC として解釈させる
function parseServerDate(s: string): Date {
  if (!s) return new Date(NaN);
  return /[Zz]|[+-]\d{2}:?\d{2}$/.test(s) ? new Date(s) : new Date(s + "Z");
}

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default function Schedule({ currentUser }: Props) {
  const [weekBase, setWeekBase] = useState(new Date());
  const [mySlots, setMySlots] = useState<Slot[]>([]);
  const [newMembers, setNewMembers] = useState<NewMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<NewMember | null>(null);
  const [myProgram, setMyProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingSlotId, setBookingSlotId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const isMentor = currentUser.role === "mentor" || currentUser.role === "admin";
  const isNewMember = currentUser.role === "new_member";

  const weekDays = getWeekDays(weekBase);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isNewMember) {
        const slots = await api.get<Slot[]>("/api/availability/my");
        setMySlots(slots);
      } else {
        const [members, mentorInfo] = await Promise.all([
          api.get<NewMember[]>("/api/mentors/new-members"),
          api.get<{ program: Program | null }>("/api/mentors/me"),
        ]);
        setNewMembers(members);
        setMyProgram(mentorInfo.program);
        if (members.length > 0) setSelectedMember(members[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  async function toggleSlot(date: Date, hour: number) {
    if (!isNewMember) return;
    const dt = new Date(date);
    dt.setHours(hour, 0, 0, 0);
    const dtStr = dt.toISOString();

    const existing = mySlots.find((s) => sameHour(parseServerDate(s.start_datetime), dt));
    if (existing) {
      if (existing.is_booked) return;
      try {
        await api.delete(`/api/availability/${existing.id}`);
        setMySlots((prev) => prev.filter((s) => s.id !== existing.id));
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "削除に失敗しました");
      }
    } else {
      try {
        const slot = await api.post<Slot>("/api/availability/", { start_datetime: dtStr });
        setMySlots((prev) => [...prev, slot]);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "追加に失敗しました");
      }
    }
  }

  async function bookSlot(slotId: number) {
    if (!myProgram || !selectedMember) return;
    setBookingSlotId(slotId);
    try {
      await api.post("/api/bookings/", { slot_id: slotId, program_id: myProgram.id });
      alert("予約が完了しました！メールで通知が送られます。");
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "予約に失敗しました");
    } finally {
      setBookingSlotId(null);
    }
  }

  function getSlotForCell(day: Date, hour: number, slots: Slot[]) {
    return slots.find((s) => sameHour(parseServerDate(s.start_datetime), (() => {
      const d = new Date(day); d.setHours(hour, 0, 0, 0); return d;
    })()));
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">読み込み中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">スケジュール調整</h1>
      <p className="text-gray-500 text-sm mb-6">
        {isNewMember ? "空いている時間をクリックして選択してください" : "新メンバーの空き時間を確認し、1つ予約してください"}
      </p>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
      {isMentor && !myProgram && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
          あなたは現在どのプログラムにも割り当てられていません。予約するには、管理者に「プログラム担当」を割り当ててもらってください。
        </div>
      )}

      <div className="flex gap-6">
        {isMentor && (
          <div className="w-48 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">対象メンバー</h3>
            <div className="space-y-2">
              {newMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMember(m)}
                  className={`w-full text-left p-3 rounded-lg border transition text-sm ${
                    selectedMember?.id === m.id
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-indigo-400"
                  }`}
                >
                  <div className="font-medium">{m.name}</div>
                  <div className={`text-xs mt-0.5 ${selectedMember?.id === m.id ? "text-indigo-200" : "text-gray-400"}`}>
                    空き枠：{m.available_slots.filter((s) => !s.is_booked).length}件
                  </div>
                  {m.already_booked && (
                    <div className={`text-xs mt-0.5 ${selectedMember?.id === m.id ? "text-green-200" : "text-green-600"}`}>
                      ✓ 予約済み
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 bg-white rounded-xl shadow overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <button
              onClick={() => {
                const d = new Date(weekBase);
                d.setDate(d.getDate() - 7);
                setWeekBase(d);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ‹
            </button>
            <span className="font-semibold text-gray-700">
              {weekDays[0].getFullYear()}年{weekDays[0].getMonth() + 1}月
            </span>
            <button
              onClick={() => {
                const d = new Date(weekBase);
                d.setDate(d.getDate() + 7);
                setWeekBase(d);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ›
            </button>
          </div>

          <div className="overflow-auto max-h-[600px]">
            <table className="min-w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className="w-14 border-b border-r" />
                  {weekDays.map((d) => {
                    const isToday = sameDay(d, new Date());
                    return (
                      <th key={d.toISOString()} className="border-b text-center py-2 px-1 min-w-[80px]">
                        <div className={`text-xs text-gray-500 ${d.getDay() === 0 ? "text-red-400" : d.getDay() === 6 ? "text-blue-400" : ""}`}>
                          {DAY_LABELS[d.getDay()]}
                        </div>
                        <div className={`text-sm font-semibold w-7 h-7 mx-auto flex items-center justify-center rounded-full ${isToday ? "bg-indigo-600 text-white" : "text-gray-700"}`}>
                          {d.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour} className="border-b">
                    <td className="border-r text-xs text-gray-400 text-right pr-2 py-2 w-14">
                      {hour}:00
                    </td>
                    {weekDays.map((day) => {
                      const slots = isNewMember
                        ? mySlots
                        : (selectedMember?.available_slots ?? []);
                      const slot = getSlotForCell(day, hour, slots);
                      const isPast = (() => {
                        const d = new Date(day); d.setHours(hour, 0, 0, 0);
                        return d < new Date();
                      })();

                      if (isNewMember) {
                        const selected = !!slot;
                        const booked = slot?.is_booked;
                        return (
                          <td
                            key={day.toISOString()}
                            onClick={() => !isPast && !booked && toggleSlot(day, hour)}
                            className={`border-r h-10 cursor-pointer transition ${
                              booked
                                ? "bg-green-400"
                                : selected
                                ? "bg-indigo-500"
                                : isPast
                                ? "bg-gray-50 cursor-default"
                                : "hover:bg-indigo-50"
                            }`}
                          />
                        );
                      }

                      if (!slot) {
                        return <td key={day.toISOString()} className="border-r h-10 bg-gray-50" />;
                      }

                      if (slot.is_booked) {
                        const label = slot.booked_mentor_name
                          ? `${slot.booked_mentor_name}${slot.booked_program_number ? ` #${slot.booked_program_number}` : ""}`
                          : "予約済み";
                        return (
                          <td key={day.toISOString()} className="border-r h-10 p-0.5">
                            <div
                              title={label}
                              className="w-full h-full bg-emerald-100 text-emerald-800 text-[10px] leading-tight rounded flex items-center justify-center px-1 text-center truncate"
                            >
                              {label}
                            </div>
                          </td>
                        );
                      }

                      const isDisabled = bookingSlotId === slot.id || selectedMember?.already_booked;
                      return (
                        <td key={day.toISOString()} className="border-r h-10 p-0.5">
                          <button
                            onClick={() => bookSlot(slot.id)}
                            disabled={isDisabled}
                            title={selectedMember?.already_booked ? "このメンバーは既に予約済みです" : "この枠を予約する"}
                            className={`w-full h-full text-xs rounded transition ${
                              isDisabled
                                ? "bg-indigo-200 cursor-not-allowed"
                                : "bg-indigo-500 hover:bg-indigo-600"
                            }`}
                          >
                            {bookingSlotId === slot.id ? <span className="text-white">…</span> : ""}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isNewMember && (
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-500 rounded" />
            <span className="text-gray-600">選択済み</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-400 rounded" />
            <span className="text-gray-600">予約確定</span>
          </div>
        </div>
      )}
    </div>
  );
}
