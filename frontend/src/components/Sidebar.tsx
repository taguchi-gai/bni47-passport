interface Props {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: { name: string; email: string; role: string };
  onLogout: () => void;
}

const navItems = [
  { key: "dashboard", label: "ダッシュボード", icon: "⊞" },
  { key: "schedule", label: "スケジュール調整", icon: "📅" },
];

const mentorItems = [
  { key: "mentor_setup", label: "メンター設定", icon: "🎧" },
];

const adminItems = [
  { key: "admin", label: "管理・設定", icon: "⚙️" },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "責任者",
  mentor: "メンター",
  new_member: "新メンバー",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  mentor: "bg-blue-100 text-blue-700",
  new_member: "bg-green-100 text-green-700",
};

export default function Sidebar({ currentPage, onNavigate, user, onLogout }: Props) {
  const showAdmin = user.role === "admin";
  const showMentor = user.role === "mentor" || user.role === "admin";
  const showSchedule = user.role !== "new_member" || true;

  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            47
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">47∞チャプター</div>
            <div className="text-xs text-gray-500">パスポート</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          if (item.key === "schedule" && !showSchedule) return null;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                currentPage === item.key
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          );
        })}

        {showMentor && (
          <>
            <div className="pt-2 pb-1">
              <p className="text-xs font-semibold text-gray-400 px-3 uppercase tracking-wide">メンター</p>
            </div>
            {mentorItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  currentPage === item.key
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </>
        )}

        {showAdmin && (
          <>
            <div className="pt-2 pb-1">
              <p className="text-xs font-semibold text-gray-400 px-3 uppercase tracking-wide">管理</p>
            </div>
            {adminItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  currentPage === item.key
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm">
            {user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
            <div className="text-xs text-gray-400 truncate">{user.email}</div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-600"}`}>
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
          <button
            onClick={onLogout}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            ↪ ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
