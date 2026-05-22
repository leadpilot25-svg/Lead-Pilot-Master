import { Home, Users, Settings, Plus, Search, LogOut, Sliders, Clock } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { useState } from "react";
import AddLeadModal from "./AddLeadModal";
import { useFirebase } from "../contexts/FirebaseProvider";
import { auth } from "../lib/firebase";

export function Header() {
  const { user } = useFirebase();
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname === "/") return "Today's Tasks";
    if (pathname.startsWith("/leads")) return "Leads";
    if (pathname === "/today") return "Tasks";
    if (pathname === "/funnel") return "Pipeline";
    if (pathname === "/profile") return "Profile";
    if (pathname === "/admin") return "Admin";
    return "LeadPilot";
  };

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-white border-b z-40 px-4 md:px-8 flex items-center justify-between">

      {/* LEFT SIDE */}
      <h2 className="text-sm font-extrabold text-neutral-800">
        {getPageTitle(location.pathname)}
      </h2>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-4">

        <Link 
          to="/leads"
          className="p-2 text-neutral-400 hover:text-[#10B981] hover:bg-neutral-50 rounded-xl"
        >
          <Search size={18} />
        </Link>

        <div className="w-px h-6 bg-neutral-100 hidden md:block" />

        <Link 
          to="/profile" 
          className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-50"
        >
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center border">
            {user?.photoURL ? (
              <img src={user.photoURL} className="object-cover w-full h-full rounded-full" />
            ) : (
              <span className="text-xs font-bold">
                {user?.displayName?.[0] || "?"}
              </span>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/leads", icon: Users, label: "Leads" },
    { path: "/today", icon: Clock, label: "Tasks" },
    { path: "/admin", icon: Settings, label: "Admin" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-6 left-4 right-4 bg-white border px-6 py-4 z-50 rounded-3xl shadow-lg">
      <div className="flex justify-between items-center">

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center flex-1"
            >
              <Icon size={20} className={isActive ? "text-[#10B981]" : "text-neutral-300"} />
              <span className={`text-[10px] mt-1 ${isActive ? "text-[#10B981]" : "text-neutral-400"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

      </div>
    </nav>
  );
}

export function DesktopSidebar() {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/leads", icon: Users, label: "Leads" },
    { path: "/today", icon: Clock, label: "Tasks" },
    { path: "/funnel", icon: Sliders, label: "Pipeline" },
    { path: "/admin", icon: Settings, label: "Admin" },
  ];

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-72 bg-white border-r p-8">

      {/* ADD LEAD BUTTON */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-[#10B981] text-white py-3 rounded-xl mb-8 font-bold"
      >
        + Add Lead
      </button>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-2">

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                isActive 
                  ? "bg-emerald-50 text-[#10B981]" 
                  : "text-neutral-500 hover:bg-neutral-50"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}

      </nav>

      {/* LOGOUT */}
      <button 
        className="flex items-center gap-2 text-red-500 mt-6"
        onClick={() => auth.signOut()}
      >
        <LogOut size={16} />
        Sign Out
      </button>

      <AddLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </aside>
  );
}

export default function Navigation() {
  return (
    <>
      <Header />
      <DesktopSidebar />
      <BottomNav />
    </>
  );
}