import { useState, useEffect } from "react";
// import { createFileRoute } from "@tanstack/react-router";
import { User, Shield, Check, Loader2, AlertCircle } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui-bits";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { API_BASE, AUTH_TOKEN_KEY, USER_PROFILE_KEY } from "@/lib/api";

const API_BASE_URL = `${API_BASE}/user`;

// --- AUTHENTICATION HOOK BRIDGE (ALIGNED WITH LOGIN PAGE) ---
function useAuth() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const userProfileStr = localStorage.getItem(USER_PROFILE_KEY);
  
  let userId: string | null = null;
  if (userProfileStr) {
    try {
      const user = JSON.parse(userProfileStr);
      // Fallback matching your schema variables (userId or id)
      userId = user.userId || user.id || null;
    } catch (e) {
      console.error("Failed to parse user_profile payload", e);
    }
  }

  const isAuthenticated = !!token && !!userId;
  return { userId, token, isAuthenticated };
}

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NutriSmart" },
      { name: "description", content: "Manage your personalized profile parameters." },
    ],
  }),
  component: SettingsPage,
});

const navigationSections = [
  { id: "account", label: "Account Details", icon: User },
  { id: "metrics", label: "Biometrics & Goals", icon: Shield },
];

function SettingsPage() {  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_profile");

    navigate({
      to: "/login",
      replace: true,
    });
  };

  const { userId, token, isAuthenticated } = useAuth();
  
  const [activeSection, setActiveSection] = useState("account");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });

  // Endpoint 1 Form State (/user/{userId}/update)
  const [accountForm, setAccountForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user"
  });

  // Endpoint 2 Form State (/user/{userId})
