import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Dumbbell, Target, Scale, Check, Loader2 } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set Up Your Profile — NutriSmart" },
    ],
  }),
  component: OnboardingPage,
});

type Step = 1 | 2 | 3;

interface StoredUserSession {
  userId: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // --- CORE STATE ARCHITECTURE ---
  const [profile, setProfile] = useState({
    fullName: "",
    goal: "maintain", // lose | gain | maintain
    activity: "moderate", // sedentary | moderate | active
    weight: "",
    height: "",
    age: "",
    gender: "female",
    restrictions: [] as string[],
  });

  // --- STEP 2 VALIDATION ERRORS ---
  type Step2Errors = { weight?: string; height?: string; age?: string };
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});

  // Pull local session context parameters safely on mount
  useEffect(() => {
    try {
      // 1. Acquire authorization token from storage matrix
      const token = localStorage.getItem("auth_token");
      
      // Route Protection Guardrail: If no token exists, bounce back to authenticate
      if (!token) {
        setErrorMessage("Authentication session missing. Redirecting to login...");
        setTimeout(() => {
          navigate({ to: "/login" });
        }, 1500);
        return;
      }
      
      setAuthToken(token);

      // 2. Load user session details
      const storedSession = localStorage.getItem("user_profile");
      if (storedSession) {
        const parsed: StoredUserSession = JSON.parse(storedSession);
        setCurrentUserId(parsed.userId);
        if (parsed.username) {
          setProfile((prev) => ({ ...prev, fullName: parsed.username }));
        }
      }
    } catch (e) {
      console.error("Failed to read user data parameters out of local cache session:", e);
    }
  }, [navigate]);

  // Validate Step 2 before advancing
  const validateStep2 = (): boolean => {
    const errors: Step2Errors = {};
    const w = parseFloat(profile.weight);
    const h = parseFloat(profile.height);
    const a = parseInt(profile.age, 10);

    if (!profile.weight.trim()) {
      errors.weight = "Weight is required.";
    } else if (isNaN(w) || w < 10 || w > 500) {
      errors.weight = "Enter a valid weight between 10 – 500 kg.";
    }

    if (!profile.height.trim()) {
      errors.height = "Height is required.";
    } else if (isNaN(h) || h < 50 || h > 300) {
      errors.height = "Enter a valid height between 50 – 300 cm.";
    }

    if (!profile.age.trim()) {
      errors.age = "Age is required.";
    } else if (isNaN(a) || a < 1 || a > 120 || !Number.isInteger(parseFloat(profile.age))) {
      errors.age = "Enter a whole number age between 1 – 120 years.";
    }

    setStep2Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (step === 2 && !validateStep2()) return;
    setStep2Errors({});
    setStep((s) => (s + 1) as Step);
  };
  const prevStep = () => {
    setStep2Errors({});
    setStep((s) => (s - 1) as Step);
  };

  const toggleRestriction = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      restrictions: prev.restrictions.includes(id)
        ? prev.restrictions.filter((r) => r !== id)
        : [...prev.restrictions, id],
    }));
  };

  // --- API INTEGRATION HANDLER ---
  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fallback assignment validation if profile context session parameter hasn't synced
    const targetUserId = currentUserId || 3; 
    
    setIsSubmitting(true);
    setErrorMessage(null);

    // Map UI structural configurations to strict API specifications
    const goalMapping: Record<string, string> = {
      lose: "lose_weight",
      maintain: "maintain",
      gain: "gain_weight",
    };

    const activityMapping: Record<string, number> = {
      sedentary: 0,
      moderate: 1,
      active: 2,
    };

    const payload = {
      fullName: profile.fullName || "User",
      weight: parseFloat(profile.weight) || 0,
      height: parseFloat(profile.height) || 0,
      age: parseInt(profile.age, 10) || 22,
      gender: profile.gender,
      healthGoal: goalMapping[profile.goal] || "maintain_weight",
      activityLevel: activityMapping[profile.activity] ?? 1,
      allergies: profile.restrictions.join(", "),
      dislikes: "",
      dietaryPreferences: profile.restrictions.includes("vegan") || profile.restrictions.includes("vegetarian") 
        ? profile.restrictions.filter(r => ["vegan", "vegetarian", "keto"].includes(r)).join(", ")
        : "",
    };

    try {
      const response = await fetch(`https://nutiplanner-api-2.onrender.com/user/${targetUserId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          // INJECTED AUTHORIZATION VALUE TO PREVENT 401 MUTATIONS CRASH
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your login session expired or is invalid. Please log in again.");
        }
        throw new Error(`Server returned error status code: ${response.status}`);
      }

      const jsonResponse = await response.json();
      
      // Sync mutations smoothly back down into client layer layout context state cache
      if (jsonResponse?.data) {
        const freshSessionData = {
          userId: jsonResponse.data.userId,
          username: jsonResponse.data.username,
          email: jsonResponse.data.email,
          role: jsonResponse.data.role,
          createdAt: jsonResponse.data.createdAt,
          userInfo: jsonResponse.data.userInfo
        };
        localStorage.setItem("user_profile", JSON.stringify(freshSessionData));
      }

      // Route smoothly into dashboard view
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      console.error("Critical onboarding form propagation exception caught:", error);
      setErrorMessage(error?.message || "Communication pipeline to Render infrastructure timed out or broke.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Progress header */}
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold">NutriSmart</span>
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase">Engine Configuration</span>
          </div>
          <div className="text-xs font-semibold text-muted-foreground">
            Step {step} of 3
          </div>
        </div>

        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="mb-4 rounded-2xl bg-destructive/10 p-4 text-sm font-medium text-destructive animate-in fade-in slide-in-from-top-2">
            {errorMessage}
          </div>
        )}

        {/* Form panel block */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-10">
          
          {/* STEP 1: Core Goal */}
          {step === 1 && (
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-citrus/20 text-primary">
                <Target className="h-5 w-5 text-citrus" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">What's your primary focus?</h2>
              <p className="mt-1 text-sm text-muted-foreground">We modify macro parameters around this baseline intent.</p>

              <div className="mt-8 space-y-3">
                {[
                  { id: "lose", title: "Weight Loss / Fat Burn", desc: "Slight deficit layout targeted at lean muscle hold." },
                  { id: "maintain", title: "Maintain & Recomp", desc: "Optimizing vital health rings and metabolic strength balance." },
                  { id: "gain", title: "Hypertrophy / Mass Gain", desc: "Caloric and carb surplus targeting structural output optimization." }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProfile({ ...profile, goal: item.id })}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      profile.goal === item.id 
                        ? "border-leaf bg-leaf-soft/40 ring-1 ring-leaf" 
                        : "border-border bg-background hover:bg-muted/30"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                    </div>
                    {profile.goal === item.id && <div className="h-5 w-5 rounded-full bg-leaf flex items-center justify-center text-primary"><Check className="h-3 w-3" /></div>}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button type="button" onClick={nextStep} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Activity Profiles & Physical Metrics */}
          {step === 2 && (
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lavender/20 text-primary">
                <Scale className="h-5 w-5 text-lavender" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">Metrics &amp; Physical Activity</h2>
              <p className="mt-1 text-sm text-muted-foreground">All fields are required — used to accurately calculate your TDEE and daily water targets.</p>

              {/* Weight & Height */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                {/* Weight */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Weight (kg) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 65"
                    min={10}
                    max={500}
                    step={0.1}
                    value={profile.weight}
                    onKeyDown={(e) => {
                      // Block e, E, +, - but allow decimal point
                      if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      setProfile({ ...profile, weight: e.target.value });
                      if (step2Errors.weight) setStep2Errors((prev) => ({ ...prev, weight: undefined }));
                    }}
                    className={`w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none transition-colors ${
                      step2Errors.weight
                        ? "border-destructive focus:border-destructive"
                        : "border-border focus:border-leaf"
                    }`}
                  />
                  {step2Errors.weight && (
                    <p className="mt-1.5 text-xs text-destructive font-medium">{step2Errors.weight}</p>
                  )}
                </div>

                {/* Height */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Height (cm) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 165"
                    min={50}
                    max={300}
                    step={0.1}
                    value={profile.height}
                    onKeyDown={(e) => {
                      if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      setProfile({ ...profile, height: e.target.value });
                      if (step2Errors.height) setStep2Errors((prev) => ({ ...prev, height: undefined }));
                    }}
                    className={`w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none transition-colors ${
                      step2Errors.height
                        ? "border-destructive focus:border-destructive"
                        : "border-border focus:border-leaf"
                    }`}
                  />
                  {step2Errors.height && (
                    <p className="mt-1.5 text-xs text-destructive font-medium">{step2Errors.height}</p>
                  )}
                </div>
              </div>

              {/* Age & Gender */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                {/* Age */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Age (years) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 25"
                    min={1}
                    max={120}
                    step={1}
                    value={profile.age}
                    onKeyDown={(e) => {
                      // Block decimal point, e, E, +, - for age (integers only)
                      if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      // Strip any decimals that might sneak through paste
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setProfile({ ...profile, age: val });
                      if (step2Errors.age) setStep2Errors((prev) => ({ ...prev, age: undefined }));
                    }}
                    className={`w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none transition-colors ${
                      step2Errors.age
                        ? "border-destructive focus:border-destructive"
                        : "border-border focus:border-leaf"
                    }`}
                  />
                  {step2Errors.age && (
                    <p className="mt-1.5 text-xs text-destructive font-medium">{step2Errors.age}</p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Gender <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-leaf focus:outline-none h-[46px] transition-colors"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>

              {/* Activity Level */}
              <div className="mt-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Weekly Activity Level <span className="text-destructive">*</span>
                </label>
                <div className="space-y-3">
                  {[
                    { id: "sedentary", label: "Sedentary", desc: "Desk job, little to no exercise." },
                    { id: "moderate", label: "Active Trainer", desc: "3–5 workouts or runs per week." },
                    { id: "active", label: "Elite Output", desc: "Daily heavy training or athletic performance." }
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setProfile({ ...profile, activity: act.id })}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        profile.activity === act.id
                          ? "border-leaf bg-leaf-soft/40 ring-1 ring-leaf"
                          : "border-border bg-background hover:bg-muted/30"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm">{act.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{act.desc}</div>
                      </div>
                      {profile.activity === act.id && (
                        <div className="h-5 w-5 rounded-full bg-leaf flex items-center justify-center text-primary">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button type="button" onClick={prevStep} className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted">Back</button>
                <button type="button" onClick={nextStep} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Continue</button>
              </div>
            </div>
          )}

        {/* STEP 3: FINAL BUILD DASHBOARD ONLY */}
{step === 3 && (
  <div className="flex flex-col items-center justify-center text-center py-10">

    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-leaf-soft text-primary">
      <Dumbbell className="h-6 w-6 text-leaf" />
    </div>

    <h2 className="mt-6 font-display text-2xl font-semibold sm:text-3xl">
      Ready to build your dashboard
    </h2>

    <p className="mt-2 text-sm text-muted-foreground">
      Your profile setup is complete. Click below to generate your personalized plan.
    </p>

    {/* ONLY BUTTON */}
    <div className="mt-8">
      <button
        type="button"
        disabled={isSubmitting || !authToken}
        onClick={handleFinish}
        className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Building..." : "Build My Dashboard"}
      </button>
    </div>

  </div>
)}

        </div>
      </div>
    </div>
  );
}