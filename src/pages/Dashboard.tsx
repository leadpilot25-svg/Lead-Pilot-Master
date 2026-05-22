import { useFirebase } from "../contexts/FirebaseProvider";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AlertCircle, Plus } from "lucide-react";
import { format } from "date-fns";
import AddLeadModal from "../components/AddLeadModal";
import Modal from "../components/Modal";

export default function Dashboard() {
  const { user, role } = useFirebase();

  const [leads, setLeads] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role === null) return;

    const baseQuery = collection(db, "leads");
    const q =
      role === "admin"
        ? query(baseQuery)
        : query(baseQuery, where("assignedTo", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLeads(data);
    });

    return unsubscribe;
  }, [user, role]);

  const todayStr = new Date().toISOString().split("T")[0];

  // ✅ DATA CALCULATIONS
  const todayFollowups = leads.filter(
    (l) => l.followUpDate === todayStr && !l.followUpCompleted
  );

  const missed = leads.filter(
    (l) => l.followUpDate < todayStr && !l.followUpCompleted
  );

  const meetings = leads.filter(
    (l) =>
      ["site_visit", "meeting", "site_visit_postponed"].includes(l.status) &&
      l.followUpDate === todayStr
  );

  const closed = leads.filter((l) => l.status === "closed");

  const total = leads.length;
  const open = leads.filter((l) => l.status !== "closed").length;

  return (
    <div className="p-4 lg:p-6 pb-28 max-w-5xl mx-auto space-y-8">

      {/* HEADER */}
      <header className="flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
            Workspace Portfolio
          </p>
          <h2 className="text-3xl font-extrabold text-neutral-900 mt-1">
            Today’s Tasks
          </h2>
        </div>

        <span className="text-xs bg-neutral-100 px-3 py-1 rounded-full">
          {format(new Date(), "EEE, d MMM")}
        </span>
      </header>

      {/* ALERT */}
      {missed.length > 0 && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3">
          <AlertCircle className="text-red-500" />
          <p className="text-sm text-red-600 font-medium">
            {missed.length} missed follow-ups. Take action now.
          </p>
        </div>
      )}

      {/* CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <Card title="Today Follow-ups" value={todayFollowups.length} color="bg-yellow-50" onClick={() => setActiveFilter("today")} />

        <Card title="Missed" value={missed.length} color="bg-red-50" onClick={() => setActiveFilter("missed")} />

        <Card title="Meetings Today" value={meetings.length} color="bg-blue-50" onClick={() => setActiveFilter("meetings")} />

        <Card title="Closed Deals" value={closed.length} color="bg-green-50" onClick={() => setActiveFilter("closed")} />

      </div>

      {/* LEAD OVERVIEW */}
      <section className="bg-white p-5 rounded-2xl border shadow-sm">
        <h3 className="text-sm font-bold text-emerald-500 mb-4">
          Lead Overview
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <Mini label="Total Leads" value={total} />
          <Mini label="Today Leads" value={todayFollowups.length} />
          <Mini label="Closed Deals" value={closed.length} />
          <Mini label="Open Leads" value={open} />
        </div>
      </section>

      {/* CONVERSION FUNNEL */}
      <section className="bg-white p-5 rounded-2xl border shadow-sm">
        <h3 className="text-sm font-bold text-indigo-500 mb-4">
          Conversion Funnel
        </h3>

        <FunnelRow label="New Inquiry" value={leads.filter(l => l.status === "new").length} />
        <FunnelRow label="Contacted" value={leads.filter(l => l.status === "contacted").length} />
        <FunnelRow label="Site Visit" value={leads.filter(l => l.status === "site_visit").length} />
        <FunnelRow label="Booked" value={leads.filter(l => l.status === "booked").length} />
        <FunnelRow label="Closed" value={closed.length} />
      </section>

      {/* PERFORMANCE */}
      <section className="bg-white p-5 rounded-2xl border shadow-sm">
        <h3 className="text-sm font-bold text-amber-500 mb-4">
          Performance Metrics
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <Mini label="Leads" value={total} />
          <Mini label="Closed" value={closed.length} />
          <Mini label="Follow-ups Done" value={leads.filter(l => l.followUpCompleted).length} />
          <Mini label="Conversion %" value={total ? Math.round((closed.length / total) * 100) : 0} />
        </div>
      </section>

      {/* MODAL */}
      <Modal
        isOpen={activeFilter !== null}
        onClose={() => setActiveFilter(null)}
        title="Tasks"
      >
        <p className="text-sm text-neutral-500">
          Showing {activeFilter} leads...
        </p>
      </Modal>

      {/* FLOAT BUTTON */}
      <button
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-24 right-6 bg-emerald-500 text-white p-4 rounded-full shadow-xl"
      >
        <Plus size={22} />
      </button>

      <AddLeadModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}

/* COMPONENTS */

function Card({ title, value, color, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${color} p-5 rounded-2xl border shadow-sm text-left hover:scale-[1.02] transition`}
    >
      <p className="text-xs text-neutral-500">{title}</p>
      <p className="text-3xl font-extrabold mt-1">{value}</p>
    </button>
  );
}

function Mini({ label, value }: any) {
  return (
    <div className="bg-neutral-100 p-4 rounded-xl">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="text-xl font-extrabold mt-1">{value}</p>
    </div>
  );
}

function FunnelRow({ label, value }: any) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-neutral-500">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}