const [profileForm, setProfileForm] = useState({
  fullName: "",
  weight: 0,
  height: 0,
  age: 0,
  gender: "male",
  healthGoal: "lose_weight",
  activityLevel: 1,
});

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  });

  // --- RETRIEVE ALL USER DATA ON ENTRY ---
  useEffect(() => {
    async function fetchUserData() {
      if (!isAuthenticated || !userId) {
        setInitialLoading(false);
        return;
      }

      try {
        // GET Request to fetch existing dataset
        const response = await fetch(`${API_BASE_URL}/${userId}`, {
          method: "GET",
          headers: getHeaders(),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("NutriSmart Loaded Payload Data:", data);

          // Maps fields from nested 'userInfo' object natively returned by the backend
          const src = data.userInfo || data || {};
          
          // Hydrate Biometrics & Goals using your exact backend schema keys
          setProfileForm({
            fullName: src.fullName || "",
            weight: src.weight !== undefined ? Number(src.weight) : 0,
            height: src.height !== undefined ? Number(src.height) : 0,
            age: src.age !== undefined ? Number(src.age) : 0,
            gender: src.gender || "male",
            healthGoal: src.healthGoal || "lose_weight",
            activityLevel: src.activityLevel !== undefined ? Number(src.activityLevel) : 1,
          });

          // Hydrate Account Details from root level payload keys
          setAccountForm(prev => ({
            ...prev,
            username: data.username || "",
            email: data.email || "",
            role: data.role || "user"
          }));
        } else if (response.status === 401) {
          triggerToast("Session expired. Please log in again.");
        }
      } catch (err) {
        console.error("Profile Data Fetching Interrupted:", err);
      } finally {
        setInitialLoading(false);
      }
    }

    fetchUserData();
  }, [userId, token, isAuthenticated]);

  // --- SAVE REVISED STATE DATA ---
  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    console.log("Sending:", accountForm);
    try {
      if (activeSection === "account") {
        if (isChangingPassword) {
          if (!passwordForm.newPassword) {
            triggerToast("Please enter a new password.");
            setLoading(false);
            return;
          }
          if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            triggerToast("Passwords do not match.");
            setLoading(false);
            return;
          }
          if (passwordForm.newPassword.length < 6) {
            triggerToast("Password must be at least 6 characters long.");
            setLoading(false);
            return;
          }
        }

        const payload: any = {
          username: accountForm.username,
          email: accountForm.email,
        };
        if (isChangingPassword && passwordForm.newPassword) {
          payload.password = passwordForm.newPassword;
        }

        // Account Details Update Path
        const res = await fetch(`${API_BASE_URL}/${userId}/update`, {
          method: "PUT", 
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Account details update failed.");

        if (isChangingPassword) {
          setIsChangingPassword(false);
          setPasswordForm({ newPassword: "", confirmPassword: "" });
        }
      } else {
        // Biometrics and Goals Update Path
        const res = await fetch(`${API_BASE_URL}/${userId}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(profileForm),
        });
        if (!res.ok) throw new Error("Biometrics update failed.");
      }

      triggerToast("Changes successfully saved!");
    } catch (error) {
      console.error(error);
      triggerToast("An error occurred while saving your data.");
    } finally {
      setLoading(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!initialLoading && !isAuthenticated) {
    return (
      <AppShell>
        <div className="flex flex-col h-[50vh] w-full items-center justify-center p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="font-display text-lg font-semibold">Authentication Missing</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Please log in to your account to load and adjust your profile configurations.
          </p>
        </div>
      </AppShell>
    );
  }

  if (initialLoading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 p-6 relative">
        <PageHeader
          eyebrow={`Active Profile ID: #${userId}`}
          title="Account Settings"
          description="Manage configuration variables synced live with your remote session identity."
        />

        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xl">
            <Check className="h-4 w-4 stroke-[3]" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav className="h-fit rounded-2xl border border-border bg-card p-2 shadow-sm">
            {navigationSections.map((s) => {
              const Icon = s.icon;
              const isSelected = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                    isSelected ? "bg-muted text-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="space-y-6">
            {/* TAB SECTION 1: ACCOUNT DETAILS */}
            {activeSection === "account" && (
              <Card>
                <h3 className="font-display text-base font-semibold mb-4">Credentials Framework</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field 
                    label="Username" 
                    value={accountForm.username} 
                    onChange={(val) => setAccountForm(p => ({ ...p, username: val }))} 
                  />
                  <Field 
                    label="Email Address" 
                    value={accountForm.email} 
                    onChange={(val) => setAccountForm(p => ({ ...p, email: val }))} 
                  />

                  {!isChangingPassword ? (
                    <div className="block w-full">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Password</span>
                      <div className="flex items-center gap-3 mt-1.5">
                        <input
                          type="password"
                          value="••••••••"
                          disabled
                          className="h-11 flex-1 rounded-xl border border-border bg-muted/40 px-3 text-sm font-medium opacity-60 cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={() => setIsChangingPassword(true)}
                          className="h-11 px-4 rounded-xl border border-border bg-background text-xs font-semibold hover:bg-muted transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="col-span-1 sm:col-span-2 grid gap-4 sm:grid-cols-2 rounded-xl border border-border p-4 bg-muted/20">
                      <Field
                        label="New Password"
                        type="password"
                        placeholder="Enter new password"
                        value={passwordForm.newPassword}
                        onChange={(val) => setPasswordForm(p => ({ ...p, newPassword: val }))}
                      />
                      <Field
                        label="Confirm Password"
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordForm.confirmPassword}
                        onChange={(val) => setPasswordForm(p => ({ ...p, confirmPassword: val }))}
                      />
                      <div className="col-span-1 sm:col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPassword(false);
                            setPasswordForm({ newPassword: "", confirmPassword: "" });
                          }}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel Password Change
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="block">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account Role</span>
                   <select
  value={accountForm.role}
  disabled
  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm font-medium opacity-60 cursor-not-allowed"
>
                      <option value="user">User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
              </Card>
            )}

            {/* TAB SECTION 2: BIOMETRICS & GOALS */}
            {activeSection === "metrics" && (
              <Card>
                <h3 className="font-display text-base font-semibold mb-4">Physical Attributes & Goals</h3>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <Field 
                    label="Full Name" 
                    value={profileForm.fullName} 
                    onChange={(val) => setProfileForm(p => ({ ...p, fullName: val }))} 
                  />
                  <Field 
                    label="Weight (kg)" 
                    type="number"
                    value={profileForm.weight !== undefined && profileForm.weight !== null ? profileForm.weight.toString() : ""} 
                    onChange={(val) => setProfileForm(p => ({ ...p, weight: val === "" ? 0 : Number(val) }))} 
                  />
                  <Field 
                    label="Height (cm)" 
                    type="number"
                    value={profileForm.height !== undefined && profileForm.height !== null ? profileForm.height.toString() : ""} 
                    onChange={(val) => setProfileForm(p => ({ ...p, height: val === "" ? 0 : Number(val) }))} 
                  />
                  <Field 
                    label="Age" 
                    type="number"
                    value={profileForm.age !== undefined && profileForm.age !== null ? profileForm.age.toString() : ""} 
                    onChange={(val) => setProfileForm(p => ({ ...p, age: val === "" ? 0 : Number(val) }))} 
                  />
                  <div className="block">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gender Specifier</span>
                    <select 
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm(p => ({ ...p, gender: e.target.value }))}
                      className="mt-1.5 h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all font-medium"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="block">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target Health Goal</span>
                    <select 
                      value={profileForm.healthGoal}
                      onChange={(e) => setProfileForm(p => ({ ...p, healthGoal: e.target.value }))}
                      className="mt-1.5 h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all font-medium"
                    >
                      <option value="lose_weight">Lose Weight</option>
                      <option value="maintain">Maintain Weight</option>
                      <option value="gain_muscle">Gain Muscle</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid gap-4">
                 <div className="block">
  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
    Activity Level
  </span>

  <select
    value={profileForm.activityLevel}
    onChange={(e) =>
      setProfileForm((p) => ({
        ...p,
        activityLevel: Number(e.target.value),
      }))
    }
    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all font-medium"
  >
    <option value={1}>Sedentary</option>
    <option value={2}>Lightly Active</option>
    <option value={3}>Moderately Active</option>
    <option value={4}>Very Active</option>
    <option value={5}>Extremely Active</option>
  </select>
</div>
                  {/* <Field 
                    label="Allergies Manifestations" 
                    value={profileForm.allergies} 
                    onChange={(val) => setProfileForm(p => ({ ...p, allergies: val }))} 
                  />
                  <Field 
                    label="Disliked Ingredients / Dislikes" 
                    value={profileForm.dislikes} 
                    onChange={(val) => setProfileForm(p => ({ ...p, dislikes: val }))} 
                  /> */}
                  {/* <Field 
                    label="Dietary Regimen Preferences" 
                    value={profileForm.dietaryPreferences} 
                    onChange={(val) => setProfileForm(p => ({ ...p, dietaryPreferences: val }))} 
                  /> */}
                </div>
              </Card>
            )}

            <div className="flex justify-end gap-2 pt-2">
             
              {/* <button
    type="button"
    onClick={handleLogout}
    className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700"
  >
    Logout
  </button> */}
             <button 
                type="button" 
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 stroke-[2.5]" />} 
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// --- FIELD SUBCOMPONENT ---
function Field({ 
  label, 
  value, 
  onChange, 
  type = "text",
  placeholder = "",
  disabled = false,
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block w-full">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all font-medium"
      />
    </label>
  );
}