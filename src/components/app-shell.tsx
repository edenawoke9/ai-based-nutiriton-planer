import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { clearAuth, USER_PROFILE_KEY } from "@/lib/api";
import {
  LayoutDashboard,
  CalendarDays,
  Apple,
  Activity,
  Settings,
  Search,
  Bell,
  Plus,
  Leaf,
  Sparkles,
  LogOut,
  Menu,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type NavItem = {
  to: "/dashboard" | "/planner" | "/library" | "/progress" | "/coach" | "/settings" | "/feedback";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
};

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/planner", label: "Meal planner", icon: CalendarDays},
  { to: "/library", label: "Food library", icon: Apple },
  { to: "/progress", label: "Progress", icon: Activity },
  { to: "/coach", label: "AI coach", icon: Sparkles },
  { to: "/feedback", label: "Feedback", icon: Bell },
];

interface AppShellProps {
  children: React.ReactNode;
}

interface UserInfo {
  healthGoal?: string;      // "lose_weight" | "gain_weight" | "maintain"
  activityLevel?: number;   // 0 = sedentary | 1 = moderate | 2 = active
}

interface UserProfile {
  name?: string;
  username?: string;
  user_name?: string;
  dayOfPlan?: number;
  userInfo?: UserInfo;
}

// --- DYNAMIC INSIGHTS BASED ON USER GOAL + ACTIVITY LEVEL ---
const goalInsights: Record<string, string[]> = {
  lose_weight: [
    "Protein keeps you full — aim for at least 1.2g per kg of body weight.",
    "A 300–500 kcal daily deficit is the sweet spot for steady fat loss.",
    "Drinking water before meals can reduce intake by up to 13%.",
    "Whole foods over processed ones: better satiety, fewer hidden calories.",
    "Combine cardio with strength training to preserve muscle while losing fat.",
    "Sleep deprivation raises hunger hormones — protect your 7–9 hours.",
  ],
  gain_weight: [
    "Aim for a 250–500 kcal surplus daily for lean, steady muscle growth.",
    "Eat protein within 2 hours post-workout when muscle synthesis peaks.",
    "Compound lifts (squat, deadlift, bench) drive the most hypertrophy.",
    "Carbs replenish glycogen — don't fear them on training days.",
    "Sleep is when muscles rebuild — it's as important as your training.",
    "Progressive overload weekly, even by small increments, drives gains.",
  ],
  maintain: [
    "Consistency in meal timing helps regulate your metabolism.",
    "A balanced plate: 50% veg, 25% protein, 25% complex carbs.",
    "Track macros weekly rather than daily for a stress-free perspective.",
    "Nutrient density matters — vitamins and minerals fuel everything.",
    "Mild dehydration reduces performance by 5–10% — stay topped up.",
    "Mindful eating: slow down and let satiety signals catch up.",
  ],
};

const activityBonus: Record<number, string> = {
  0: "Even a 20-min walk after meals improves insulin sensitivity.",
  1: "Rest days are when muscle is built — honour them fully.",
  2: "Elite output demands 1.6–2.2g protein/kg bodyweight. Check yours.",
};

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "Fat Loss",
  gain_weight: "Muscle Gain",
  maintain: "Maintenance",
};

