import { useFirebase } from "../contexts/FirebaseProvider";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Calendar, AlertCircle, Clock, Trophy, BarChart3, Plus } from "lucide-react";
import { format } from "date-fns";
import AddLeadModal from "../components/AddLeadModal";

export default function Dashboard() {
  const { user, role } = useFirebase();
  const [leads, setLeads] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    if (!user || role === null) return;

    const baseQuery = collection(db, "leads");
    const q = role === "admin"
      ? query(baseQuery)
      : query(baseQuery, where("assignedTo", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeads(allLeads);
    });

    return unsubscribe;
  }, [user, role]);

  const todayStr = new Date().toISOString().split("T")[0];

  const todayFollowups = leads.filter(l => l.followUpDate === todayStr && !l.followUpCompleted);
  const missedFollowups = leads.filter(l => l.followUpDate < todayStr && !l.followUpCompleted);
  const meetingsCount = leads.filter(l => l.followUpDate === todayStr).length;
  const closedDealsCount = leads.filter(l => l.status === "closed").length;

  const totalLeads = leads.length;
  const openLeads = leads.filter(l => l.status !== "closed").length;

  return (
    <div className="p-4 pb-28 max-w-5xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-500">
            Workspace Portfolio
          </p>
          <h2 className="text-3xl font-extrabold text-neutral-900 mt-1">
            Today’s Tasks
          </h2>
        </div>

        <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
          {format(new Date(), "EEE, d MMM")}
        </span>
      </div>

      {/* ALERT */}
      {missedFollowups.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 p-4 rounded-2xl">
          <AlertCircle className="text-red-500" />
          <p className="text-sm text-red-600">
            You have <span className="font-bold">{missedFollowups.length}</span> missed follow-ups
          </p>
        </div>
      )}

      {/* STATS (COLORED CARDS) */}
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Today Follow-ups" value={todayFollowups.length} icon={<Clock />} />
        <Stat label="Missed Follow-ups" value={missedFollowups.length} icon={<AlertCircle />} />
        <Stat label="Meetings Today" value={meetingsCount} icon={<Calendar />} />
        <Stat label="Closed Deals" value={closedDealsCount} icon={<Trophy />} />
      </div>

      {/* LEAD OVERVIEW */}
      <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border shadow-sm">
        <p className="text-xs font-medium uppercase text-emerald-500 mb-4">
          Lead Directory Overview
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Mini label="Total Leads" value={totalLeads} />
          <Mini label="Today Leads" value={todayFollowups.length} />
          <Mini label="Closed Deals" value={closedDealsCount} />
          <Mini label="Open Leads" value={openLeads} />
        </div>
      </div>

      {/* CONVERSION FUNNEL */}
      <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border shadow-sm">
        <h3 className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <BarChart3 size={16} />
          Conversion Funnel
        </h3>

        <FunnelRow label="New Inquiry" value={2} color="bg-blue-500" />
        <FunnelRow label="Contacted" value={2} color="bg-purple-500" />
        <FunnelRow label="Site Visit Scheduled" value={2} color="bg-orange-500" />
        <FunnelRow label="Site Visit Postponed" value={0} color="bg-neutral-300" />
        <FunnelRow label="Booked" value={0} color="bg-green-500" />
        <FunnelRow label="Inactive Leads" value={1} color="bg-neutral-400" />
      </div>

      {/* PERFORMANCE */}
      <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border shadow-sm">
        <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Trophy size={16} />
          Active Performance Metrics
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <Metric label="Leads Handled" value={totalLeads} />
          <Metric label="Follow-ups Done" value={0} />
          <Metric label="Total Bookings" value={closedDealsCount} />
          <Metric label="Conversion Ratio" value="0%" highlight />
        </div>
      </div>

      {/* FLOAT BUTTON */}
      <button
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-24 right-6 bg-emerald-500 text-white p-4 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
      >
        <Plus size={22} />
      </button>

      <AddLeadModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}

/* COMPONENTS */

function Stat({ label, value, icon }: any) {

  const getStyles = () => {
    if (label.includes("Today")) return { bg: "bg-[#FFF9E6]", icon: "text-amber-600" };
    if (label.includes("Missed")) return { bg: "bg-[#FEF2F2]", icon: "text-red-500" };
    if (label.includes("Meetings")) return { bg: "bg-[#EFF6FF]", icon: "text-blue-500" };
    if (label.includes("Closed")) return { bg: "bg-[#ECFDF5]", icon: "text-emerald-500" };
    return { bg: "bg-white", icon: "text-neutral-500" };
  };

  const s = getStyles();

  return (
    <div className={`${s.bg} p-4 rounded-2xl border shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex items-center gap-3`}>
      <div className="p-2 bg-white rounded-xl shadow-sm">
        <div className={s.icon}>{icon}</div>
      </div>

      <div>
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <p className="text-3xl font-extrabold text-neutral-900">{value}</p>
      </div>
    </div>
  );
}

function Mini({ label, value }: any) {
  return (
    <div className="bg-neutral-100/60 p-4 rounded-xl">
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      <p className="text-xl font-extrabold text-neutral-900 mt-1">{value}</p>
    </div>
  );
}

function FunnelRow({ label, value, color }: any) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-neutral-500">
        <span className="font-medium">{label}</span>
        <span className="font-semibold">{value} leads</span>
      </div>
      <div className="w-full bg-neutral-200/40 h-2 rounded-full mt-1">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${value * 20}%` }} />
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: any) {
  return (
    <div>
      <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">
        {label}
      </p>
      <p className={`text-xl font-extrabold mt-1 ${highlight ? "text-emerald-500" : "text-neutral-900"}`}>
        {value}
      </p>
    </div>
  );
}