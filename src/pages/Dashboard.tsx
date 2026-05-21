import { useFirebase } from "../contexts/FirebaseProvider";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  AlertCircle, 
  Clock, 
  Users, 
  Check, 
  Phone, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  ChevronRight, 
  Trophy, 
  ArrowRight,
  Plus,
  Compass,
  Building,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import AddLeadModal from "../components/AddLeadModal";
import Modal from "../components/Modal";

export default function Dashboard() {
  const { user, role, remindersEnabled } = useFirebase();
  const [leads, setLeads] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedLeadForReschedule, setSelectedLeadForReschedule] = useState<any | null>(null);
  
  // WhatsApp Template dropdown state
  const [activeWhatsAppLead, setActiveWhatsAppLead] = useState<string | null>(null);

  // Active action drawer/modal filter state
  const [activeActionModalFilter, setActiveActionModalFilter] = useState<"today" | "missed" | "meetings" | "closed" | null>(null);

  useEffect(() => {
    if (!user || role === null) return;

    const baseQuery = collection(db, "leads");
    const q = role === "admin" 
      ? query(baseQuery) 
      : query(baseQuery, where("assignedTo", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allLeads = snapshot.docs.map(docRef => ({ id: docRef.id, ...docRef.data() as any }));
      setLeads(allLeads);
    });

    return unsubscribe;
  }, [user, role]);

  const todayStr = new Date().toISOString().split("T")[0];

  // Stats Calculations
  const missedFollowups = leads.filter(l => {
    if (!l.followUpDate) return false;
    return l.followUpDate < todayStr && l.status !== "closed" && l.status !== "inactive" && !l.followUpCompleted;
  });

  const todayFollowups = leads.filter(l => {
    if (!l.followUpDate) return false;
    return l.followUpDate === todayStr && l.status !== "closed" && l.status !== "inactive" && !l.followUpCompleted;
  });

  const completedFollowups = leads.filter(l => l.followUpCompleted === true || l.status === "closed");

  // Calls to make count: new or contacted leads scheduled for today or overdue
  const callsCount = leads.filter(l => 
    (l.status === "new" || l.status === "contacted") && 
    l.followUpDate === todayStr && 
    !l.followUpCompleted
  ).length;

  const followupsDueCount = todayFollowups.length;
  const missedCount = missedFollowups.length;

  // Meetings count: leads in site visit, meeting, or site visit postponed scheduled for today
  const meetingsCount = leads.filter(l => 
    (l.status === "site_visit" || l.status === "meeting" || l.status === "site_visit_postponed") && 
    l.followUpDate === todayStr
  ).length;

  // Agent Performance Calculations (for leads owned by agent/admin)
  // Leads Handled
  const totalLeadsCount = leads.length;
  
  // Follow-ups done
  const followupsDoneCount = leads.filter(l => l.followUpCompleted === true).length;
  
  // Bookings
  const bookingsCount = leads.filter(l => l.status === "booked" || l.status === "closed").length;
  
  // Conversion %: (closed / total leads) * 100
  const conversionRate = totalLeadsCount > 0 
    ? Math.round((leads.filter(l => l.status === "closed").length / totalLeadsCount) * 105 / 105) // normal arithmetic 
    : 0;

  const closedDealsCount = leads.filter(l => l.status === "closed").length;

  // Funnel Stage Counts & Additional Metrics
  const newInquiryCount = leads.filter(l => l.status === "new" || !l.status).length;
  const contactedCount = leads.filter(l => l.status === "contacted").length;
  const siteVisitScheduledCount = leads.filter(l => l.status === "site_visit").length;
  const siteVisitPostponedCount = leads.filter(l => l.status === "site_visit_postponed").length;
  const bookedCount = leads.filter(l => l.status === "booked").length;
  const inactiveCount = leads.filter(l => l.status === "inactive").length;
  const openLeadsCount = leads.filter(l => l.status !== "closed" && l.status !== "inactive").length;
  const todayLeadsCount = leads.filter(l => l.followUpDate === todayStr).length;

  // 1-Tap Mark Complete followed by Automatic Rescheduling Suggestion
  const handleMarkComplete = async (lead: any) => {
    try {
      await updateDoc(doc(db, "leads", lead.id), {
        followUpCompleted: true
      });
      // Trigger rescheduling selector
      setSelectedLeadForReschedule(lead);
    } catch (err) {
      console.error("Failed to mark complete:", err);
    }
  };

  const handleReschedule = async (daysAhead: number) => {
    if (!selectedLeadForReschedule) return;
    try {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + daysAhead);
      const formattedNextDate = format(nextDate, "yyyy-MM-dd");

      await updateDoc(doc(db, "leads", selectedLeadForReschedule.id), {
        followUpDate: formattedNextDate,
        followUpCompleted: false, // reset for the next task
        status: "contacted", // move to contacted
        notes: `${selectedLeadForReschedule.notes || ""}\n[System Auto-Reschedule]: Follow-up completed and next date scheduled for ${formattedNextDate}`
      });

      // Log activity
      await addDoc(collection(db, "activities"), {
        leadId: selectedLeadForReschedule.id,
        type: "followup",
        date: formattedNextDate,
        time: "10:00",
        status: "pending",
        createdBy: user?.uid || "",
        createdAt: serverTimestamp(),
      });

      setSelectedLeadForReschedule(null);
    } catch (err) {
      console.error("Reschedule failed:", err);
    }
  };

  // WhatsApp Automation Messaging Links
  const triggerWhatsApp = (lead: any, templateType: "first" | "followup" | "confirm") => {
    let text = "";
    const name = lead.firstName || "there";
    
    if (templateType === "first") {
      text = `Hi ${name}, thanks for your inquiry regarding our real estate projects. This is ${user?.displayName || "an agent"} from LeadPilot. How can I help you?`;
    } else if (templateType === "followup") {
      text = `Hi ${name}, just checking in regarding the property options we discussed earlier. Let me know if you would like to run through the budgets or schedule a short call!`;
    } else if (templateType === "confirm") {
      text = `Hi ${name}, confirming our scheduled site visit for your preferred property block. See you there!`;
    }

    const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    setActiveWhatsAppLead(null);
  };

  return (
    <div className="p-4 lg:p-6 pb-28 font-sans max-w-5xl mx-auto relative select-none">
      
      {/* Top Header Section */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#10B981]">Workspace Portfolio</span>
          <h2 className="text-3xl font-black text-neutral-950 tracking-tight leading-none mt-1.5">Today's Tasks</h2>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-neutral-500 bg-neutral-100/80 px-3.5 py-2 rounded-full uppercase tracking-wider shadow-sm border border-neutral-200/20">
            {format(new Date(), "EEE, d MMM")}
          </span>
        </div>
      </header>

      {/* Missed Follow-ups Alert Banner */}
      {missedCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50/70 border border-rose-100 p-4 rounded-3xl mb-8 flex items-center gap-3 shadow-sm shadow-rose-50"
        >
          <div className="p-2 bg-rose-500 text-white rounded-xl">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-rose-500">Overdue Task Warning</p>
            <p className="text-xs text-rose-600 font-semibold leading-tight mt-0.5">
              You have <span className="font-extrabold">{missedCount}</span> missed follow-ups. Call them now to protect your pipeline.
            </p>
          </div>
        </motion.div>
      )}

      {/* Zoho-inspired Metrics Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 font-sans">
        {/* Today Follow-ups (soft yellow/warm cream cream style) */}
        <button 
          onClick={() => setActiveActionModalFilter("today")}
          className="bg-[#FFFDF0] hover:bg-[#FFFAD9] border border-amber-100/50 p-5 rounded-[1.75rem] shadow-sm hover:scale-[1.01] active:scale-95 transition-all text-neutral-800 flex items-center text-left gap-4 group w-full cursor-pointer outline-none"
        >
          <div className="w-12 h-12 bg-white text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100/30 shadow-sm group-hover:scale-105 transition-transform duration-250">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider leading-none text-neutral-500">Today Follow-ups</p>
            <p className="text-2xl md:text-3.5xl font-black text-neutral-900 mt-1">{followupsDueCount}</p>
          </div>
        </button>

        {/* Missed Follow-ups (soft warm red style) */}
        <button 
          onClick={() => setActiveActionModalFilter("missed")}
          className="bg-[#FEF5F5] hover:bg-[#FEEAEA] border border-rose-100/50 p-5 rounded-[1.75rem] shadow-sm hover:scale-[1.01] active:scale-95 transition-all text-neutral-800 flex items-center text-left gap-4 group w-full cursor-pointer outline-none"
        >
          <div className="w-12 h-12 bg-white text-rose-500 rounded-2xl flex items-center justify-center shrink-0 border border-rose-100/30 shadow-sm group-hover:scale-105 transition-transform duration-250">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider leading-none text-neutral-500">Missed Followups</p>
            <p className="text-2xl md:text-3.5xl font-black text-neutral-900 mt-1">{missedCount}</p>
          </div>
        </button>

        {/* Meetings Today (soft blue layout) */}
        <button 
          onClick={() => setActiveActionModalFilter("meetings")}
          className="bg-[#F4F9FD] hover:bg-[#EAF4FC] border border-blue-100/50 p-5 rounded-[1.75rem] shadow-sm hover:scale-[1.01] active:scale-95 transition-all text-neutral-800 flex items-center text-left gap-4 group w-full cursor-pointer outline-none"
        >
          <div className="w-12 h-12 bg-white text-blue-500 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100/30 shadow-sm group-hover:scale-105 transition-transform duration-250">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-wider leading-none">Meetings Today</p>
            <p className="text-2xl md:text-3.5xl font-black text-neutral-900 mt-1">{meetingsCount}</p>
          </div>
        </button>

        {/* Closed Deals (soft emerald style) */}
        <button 
          onClick={() => setActiveActionModalFilter("closed")}
          className="bg-[#ECFBF4] hover:bg-[#DFF7EA] border border-emerald-100/50 p-5 rounded-[1.75rem] shadow-sm hover:scale-[1.01] active:scale-95 transition-all text-neutral-800 flex items-center text-left gap-4 group w-full cursor-pointer outline-none"
        >
          <div className="w-12 h-12 bg-white text-[#10B981] rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100/30 shadow-sm group-hover:scale-105 transition-transform duration-250">
            <Trophy size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-wider leading-none">Closed Deals</p>
            <p className="text-2xl md:text-3.5xl font-black text-neutral-900 mt-1">{closedDealsCount}</p>
          </div>
        </button>
      </div>

      {/* Side-by-Side Responsive Layout for Overview & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Lead Overview Card */}
        <section className="bg-white border border-neutral-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md border-l-[6px] border-l-[#10B981] flex flex-col justify-between font-sans transition-all duration-200 hover:-translate-y-0.5">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#10B981] mb-5 flex items-center gap-2">
            <TrendingUp size={14} /> Lead Directory Overview
          </h3>
          
          <div className="grid grid-cols-2 gap-4 py-1">
            {/* Total Leads */}
            <Link 
              to="/leads" 
              className="bg-[#ECFBF4]/70 hover:bg-[#DFF7EA] border border-emerald-100/40 p-3.5 rounded-2xl flex items-center justify-start gap-3 transition-all active:scale-95 shadow-sm"
            >
              <div className="w-10 h-10 bg-white text-[#10B981] rounded-xl flex items-center justify-center shrink-0 border border-emerald-100/20 shadow-sm">
                <Users size={16} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block leading-none">Total Leads</span>
                <span className="text-xl md:text-2xl font-black text-neutral-950 mt-1 block leading-none">{totalLeadsCount}</span>
              </div>
            </Link>

            {/* Today Leads */}
            <Link 
              to="/leads?filter=today" 
              className="bg-[#FFFDF0]/70 hover:bg-[#FFFAD9] border border-amber-100/40 p-3.5 rounded-2xl flex items-center justify-start gap-3 transition-all active:scale-95 shadow-sm"
            >
              <div className="w-10 h-10 bg-white text-amber-500 rounded-xl flex items-center justify-center shrink-0 border border-amber-100/20 shadow-sm">
                <Calendar size={16} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block leading-none">Today Leads</span>
                <span className="text-xl md:text-2xl font-black text-neutral-950 mt-1 block leading-none">{todayLeadsCount}</span>
              </div>
            </Link>

            {/* Closed Deals */}
            <Link 
              to="/leads?filter=closed" 
              className="bg-[#F6FEF9] hover:bg-[#EBFDF1] border border-emerald-100/25 p-3.5 rounded-2xl flex items-center justify-start gap-3 transition-all active:scale-95 shadow-sm"
            >
              <div className="w-10 h-10 bg-white text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100/10 shadow-sm">
                <Trophy size={16} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block leading-none">Closed Deals</span>
                <span className="text-xl md:text-2xl font-black text-neutral-950 mt-1 block leading-none">{closedDealsCount}</span>
              </div>
            </Link>

            {/* Open Leads */}
            <Link 
              to="/leads?status=open" 
              className="bg-[#F4F9FD]/70 hover:bg-[#EAF4FC] border border-blue-100/40 p-3.5 rounded-2xl flex items-center justify-start gap-3 transition-all active:scale-95 shadow-sm"
            >
              <div className="w-10 h-10 bg-white text-blue-500 rounded-xl flex items-center justify-center shrink-0 border border-blue-100/20 shadow-sm">
                <TrendingUp size={16} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block leading-none">Open Leads</span>
                <span className="text-xl md:text-2xl font-black text-neutral-950 mt-1 block leading-none">{openLeadsCount}</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Conversion Funnel Card */}
        <section className="bg-white border border-neutral-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md border-l-[6px] border-l-indigo-500 font-sans transition-all duration-200 hover:-translate-y-0.5">
          <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-5 flex items-center gap-2">
            <BarChart3 size={14} /> Conversion Funnel
          </h3>
          
          <div className="space-y-3.5">
            {/* New Inquiry */}
            <Link 
              to="/leads?status=new" 
              className="block group hover:scale-[1.01] active:scale-98 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-blue-500 transition-colors">New Inquiry</span>
                <span className="text-[11px] font-extrabold text-neutral-700">{newInquiryCount} {newInquiryCount === 1 ? 'lead' : 'leads'}</span>
              </div>
              <div className="w-full bg-neutral-50 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalLeadsCount > 0 ? (newInquiryCount / totalLeadsCount) * 100 : 0}%` }}
                ></div>
              </div>
            </Link>

            {/* Contacted */}
            <Link 
              to="/leads?status=contacted" 
              className="block group hover:scale-[1.01] active:scale-98 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-purple-500 transition-colors">Contacted</span>
                <span className="text-[11px] font-extrabold text-neutral-700">{contactedCount} {contactedCount === 1 ? 'lead' : 'leads'}</span>
              </div>
              <div className="w-full bg-neutral-50 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalLeadsCount > 0 ? (contactedCount / totalLeadsCount) * 100 : 0}%` }}
                ></div>
              </div>
            </Link>

            {/* Site Visit */}
            <Link 
              to="/leads?status=site_visit" 
              className="block group hover:scale-[1.01] active:scale-98 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-amber-500 transition-colors">Site Visit Scheduled</span>
                <span className="text-[11px] font-extrabold text-neutral-700">{siteVisitScheduledCount} {siteVisitScheduledCount === 1 ? 'lead' : 'leads'}</span>
              </div>
              <div className="w-full bg-neutral-50 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalLeadsCount > 0 ? (siteVisitScheduledCount / totalLeadsCount) * 100 : 0}%` }}
                ></div>
              </div>
            </Link>

            {/* Site Visit Postponed */}
            <Link 
              to="/leads?status=site_visit_postponed" 
              className="block group hover:scale-[1.01] active:scale-98 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-rose-600 transition-colors">Site Visit Postponed</span>
                <span className="text-[11px] font-extrabold text-neutral-700">{siteVisitPostponedCount} {siteVisitPostponedCount === 1 ? 'lead' : 'leads'}</span>
              </div>
              <div className="w-full bg-neutral-50 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalLeadsCount > 0 ? (siteVisitPostponedCount / totalLeadsCount) * 100 : 0}%` }}
                ></div>
              </div>
            </Link>

            {/* Booked */}
            <Link 
              to="/leads?status=booked" 
              className="block group hover:scale-[1.01] active:scale-98 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-[#10B981] transition-colors">Booked</span>
                <span className="text-[11px] font-extrabold text-neutral-700">{bookedCount} {bookedCount === 1 ? 'lead' : 'leads'}</span>
              </div>
              <div className="w-full bg-neutral-50 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-[#10B981] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalLeadsCount > 0 ? (bookedCount / totalLeadsCount) * 100 : 0}%` }}
                ></div>
              </div>
            </Link>

            {/* Inactive Leads */}
            <Link 
              to="/leads?status=inactive" 
              className="block group hover:scale-[1.01] active:scale-98 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-neutral-500 transition-colors">Inactive Leads</span>
                <span className="text-[11px] font-extrabold text-neutral-700">{inactiveCount} {inactiveCount === 1 ? 'lead' : 'leads'}</span>
              </div>
              <div className="w-full bg-neutral-50 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-neutral-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalLeadsCount > 0 ? (inactiveCount / totalLeadsCount) * 100 : 0}%` }}
                ></div>
              </div>
            </Link>
          </div>
        </section>

      </div>

      {/* Action Drawer/Modal of Selected Action Category */}
      <Modal 
        isOpen={activeActionModalFilter !== null}
        onClose={() => {
          setActiveActionModalFilter(null);
          setActiveWhatsAppLead(null);
        }}
        title={
          activeActionModalFilter === "today" ? "Today's Follow-up Tasks" :
          activeActionModalFilter === "missed" ? "Missed/Overdue Follow-ups" :
          activeActionModalFilter === "meetings" ? "Meetings Scheduled Today" :
          "Closed Won Deals"
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {activeActionModalFilter === "today" && (
            todayFollowups.length === 0 ? (
              <p className="text-neutral-400 text-xs py-10 text-center font-medium">No follow-ups due today!</p>
            ) : (
              todayFollowups.map(lead => (
                <LeadTaskCard 
                  key={lead.id} 
                  lead={lead} 
                  highlight="yellow" 
                  onCheck={() => handleMarkComplete(lead)}
                  activeWhatsAppLead={activeWhatsAppLead}
                  setActiveWhatsAppLead={setActiveWhatsAppLead}
                  triggerWhatsApp={triggerWhatsApp}
                  subtitle="Follow-up due"
                />
              ))
            )
          )}

          {activeActionModalFilter === "missed" && (
            missedFollowups.length === 0 ? (
              <p className="text-neutral-400 text-xs py-10 text-center font-medium">No overdue follow-ups, excellent job!</p>
            ) : (
              missedFollowups.map(lead => (
                <LeadTaskCard 
                  key={lead.id} 
                  lead={lead} 
                  highlight="red" 
                  onCheck={() => handleMarkComplete(lead)}
                  activeWhatsAppLead={activeWhatsAppLead}
                  setActiveWhatsAppLead={setActiveWhatsAppLead}
                  triggerWhatsApp={triggerWhatsApp}
                  subtitle="Overdue date"
                />
              ))
            )
          )}

          {activeActionModalFilter === "meetings" && (
            leads.filter(l => (l.status === "site_visit" || l.status === "meeting" || l.status === "site_visit_postponed") && l.followUpDate === todayStr).length === 0 ? (
              <p className="text-neutral-400 text-xs py-10 text-center font-medium">No meetings/site visits scheduled for today.</p>
            ) : (
              leads.filter(l => (l.status === "site_visit" || l.status === "meeting" || l.status === "site_visit_postponed") && l.followUpDate === todayStr).map(lead => (
                <LeadTaskCard 
                  key={lead.id} 
                  lead={lead} 
                  highlight="yellow" 
                  onCheck={() => handleMarkComplete(lead)}
                  activeWhatsAppLead={activeWhatsAppLead}
                  setActiveWhatsAppLead={setActiveWhatsAppLead}
                  triggerWhatsApp={triggerWhatsApp}
                  subtitle="Scheduled meeting"
                />
              ))
            )
          )}

          {activeActionModalFilter === "closed" && (
            leads.filter(l => l.status === "closed").length === 0 ? (
              <p className="text-neutral-400 text-xs py-10 text-center font-medium">No closed won deals yet. Keep pushing!</p>
            ) : (
              leads.filter(l => l.status === "closed").map(lead => (
                <LeadTaskCard 
                  key={lead.id} 
                  lead={lead} 
                  highlight="green" 
                  onCheck={() => {}}
                  activeWhatsAppLead={activeWhatsAppLead}
                  setActiveWhatsAppLead={setActiveWhatsAppLead}
                  triggerWhatsApp={triggerWhatsApp}
                  subtitle="Closed won"
                />
              ))
            )
          )}
        </div>
      </Modal>

      {/* Agent Performance Section */}
      <section className="bg-white border border-neutral-100 p-6 rounded-[2rem] shadow-sm mb-6">
        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
          <Trophy size={14} className="text-amber-500" /> Active Performance metrics
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest mb-1">Leads Handled</p>
            <p className="text-xl font-extrabold text-neutral-800">{totalLeadsCount}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest mb-1">Follow-ups Done</p>
            <p className="text-xl font-extrabold text-neutral-800">{followupsDoneCount}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest mb-1">Total Bookings</p>
            <p className="text-xl font-extrabold text-neutral-800">{bookingsCount}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest mb-1">Conversion Ratio</p>
            <p className="text-xl font-extrabold text-emerald-500">{conversionRate}%</p>
          </div>
        </div>
      </section>

      {/* Floating Add Lead Button */}
      <button
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-28 right-6 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-200 hover:scale-105 active:scale-95 transition-all z-40 border border-emerald-400"
        title="Add New Lead"
      >
        <Plus size={28} />
      </button>

      {/* Auto-Reschedule modal suggestions */}
      <AnimatePresence>
        {selectedLeadForReschedule && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-end justify-center p-4 font-sans"
          >
            <motion.div 
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="bg-white rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={24} />
                </div>
                <h3 className="font-black text-xl text-neutral-900 tracking-tight">Suggest Next Follow-up</h3>
                <p className="text-xs font-semibold text-neutral-400 mt-1">
                  You just finished follow-up with {selectedLeadForReschedule.firstName}! Choose the next schedule interval:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => handleReschedule(1)}
                  className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-sm font-extrabold p-4 rounded-2xl flex items-center justify-between"
                >
                  <span>1 Day (Tomorrow)</span>
                  <ChevronRight size={16} />
                </button>
                <button 
                  onClick={() => handleReschedule(3)}
                  className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-sm font-extrabold p-4 rounded-2xl flex items-center justify-between"
                >
                  <span>3 Days</span>
                  <ChevronRight size={16} />
                </button>
                <button 
                  onClick={() => handleReschedule(7)}
                  className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-sm font-extrabold p-4 rounded-2xl flex items-center justify-between"
                >
                  <span>1 Week (Next Cycle)</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              <button 
                onClick={() => setSelectedLeadForReschedule(null)}
                className="w-full text-center text-xs text-neutral-400 font-bold hover:underline py-1 mt-2 block"
              >
                Skip Rescheduling
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddLeadModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}

