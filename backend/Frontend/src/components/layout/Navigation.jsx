import { NavLink } from "react-router-dom";

const navigationItems = [
  {
    label: "Dashboard",
    path: "/",
  },
  {
    label: "Work List",
    path: "/tasks",
  },
  {
    label: "Planning",
    path: "/planning",
  },
  {
    label: "Plans",
    path: "/plans",
  },
  {
    label: "What-If",
    path: "/what-if",
  },
  {
    label: "KPI",
    path: "/kpi",
  },
];

function Navigation() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="w-full max-w-[1500px] mx-auto px-6">
        <div className="h-16 flex items-center justify-between gap-6">
          {/* Brand */}
          <NavLink to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold">
              R
            </div>

            <div className="hidden sm:block">
              <p className="font-bold text-slate-950 leading-none">
                Railway AI
              </p>

              <p className="text-[10px] text-slate-400 mt-1">
                Predictive Maintenance
              </p>
            </div>
          </NavLink>

          {/* Navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  [
                    "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition",
                    isActive
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Emergency */}
          <NavLink
            to="/planning/emergency"
            className={({ isActive }) =>
              [
                "hidden md:flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition",
                isActive
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-600 hover:bg-red-100",
              ].join(" ")
            }
          >
            <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs">
              !
            </span>
            Emergency
          </NavLink>
        </div>
      </div>
    </header>
  );
}

export default Navigation;