function getWeeklyInsight(goal: string, activityLevel: number): string {
  // Use ISO week number so the tip changes every Monday, deterministically
  const now = new Date();
  const weekIndex = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
  const tips = [...(goalInsights[goal] ?? goalInsights.maintain)];
  const bonus = activityBonus[activityLevel];
  if (bonus) tips.push(bonus);
  return tips[weekIndex % tips.length];
}
export function AppShell({ children }: AppShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  
  const handleLogout = () => {
    clearAuth();
    navigate({ to: "/login", replace: true });
  };
  
  // 1. Manage user state directly inside the shell to ensure persistent hydration
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [weeklyInsight, setWeeklyInsight] = useState("");
  const [insightGoalLabel, setInsightGoalLabel] = useState("This week");

  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem(USER_PROFILE_KEY);
      if (storedProfile) {
        const parsed: UserProfile = JSON.parse(storedProfile);
        setUserData(parsed);

        const goal = parsed?.userInfo?.healthGoal ?? "maintain";
        const activity = parsed?.userInfo?.activityLevel ?? 1;
        setWeeklyInsight(getWeeklyInsight(goal, activity));
        setInsightGoalLabel(GOAL_LABELS[goal] ?? "This week");
      } else {
        setWeeklyInsight(getWeeklyInsight("maintain", 1));
      }
    } catch (error) {
      console.error("Failed to parse user profile from storage:", error);
      setWeeklyInsight(getWeeklyInsight("maintain", 1));
    }
  }, []);
  // 2. Fallback normalization strategy to capture backend key discrepancies gracefully
  const rawDisplayName = 
    userData?.name || 
    userData?.username || 
    userData?.user_name || 
    "Guest User";

  const currentDay = userData?.dayOfPlan ?? 1;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "??";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const userInitials = getInitials(rawDisplayName);

  const renderSidebarContent = (isMobile = false) => {
    return (
      <div className="flex h-full flex-col">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf shadow-[0_4px_14px_-2px] shadow-leaf/40">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold text-sidebar-foreground">
              NutriSmart
            </div>
            <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50">
              Pro plan
            </div>
          </div>
        </Link>

        {isMobile && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-sidebar-accent/40 p-3 border border-sidebar-border/30">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-leaf to-citrus text-sm font-semibold text-primary uppercase select-none">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">
                {rawDisplayName}
              </div>
              {/* <div className="text-[11px] text-sidebar-foreground/60">
                Day {currentDay} of plan
              </div> */}
              <div className="text-[11px] text-muted-foreground">
  Welcome 
</div>
            </div>
          </div>
        )}

        <nav className="mt-6 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-leaf/20 px-2 py-0.5 text-[10px] font-semibold text-leaf">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          {weeklyInsight && (
            <div className="rounded-2xl border border-leaf/20 bg-sidebar-accent/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sidebar-foreground">
                  <Sparkles className="h-4 w-4 text-leaf shrink-0" />
                  <span className="text-sm font-semibold">Weekly tip</span>
                </div>
                <span className="rounded-full bg-leaf/20 px-2 py-0.5 text-[10px] font-semibold text-leaf shrink-0">
                  {insightGoalLabel}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/70">
                {weeklyInsight}
              </p>
            </div>
          )}
          
          <Link
            to="/settings"
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/settings")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            }`}
          >
            <Settings className="h-4.5 w-4.5" />
            <span>Settings</span>
          </Link>

          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
          {renderSidebarContent(false)}
        </aside>

        <Sheet>
          <SheetContent side="left" className="w-[280px] bg-sidebar border-sidebar-border p-4 text-sidebar-foreground">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">Mobile navigation menu drawer</SheetDescription>
            {renderSidebarContent(true)}
          </SheetContent>

          <main className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 flex h-16 items-center gap-2 sm:gap-4 border-b border-border bg-background/80 px-3 sm:px-6 backdrop-blur-xl">
              <SheetTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted lg:hidden shrink-0">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>

              {/* <div className="flex flex-1 items-center gap-3 min-w-0">
                <div className="relative w-full max-w-[120px] sm:max-w-xs md:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Search…"
                    className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              </div> */}
              
              {/* <button className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted">
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-leaf" />
              </button> */}
 <div className="ml-auto">
  <Link
    to="/library"
    className="flex h-10 items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
  >
    <Plus className="h-4 w-4" />
    <span>Log meal</span>
  </Link>
</div>

              
              {/* 3. Uses synchronized storage parameters directly */}
              <div className="flex items-center gap-2 sm:gap-3 border-l border-border pl-2 sm:pl-4 shrink-0">
                <div className="hidden md:block text-right">
                  <div className="text-sm font-semibold leading-tight">{rawDisplayName}</div>
                  {/* <div className="text-[11px] text-muted-foreground">Day {currentDay} of plan</div> */}
                             <div className="text-[11px] text-muted-foreground">
  Welcome 
</div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-leaf to-citrus text-sm font-semibold text-primary uppercase select-none">
                  {userInitials}
                </div>
              </div>
            </header>
            {children}
          </main>
        </Sheet>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-leaf">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}