interface LeadTaskProps {
  key?: any;
  lead: any;
  highlight: "red" | "yellow" | "green";
  onCheck: () => void;
  activeWhatsAppLead: string | null;
  setActiveWhatsAppLead: (v: string | null) => void;
  triggerWhatsApp: (lead: any, type: "first" | "followup" | "confirm") => void;
  subtitle: string;
}

function LeadTaskCard({ 
  lead, 
  highlight, 
  onCheck, 
  activeWhatsAppLead, 
  setActiveWhatsAppLead, 
  triggerWhatsApp,
  subtitle 
}: LeadTaskProps) {
  
  // Highlight border maps
  const borderClasses = {
    red: "border-l-[6px] border-l-rose-500 hover:border-r-rose-100",
    yellow: "border-l-[6px] border-l-amber-400 hover:border-r-amber-100",
    green: "opacity-60 border-l-[6px] border-l-emerald-500 line-through"
  };

  const statusLabel = {
    new: "New Inquiry",
    contacted: "Contacted",
    site_visit: "Site Visit Scheduled",
    site_visit_postponed: "Site Visit Postponed",
    booked: "Booked",
    closed: "Closed Won",
    inactive: "Inactive"
  }[lead.status as string] || "New Inquiry";

  return (
    <Link to={`/leads/${lead.id}`} className="block hover:no-underline">
      <motion.div 
        whileHover={{ y: -1 }}
        className={`bg-white p-4.5 rounded-[2rem] border border-neutral-100 shadow-sm flex flex-col gap-3 relative transition-all cursor-pointer ${borderClasses[highlight]}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Circular Interactive Checked Action */}
            {highlight !== "green" ? (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCheck(); }}
                className="w-6 h-6 rounded-full border-2 border-neutral-200 hover:border-emerald-500 flex items-center justify-center transition-colors shadow-inner"
                title="Mark Followup Done"
              >
                <div className="w-3 h-3 rounded-full hover:bg-emerald-500 transition-colors" />
              </button>
            ) : (
              <div className="w-6 h-6 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-inner">
                <Check size={12} strokeWidth={4} />
              </div>
            )}
            
            <div>
              <h4 className="font-extrabold text-neutral-900 text-sm leading-tight hover:underline">
                {lead.firstName || "Unknown"} {lead.lastName || ""}
              </h4>
              <p className="text-[10px] text-neutral-400 font-bold mt-0.5 card-subtitle">
                {subtitle}: {lead.followUpDate || "N/A"} • Time: {lead.followUpTime || "10:00"}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${
            highlight === "green" ? "bg-emerald-100 text-emerald-800" :
            highlight === "red" ? "bg-rose-50 text-rose-600" :
            "bg-amber-50 text-amber-600"
          }`}>
            {statusLabel}
          </span>
        </div>

        {/* Grid of contact and template utilities */}
        <div className="flex items-center justify-between border-t border-neutral-50 pt-3">
          {/* Telephone phone string and display */}
          <span className="text-xs font-semibold text-neutral-400 font-mono">
            {lead.phone}
          </span>

          {/* Quick Click 1-Tap Handlers */}
          {highlight !== "green" && (
            <div className="flex items-center gap-1.5 relative" onClick={(e) => e.stopPropagation()}>
              
              {/* Call */}
              <a 
                href={`tel:${lead.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-emerald-500 rounded-xl transition-colors"
                title="Call Immediately"
              >
                <Phone size={14} />
              </a>

              {/* Email */}
              {lead.email && (
                <a 
                  href={`mailto:${lead.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-emerald-500 rounded-xl transition-colors"
                  title="Send Email"
                >
                  <Mail size={14} />
                </a>
              )}

              {/* SMS */}
              <a 
                href={`sms:${lead.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-emerald-500 rounded-xl transition-colors"
                title="Send Text Message"
              >
                <Smartphone size={14} />
              </a>

              {/* WhatsApp with Templates selection */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    setActiveWhatsAppLead(activeWhatsAppLead === lead.id ? null : lead.id); 
                  }}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-500 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                  title="Send WhatsApp Template"
                >
                  <MessageSquare size={14} />
                </button>

                {/* Template Popover dropdown */}
                <AnimatePresence>
                  {activeWhatsAppLead === lead.id && (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="absolute right-0 bottom-10 z-30 bg-white border border-neutral-100 p-2.5 rounded-2xl shadow-xl w-48 text-left text-xs font-semibold space-y-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-[9px] font-black uppercase text-neutral-400 tracking-wider mb-1 px-1.5">Pick Automation Message</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); triggerWhatsApp(lead, "first"); }}
                        className="w-full text-left p-2 rounded-xl hover:bg-neutral-50 text-neutral-700 block text-[11px] truncate leading-tight cursor-pointer"
                      >
                        🗣️ 1st Inquiry Welcome
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); triggerWhatsApp(lead, "followup"); }}
                        className="w-full text-left p-2 rounded-xl hover:bg-neutral-50 text-neutral-700 block text-[11px] truncate leading-tight cursor-pointer"
                      >
                        ⏳ Routine Check-in
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); triggerWhatsApp(lead, "confirm"); }}
                        className="w-full text-left p-2 rounded-xl hover:bg-neutral-50 text-neutral-700 block text-[11px] truncate leading-tight cursor-pointer"
                      >
                        📍 Confirm Site Visit
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
