const storageKey = "pocketpilot.entries.v1";
const goalStorageKey = "pocketpilot.savingsGoal.v1";
const profileStorageKey = "pocketpilot.profile.v1";
const defaultSavingsGoal = 500;
const categoryColors = ["#33d17a", "#f0b45b", "#7aa7ff", "#ff7468", "#b78cff", "#63d8ff", "#d8e46f", "#9ca59d"];

const seedEntries = [
  { id: makeId(), type: "income", amount: 520, category: "Work", note: "Freelance payout", date: daysAgo(1) },
  { id: makeId(), type: "expense", amount: 18.5, category: "Food", note: "Lunch", date: daysAgo(0) },
  { id: makeId(), type: "expense", amount: 23.75, category: "Food", note: "Groceries", date: daysAgo(2) },
  { id: makeId(), type: "expense", amount: 14, category: "Transport", note: "Gas", date: daysAgo(3) },
  { id: makeId(), type: "expense", amount: 39.99, category: "Entertainment", note: "Streaming and movie", date: daysAgo(5) }
];

const elements = {
  form: document.querySelector("#entryForm"),
  addEntryButton: document.querySelector("#addEntryButton"),
  amount: document.querySelector("#amount"),
  category: document.querySelector("#category"),
  note: document.querySelector("#note"),
  todayLabel: document.querySelector("#todayLabel"),
  todayBalance: document.querySelector("#todayBalance"),
  editProfile: document.querySelector("#editProfile"),
  editProfilePanel: document.querySelector("#editProfilePanel"),
  dailyReminder: document.querySelector("#dailyReminder"),
  weekIncome: document.querySelector("#weekIncome"),
  weekSpending: document.querySelector("#weekSpending"),
  weekBalance: document.querySelector("#weekBalance"),
  reportTrend: document.querySelector("#reportTrend"),
  reportSpent: document.querySelector("#reportSpent"),
  reportTopCategory: document.querySelector("#reportTopCategory"),
  reportSummary: document.querySelector("#reportSummary"),
  achievementList: document.querySelector("#achievementList"),
  onboardingOverlay: document.querySelector("#onboardingOverlay"),
  onboardingForm: document.querySelector("#onboardingForm"),
  monthlyIncome: document.querySelector("#monthlyIncome"),
  onboardingSavingsGoal: document.querySelector("#onboardingSavingsGoal"),
  spendingProblem: document.querySelector("#spendingProblem"),
  goalForm: document.querySelector("#goalForm"),
  saveGoalButton: document.querySelector("#saveGoalButton"),
  goalAmount: document.querySelector("#goalAmount"),
  goalStatus: document.querySelector("#goalStatus"),
  goalPercent: document.querySelector("#goalPercent"),
  goalProgress: document.querySelector("#goalProgress"),
  goalSaved: document.querySelector("#goalSaved"),
  goalRemaining: document.querySelector("#goalRemaining"),
  streakNumber: document.querySelector("#streakNumber"),
  streakMessage: document.querySelector("#streakMessage"),
  streakDots: document.querySelector("#streakDots"),
  coachAdvice: document.querySelector("#coachAdvice"),
  coachScore: document.querySelector("#coachScore"),
  fixMoneyButton: document.querySelector("#fixMoneyButton"),
  spendingPlanCard: document.querySelector("#spendingPlanCard"),
  planBudget: document.querySelector("#planBudget"),
  planDaily: document.querySelector("#planDaily"),
  planCut: document.querySelector("#planCut"),
  planSavings: document.querySelector("#planSavings"),
  planSteps: document.querySelector("#planSteps"),
  activityList: document.querySelector("#activityList"),
  entryCount: document.querySelector("#entryCount"),
  navItems: document.querySelectorAll(".nav-item"),
  appViews: document.querySelectorAll(".app-view"),
  profileIncome: document.querySelector("#profileIncome"),
  profileGoal: document.querySelector("#profileGoal"),
  profileProblem: document.querySelector("#profileProblem"),
  profileNote: document.querySelector("#profileNote"),
  authForm: document.querySelector("#authForm"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  signInButton: document.querySelector("#signInButton"),
  signUpButton: document.querySelector("#signUpButton"),
  signOutButton: document.querySelector("#signOutButton"),
  authStatus: document.querySelector("#authStatus"),
  syncStatus: document.querySelector("#syncStatus"),
  resetDemo: document.querySelector("#resetDemo"),
  chart: document.querySelector("#balanceChart"),
  categoryChart: document.querySelector("#categoryChart")
};

let entries = loadEntries();
let userProfile = loadUserProfile();
let savingsGoal = userProfile ? userProfile.savingsGoal : loadSavingsGoal();
let supabaseClient = null;
let currentUser = null;
let isCloudLoading = false;
let balanceAnimationFrame = null;
let categoryAnimationFrame = null;

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(elements.form);
  const amount = Number.parseFloat(String(formData.get("amount")).replace(/,/g, ""));

  if (!Number.isFinite(amount) || amount <= 0) {
    elements.amount.focus();
    return;
  }

  setButtonLoading(elements.addEntryButton, true, "Adding...");

  const entry = {
    id: makeId(),
    type: formData.get("type"),
    amount,
    category: formData.get("category"),
    note: String(formData.get("note") || "").trim(),
    date: new Date().toISOString()
  };

  entries.unshift(entry);

  saveEntries();
  elements.form.reset();
  document.querySelector('input[name="type"][value="expense"]').checked = true;
  render();
  await wait(450);
  setButtonLoading(elements.addEntryButton, false);
  await syncTransactionToCloud(entry);
});

elements.goalForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const amount = Number.parseFloat(elements.goalAmount.value.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    elements.goalAmount.focus();
    return;
  }

  setButtonLoading(elements.saveGoalButton, true, "Saving...");
  savingsGoal = amount;
  saveSavingsGoal();
  if (userProfile) {
    userProfile.savingsGoal = amount;
    saveUserProfile();
  }
  render();
  await wait(450);
  setButtonLoading(elements.saveGoalButton, false);
  await syncProfileToCloud();
});

elements.onboardingForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const monthlyIncome = parseMoney(elements.monthlyIncome.value);
  const profileGoal = parseMoney(elements.onboardingSavingsGoal.value);

  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
    elements.monthlyIncome.focus();
    return;
  }

  if (!Number.isFinite(profileGoal) || profileGoal <= 0) {
    elements.onboardingSavingsGoal.focus();
    return;
  }

  userProfile = {
    monthlyIncome,
    savingsGoal: profileGoal,
    spendingProblem: elements.spendingProblem.value,
    createdAt: new Date().toISOString()
  };
  savingsGoal = profileGoal;
  saveUserProfile();
  saveSavingsGoal();
  hideOnboarding();
  render();
  syncProfileToCloud();
});

elements.editProfile.addEventListener("click", () => {
  showOnboarding();
});

elements.editProfilePanel.addEventListener("click", () => {
  showOnboarding();
});

elements.navItems.forEach((item) => {
  item.addEventListener("click", () => {
    setActiveView(item.dataset.targetView);
  });
});

elements.signInButton.addEventListener("click", async () => {
  await signIn();
});

elements.signUpButton.addEventListener("click", async () => {
  await signUp();
});

elements.signOutButton.addEventListener("click", async () => {
  await signOut();
});

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await signIn();
});

elements.fixMoneyButton.addEventListener("click", async () => {
  setButtonLoading(elements.fixMoneyButton, true, "Building plan...");
  await wait(1300);
  renderSpendingPlan();
  setButtonLoading(elements.fixMoneyButton, false);
});

elements.resetDemo.addEventListener("click", () => {
  entries = [...seedEntries];
  savingsGoal = userProfile ? userProfile.savingsGoal : defaultSavingsGoal;
  saveEntries();
  saveSavingsGoal();
  render();
});

render();
registerServiceWorker();
initSupabase();
if (!userProfile) {
  showOnboarding();
}

function loadEntries() {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return [...seedEntries];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [...seedEntries];
  } catch {
    return [...seedEntries];
  }
}

function saveEntries() {
  localStorage.setItem(storageKey, JSON.stringify(entries));
}

function hasStoredEntries() {
  return localStorage.getItem(storageKey) !== null;
}

function loadSavingsGoal() {
  const stored = Number.parseFloat(localStorage.getItem(goalStorageKey));
  return Number.isFinite(stored) && stored > 0 ? stored : defaultSavingsGoal;
}

function saveSavingsGoal() {
  localStorage.setItem(goalStorageKey, String(savingsGoal));
}

function loadUserProfile() {
  const stored = localStorage.getItem(profileStorageKey);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    if (
      Number.isFinite(parsed.monthlyIncome) &&
      parsed.monthlyIncome > 0 &&
      Number.isFinite(parsed.savingsGoal) &&
      parsed.savingsGoal > 0 &&
      typeof parsed.spendingProblem === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function saveUserProfile() {
  localStorage.setItem(profileStorageKey, JSON.stringify(userProfile));
}

function showOnboarding() {
  elements.monthlyIncome.value = userProfile ? formatPlainAmount(userProfile.monthlyIncome) : "";
  elements.onboardingSavingsGoal.value = formatPlainAmount(userProfile ? userProfile.savingsGoal : savingsGoal);
  elements.spendingProblem.value = userProfile ? userProfile.spendingProblem : "food";
  elements.onboardingOverlay.hidden = false;
  elements.monthlyIncome.focus();
}

function hideOnboarding() {
  elements.onboardingOverlay.hidden = true;
}

async function initSupabase() {
  const config = window.POCKETPILOT_SUPABASE || {};
  const hasConfig = Boolean(config.url && config.anonKey);

  if (!hasConfig) {
    setAuthState("Local mode", "Add your Supabase URL and anon key in supabase-config.js to enable cloud saving.");
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    setAuthState("Offline", "Supabase could not load. The app is still saving locally.");
    elements.authStatus.classList.add("is-error");
    return;
  }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setAuthState("Auth error", error.message);
    elements.authStatus.classList.add("is-error");
    return;
  }

  currentUser = data.session ? data.session.user : null;
  updateAuthUI();

  if (currentUser) {
    await loadCloudData();
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    currentUser = session ? session.user : null;
    updateAuthUI();

    if (currentUser) {
      await loadCloudData();
    } else {
      if (event === "SIGNED_OUT") {
        clearLocalUserData();
      }
      setSyncStatus("Signed out. Local finance data was cleared from this device.");
    }
  });
}

async function signIn() {
  if (!canUseSupabase()) return;

  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  if (!email || !password) {
    setSyncStatus("Enter an email and password to log in.");
    return;
  }

  setSyncStatus("Logging in...");
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthState("Login failed", error.message);
    elements.authStatus.classList.add("is-error");
  }
}

async function signUp() {
  if (!canUseSupabase()) return;

  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  if (!email || password.length < 8) {
    setSyncStatus("Use an email and a password with at least 8 characters.");
    return;
  }

  setSyncStatus("Creating account...");
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    setAuthState("Signup failed", error.message);
    elements.authStatus.classList.add("is-error");
    return;
  }

  if (!data.session) {
    setSyncStatus("Account created. Check your email if confirmation is enabled in Supabase.");
  }
}

async function signOut() {
  if (!canUseSupabase()) return;
  await supabaseClient.auth.signOut();
}

function clearLocalUserData() {
  entries = [];
  userProfile = null;
  savingsGoal = defaultSavingsGoal;
  localStorage.removeItem(storageKey);
  localStorage.removeItem(profileStorageKey);
  localStorage.removeItem(goalStorageKey);
  render();
  showOnboarding();
}

function canUseSupabase() {
  if (!supabaseClient) {
    setSyncStatus("Supabase is not configured yet. Add your URL and anon key first.");
    return false;
  }

  return true;
}

async function loadCloudData() {
  if (!currentUser || !supabaseClient) return;

  isCloudLoading = true;
  setSyncStatus("Loading cloud data...");

  const [profileResult, transactionsResult] = await Promise.all([
    supabaseClient.from("profiles").select("*").eq("user_id", currentUser.id).maybeSingle(),
    supabaseClient.from("transactions").select("*").eq("user_id", currentUser.id).order("entry_date", { ascending: false })
  ]);

  if (profileResult.error) {
    setSyncStatus(profileResult.error.message);
  } else if (profileResult.data) {
    userProfile = {
      monthlyIncome: Number(profileResult.data.monthly_income),
      savingsGoal: Number(profileResult.data.savings_goal),
      spendingProblem: profileResult.data.spending_problem,
      createdAt: profileResult.data.updated_at
    };
    savingsGoal = userProfile.savingsGoal;
    saveUserProfile();
    saveSavingsGoal();
    hideOnboarding();
  } else if (userProfile) {
    await syncProfileToCloud();
  }

  if (transactionsResult.error) {
    setSyncStatus(transactionsResult.error.message);
  } else if (transactionsResult.data.length) {
    entries = transactionsResult.data.map(fromCloudTransaction);
    saveEntries();
  } else if (hasStoredEntries()) {
    await syncAllToCloud();
  } else {
    entries = [];
    saveEntries();
  }

  isCloudLoading = false;
  setSyncStatus("Cloud sync is on.");
  updateAuthUI();
  render();

  if (!userProfile) {
    showOnboarding();
  }
}

async function syncAllToCloud() {
  if (!currentUser || !supabaseClient) return;

  await syncProfileToCloud();

  const localEntries = hasStoredEntries() ? entries : [];
  if (localEntries.length) {
    const { error } = await supabaseClient
      .from("transactions")
      .upsert(localEntries.map(toCloudTransaction), { onConflict: "id" });
    saveEntries();

    if (error) {
      setSyncStatus(error.message);
      return;
    }
  }

  setSyncStatus("Local data synced to the cloud.");
}

async function syncTransactionToCloud(entry) {
  if (!currentUser || !supabaseClient) return;

  const { error } = await supabaseClient
    .from("transactions")
    .upsert(toCloudTransaction(entry), { onConflict: "id" });

  setSyncStatus(error ? error.message : "Transaction saved to the cloud.");
}

async function syncProfileToCloud() {
  if (!currentUser || !supabaseClient || !userProfile) return;

  const { error } = await supabaseClient
    .from("profiles")
    .upsert({
      user_id: currentUser.id,
      monthly_income: userProfile.monthlyIncome,
      savings_goal: userProfile.savingsGoal,
      spending_problem: userProfile.spendingProblem,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  setSyncStatus(error ? error.message : "Profile saved to the cloud.");
}

async function syncStatsToCloud(streak) {
  if (!currentUser || !supabaseClient || isCloudLoading) return;

  const lastLoggedOn = getLastLoggedOn();
  const { error } = await supabaseClient
    .from("user_stats")
    .upsert({
      user_id: currentUser.id,
      current_streak: streak,
      last_logged_on: lastLoggedOn,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  if (error) setSyncStatus(error.message);
}

function toCloudTransaction(entry) {
  entry.id = normalizeUuid(entry.id);

  return {
    id: entry.id,
    user_id: currentUser.id,
    type: entry.type,
    amount: entry.amount,
    category: entry.category,
    note: entry.note || "",
    entry_date: entry.date,
    created_at: entry.date
  };
}

function fromCloudTransaction(transaction) {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: Number(transaction.amount),
    category: transaction.category,
    note: transaction.note || "",
    date: transaction.entry_date
  };
}

function updateAuthUI() {
  elements.authStatus.classList.remove("is-signed-in", "is-error");

  if (currentUser) {
    elements.authStatus.textContent = "Signed in";
    elements.authStatus.classList.add("is-signed-in");
    elements.signOutButton.hidden = false;
    elements.signInButton.hidden = true;
    elements.signUpButton.hidden = true;
    elements.authEmail.value = currentUser.email || "";
    elements.authPassword.value = "";
    return;
  }

  elements.authStatus.textContent = supabaseClient ? "Signed out" : "Local mode";
  elements.signOutButton.hidden = true;
  elements.signInButton.hidden = false;
  elements.signUpButton.hidden = false;
}

function setAuthState(status, message) {
  elements.authStatus.classList.remove("is-signed-in", "is-error");
  elements.authStatus.textContent = status;
  setSyncStatus(message);
}

function setSyncStatus(message) {
  elements.syncStatus.textContent = message;
}

function render() {
  const today = new Date();
  const weekStart = startOfDay(daysAgo(6));
  const previousWeekStart = startOfDay(daysAgo(13));
  const todayStart = startOfDay(today);
  const weekEntries = entries.filter((entry) => new Date(entry.date) >= weekStart);
  const previousWeekEntries = entries.filter((entry) => {
    const date = new Date(entry.date);
    return date >= previousWeekStart && date < weekStart;
  });
  const todayEntries = entries.filter((entry) => new Date(entry.date) >= todayStart);
  const totals = summarize(weekEntries);
  const previousTotals = summarize(previousWeekEntries);
  const allTotals = summarize(entries);
  const todayTotals = summarize(todayEntries);
  const netBalance = allTotals.income - allTotals.expense;

  elements.todayLabel.textContent = today.toLocaleDateString(undefined, { weekday: "long" });
  animateMoneyElement(elements.todayBalance, todayTotals.income - todayTotals.expense);
  animateMoneyElement(elements.weekIncome, totals.income);
  animateMoneyElement(elements.weekSpending, totals.expense);
  animateMoneyElement(elements.weekBalance, totals.income - totals.expense);

  const goalState = renderGoal(netBalance);
  const streak = renderStreak();
  renderDailyReminder(todayEntries.length > 0);
  renderWeeklyReport(totals, previousTotals, weekEntries);
  renderAchievements({ streak, saved: goalState.saved });
  renderProfile();
  syncStatsToCloud(streak);

  const coaching = getCoaching(weekEntries, totals, previousTotals, netBalance, userProfile);
  elements.coachAdvice.textContent = coaching.advice;
  animatePercentElement(elements.coachScore, coaching.score);

  renderActivity();
  renderBalanceChart(weekEntries);
  renderCategoryChart(weekEntries);
}

function summarize(items) {
  return items.reduce(
    (result, entry) => {
      result[entry.type] += entry.amount;
      return result;
    },
    { income: 0, expense: 0 }
  );
}

function renderGoal(netBalance) {
  const saved = Math.max(0, netBalance);
  const progress = savingsGoal > 0 ? Math.min(100, Math.round((saved / savingsGoal) * 100)) : 0;
  const remaining = Math.max(0, savingsGoal - saved);

  elements.goalAmount.value = savingsGoal % 1 === 0 ? String(savingsGoal) : savingsGoal.toFixed(2);
  elements.goalStatus.textContent = `${money(savingsGoal)} target`;
  animatePercentElement(elements.goalPercent, progress);
  elements.goalProgress.style.width = `${progress}%`;
  animateMoneyElement(elements.goalSaved, saved, " saved");
  if (remaining > 0) {
    animateMoneyElement(elements.goalRemaining, remaining, " to go");
  } else {
    elements.goalRemaining.textContent = "Goal reached";
    elements.goalRemaining.dataset.rawValue = "0";
  }

  return { saved, progress, remaining };
}

function renderStreak() {
  const loggedDays = new Set(entries.map((entry) => dayKey(entry.date)));
  const today = startOfDay(new Date());
  let streak = 0;
  let cursor = new Date(today);

  while (loggedDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const hasToday = loggedDays.has(dayKey(today));
  const hadYesterday = loggedDays.has(dayKey(yesterday));

  animateNumberElement(elements.streakNumber, streak);

  if (hasToday && streak >= 3) {
    elements.streakMessage.textContent = `${streak} straight days logged. Keep the streak alive with one quick entry tomorrow.`;
  } else if (hasToday) {
    elements.streakMessage.textContent = "Today is logged. Add tomorrow's first purchase to build momentum.";
  } else if (hadYesterday) {
    elements.streakMessage.textContent = "You logged yesterday. Add one entry today before bed to protect the streak.";
  } else {
    elements.streakMessage.textContent = "Log money today to start your streak.";
  }

  elements.streakDots.innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(daysAgo(6 - index));
    const label = date.toLocaleDateString(undefined, { weekday: "narrow" });
    const isLogged = loggedDays.has(dayKey(date));
    return `<span class="streak-dot ${isLogged ? "is-logged" : ""}">${label}</span>`;
  }).join("");

  return streak;
}

function renderDailyReminder(hasEntryToday) {
  elements.dailyReminder.hidden = hasEntryToday;
}

function renderWeeklyReport(totals, previousTotals, weekEntries) {
  const topCategory = getTopCategory(weekEntries);
  const spendingDelta = totals.expense - previousTotals.expense;
  const absoluteDelta = Math.abs(spendingDelta);

  animateMoneyElement(elements.reportSpent, totals.expense);
  elements.reportTopCategory.textContent = topCategory ? topCategory.category : "None";
  elements.reportTrend.classList.remove("is-better", "is-worse");

  if (previousTotals.expense === 0 && totals.expense === 0) {
    elements.reportTrend.textContent = "Tracking";
    elements.reportSummary.textContent = "Log a few entries to build your weekly report.";
    return;
  }

  if (previousTotals.expense === 0) {
    elements.reportTrend.textContent = "New week";
    elements.reportSummary.textContent = `You spent ${money(totals.expense)} this week. Keep logging so next week's comparison is smarter.`;
    return;
  }

  if (spendingDelta < 0) {
    elements.reportTrend.textContent = "Improved";
    elements.reportTrend.classList.add("is-better");
    elements.reportSummary.textContent = `You spent ${money(absoluteDelta)} less than last week. Good job.`;
    return;
  }

  if (spendingDelta > 0) {
    elements.reportTrend.textContent = "Worsened";
    elements.reportTrend.classList.add("is-worse");
    elements.reportSummary.textContent = `You spent ${money(absoluteDelta)} more than last week. Pick one category to tighten first.`;
    return;
  }

  elements.reportTrend.textContent = "Steady";
  elements.reportSummary.textContent = "You spent the same as last week. One planned cut can turn this into progress.";
}

function renderAchievements(state) {
  const achievements = [
    {
      title: "First entry",
      detail: "Log your first income or expense.",
      icon: "1",
      earned: entries.length > 0
    },
    {
      title: "3 day streak",
      detail: "Log money for three days in a row.",
      icon: "3",
      earned: state.streak >= 3
    },
    {
      title: "Saved $100",
      detail: "Build a positive balance of at least $100.",
      icon: "$",
      earned: state.saved >= 100
    }
  ];

  elements.achievementList.innerHTML = achievements
    .map((achievement) => `
      <article class="achievement-badge ${achievement.earned ? "is-earned" : ""}">
        <div class="achievement-icon" aria-hidden="true">${achievement.icon}</div>
        <div>
          <strong>${achievement.title}</strong>
          <span>${achievement.earned ? "Unlocked" : achievement.detail}</span>
        </div>
      </article>
    `)
    .join("");
}

function renderProfile() {
  if (!userProfile) {
    elements.profileIncome.textContent = "$0";
    elements.profileGoal.textContent = money(savingsGoal);
    elements.profileProblem.textContent = "Not set";
    elements.profileNote.textContent = "Complete onboarding so PocketPilot can personalize your coach.";
    return;
  }

  elements.profileIncome.textContent = money(userProfile.monthlyIncome);
  elements.profileGoal.textContent = money(userProfile.savingsGoal);
  elements.profileProblem.textContent = getProblemLabel(userProfile.spendingProblem);
  elements.profileNote.textContent = `PocketPilot is watching ${getProblemLabel(userProfile.spendingProblem)} first and aiming toward your ${money(userProfile.savingsGoal)} goal.`;
}

function renderSpendingPlan() {
  const weekStart = startOfDay(daysAgo(6));
  const weekEntries = entries.filter((entry) => new Date(entry.date) >= weekStart);
  const totals = summarize(weekEntries);
  const topCategory = getTopCategory(weekEntries);
  const weeklyIncome = userProfile ? userProfile.monthlyIncome / 4.33 : totals.income;
  const weeklySavingsTarget = weeklyIncome > 0
    ? Math.min(Math.max(15, savingsGoal * 0.08), weeklyIncome * 0.3)
    : Math.max(10, savingsGoal * 0.05);
  const weeklyBudget = Math.max(0, weeklyIncome - weeklySavingsTarget);
  const overspend = Math.max(0, totals.expense - weeklyBudget);
  const topAmount = topCategory ? topCategory.amount : totals.expense;
  const cutAmount = Math.max(5, Math.ceil(Math.max(overspend, topAmount * 0.25)));
  const cutCategory = topCategory ? topCategory.category : getProblemLabel(userProfile ? userProfile.spendingProblem : "other");
  const categoryLimit = Math.max(0, topAmount - cutAmount);
  const savingsPlan = Math.min(cutAmount, Math.max(5, weeklySavingsTarget));
  const budgetLabel = weeklyBudget > 0 ? money(weeklyBudget) : "Track income first";
  const safeDaily = weeklyBudget > 0 ? Math.max(0, Math.floor((weeklyBudget - savingsPlan) / 7)) : 0;

  elements.planBudget.textContent = budgetLabel;
  elements.planDaily.textContent = weeklyBudget > 0 ? money(safeDaily) : "Add income";
  elements.planCut.textContent = `${cutCategory}: ${money(cutAmount)}`;
  elements.planSavings.textContent = `${money(savingsPlan)} this week`;
  elements.planSteps.innerHTML = [
    `Cap ${cutCategory} at ${money(categoryLimit)} and keep daily spending under ${money(safeDaily)}.`,
    `Move exactly ${money(savingsPlan)} toward your ${money(savingsGoal)} savings goal before extra spending.`,
    `Log every purchase the same day and skip one nonessential buy.`
  ].map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  elements.coachAdvice.hidden = true;
  elements.spendingPlanCard.hidden = false;
}

function setActiveView(viewName) {
  elements.appViews.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === viewName);
  });

  elements.navItems.forEach((item) => {
    const isActive = item.dataset.targetView === viewName;
    item.classList.toggle("is-active", isActive);
    if (isActive) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setButtonLoading(button, isLoading, label) {
  if (!button) return;

  if (isLoading) {
    button.dataset.defaultText = button.innerHTML;
    button.disabled = true;
    button.classList.add("is-loading");
    if (label) button.setAttribute("aria-label", label);
    return;
  }

  button.disabled = false;
  button.classList.remove("is-loading");
  if (button.dataset.defaultText) {
    button.innerHTML = button.dataset.defaultText;
  }
  button.removeAttribute("aria-label");
}

function wait(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function getCoaching(items, totals, previousTotals, netBalance, profile) {
  const profileNudge = getProfileNudge(profile, items);

  if (!items.length) {
    return {
      score: 0,
      advice: profileNudge || "Add a few entries and PocketPilot will spot where your money is going."
    };
  }

  const balance = totals.income - totals.expense;
  const savingsRate = totals.income > 0 ? Math.max(0, Math.round((balance / totals.income) * 100)) : 0;
  const topCategory = getTopCategory(items);
  const spendingDelta = totals.expense - previousTotals.expense;
  const weeklyTip = getWeeklyTip(spendingDelta);
  const dailyTarget = profile ? getDailySpendingTarget(profile) : null;
  const targetSentence = dailyTarget ? `Your personalized daily spend target is ${money(dailyTarget)}.` : "";

  if (balance < 0 && topCategory) {
    const target = Math.max(10, Math.round(topCategory.amount * 0.75));
    const action = getSavingsAction(topCategory.category, target);
    return {
      score: savingsRate,
      advice: `You are down ${money(Math.abs(balance))} this week. ${topCategory.category} is the biggest spend at ${money(topCategory.amount)}. ${action} ${profileNudge} ${weeklyTip}`
    };
  }

  if (topCategory && topCategory.amount > 40) {
    const cut = Math.ceil(topCategory.amount * 0.2);
    const target = Math.max(10, Math.round(topCategory.amount - cut));
    const action = getSavingsAction(topCategory.category, target);
    return {
      score: Math.min(99, savingsRate),
      advice: `Top spend: ${topCategory.category} at ${money(topCategory.amount)}. Save ${money(cut)} by aiming for ${money(target)} next week. ${action} ${profileNudge} ${weeklyTip}`
    };
  }

  if (balance > 0) {
    const autoSave = Math.max(5, Math.round(balance * 0.35));
    return {
      score: Math.min(99, savingsRate),
      advice: `You are ahead by ${money(balance)} this week. Move ${money(autoSave)} toward your ${money(savingsGoal)} goal now. ${targetSentence} ${profileNudge} ${weeklyTip}`
    };
  }

  return {
    score: savingsRate,
    advice: `Your week is close to break-even. Log every small purchase today, then set a ${money(15)} micro-limit for the category you use most. ${profileNudge} ${weeklyTip}`
  };
}

function getTopCategory(items) {
  const byCategory = items
    .filter((entry) => entry.type === "expense")
    .reduce((result, entry) => {
      result[entry.category] = (result[entry.category] || 0) + entry.amount;
      return result;
    }, {});
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  return topCategory ? { category: topCategory[0], amount: topCategory[1] } : null;
}

function getSavingsAction(category, target) {
  const actions = {
    Food: `Set a ${money(target)} food cap and swap two restaurant meals for groceries.`,
    Transport: `Set a ${money(target)} transport cap and combine errands into one trip.`,
    Gas: `Set a ${money(target)} gas cap and plan one no-extra-trip day.`,
    Bills: `Keep bills near ${money(target)} by checking one autopay or plan this week.`,
    Shopping: `Use a ${money(target)} shopping cap and wait 24 hours before buying anything nonessential.`,
    Subscriptions: `Keep subscriptions near ${money(target)} by canceling or pausing one service today.`,
    Entertainment: `Cap entertainment at ${money(target)} and pause one subscription for a week.`,
    Savings: `Keep transfers near ${money(target)} and make them right after income lands.`,
    Work: `Keep work costs near ${money(target)} and separate reimbursable items.`,
    Other: `Set a ${money(target)} cap and name each purchase before you make it.`
  };

  return actions[category] || actions.Other;
}

function getProfileNudge(profile, items) {
  if (!profile) return "";

  const problemLabel = getProblemLabel(profile.spendingProblem);
  const problemAmount = getProblemSpend(profile.spendingProblem, items);
  const goalShare = Math.min(45, Math.round((profile.savingsGoal / profile.monthlyIncome) * 100));

  if (problemAmount > 0) {
    const trim = Math.max(5, Math.ceil(problemAmount * 0.18));
    return `Because you flagged ${problemLabel}, trim ${money(trim)} there this week and move it toward your ${money(profile.savingsGoal)} goal.`;
  }

  return `Because you flagged ${problemLabel}, watch that category first; your goal equals about ${goalShare}% of monthly income.`;
}

function getProblemSpend(problem, items) {
  const category = getProblemCategory(problem);
  if (!category) return 0;

  return items
    .filter((entry) => entry.type === "expense" && entry.category === category)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

function getProblemCategory(problem) {
  const categories = {
    food: "Food",
    subscriptions: "Subscriptions",
    shopping: "Shopping",
    gas: "Gas"
  };

  return categories[problem] || null;
}

function getProblemLabel(problem) {
  const labels = {
    food: "food",
    subscriptions: "subscriptions",
    shopping: "shopping",
    gas: "gas",
    other: "other spending"
  };

  return labels[problem] || "spending";
}

function getDailySpendingTarget(profile) {
  const monthlyFlexible = profile.monthlyIncome - profile.savingsGoal;
  if (monthlyFlexible <= 0) return null;
  return Math.max(5, Math.round(monthlyFlexible / 30));
}

function getWeeklyTip(spendingDelta) {
  if (spendingDelta < -1) {
    return `Weekly tip: spending is down ${money(Math.abs(spendingDelta))} from last week, so protect that win.`;
  }

  if (spendingDelta > 1) {
    return `Weekly tip: spending is up ${money(spendingDelta)} from last week; choose one category to trim first.`;
  }

  return "Weekly tip: spending is flat, so one small planned cut can create progress.";
}

function renderActivity() {
  elements.entryCount.textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

  if (!entries.length) {
    elements.activityList.innerHTML = '<p class="empty-state">No entries yet.</p>';
    return;
  }

  elements.activityList.innerHTML = entries
    .slice(0, 8)
    .map((entry) => {
      const sign = entry.type === "income" ? "+" : "-";
      const amountClass = entry.type === "income" ? "amount-gain" : "amount-loss";
      const note = entry.note ? escapeHtml(entry.note) : escapeHtml(entry.category);

      return `
        <article class="activity-row">
          <div class="activity-icon ${entry.type === "income" ? "income-icon" : "expense-icon"}" aria-hidden="true">
            ${entry.type === "income" ? "+" : "-"}
          </div>
          <div>
            <div class="activity-title">
              <strong>${note}</strong>
              <span>${escapeHtml(entry.category)}</span>
            </div>
            <div class="activity-date">${formatDate(entry.date)}</div>
          </div>
          <strong class="${amountClass}">${sign}${money(entry.amount)}</strong>
        </article>
      `;
    })
    .join("");
}

function renderBalanceChart(items) {
  const canvas = elements.chart;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 28;
  const days = Array.from({ length: 7 }, (_, index) => startOfDay(daysAgo(6 - index)));
  const values = days.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const dayEntries = items.filter((entry) => {
      const date = new Date(entry.date);
      return date >= day && date < nextDay;
    });
    const totals = summarize(dayEntries);
    return totals.income - totals.expense;
  });

  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const xStep = (width - padding * 2) / 6;

  const points = values.map((value, index) => ({
    x: padding + index * xStep,
    y: mapY(value, min, range, height, padding),
    value
  }));

  if (balanceAnimationFrame) cancelAnimationFrame(balanceAnimationFrame);
  animate(700, (progress) => {
    drawBalanceFrame(ctx, width, height, padding, min, range, points, progress);
  }, (frame) => {
    balanceAnimationFrame = frame;
  });
}

function drawBalanceFrame(ctx, width, height, padding, min, range, points, progress) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, mapY(0, min, range, height, padding));
  ctx.lineTo(width - padding, mapY(0, min, range, height, padding));
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width * progress, height);
  ctx.clip();

  ctx.strokeStyle = "#33d17a";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
      return;
    }

    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;
    ctx.quadraticCurveTo(previous.x, previous.y, midX, (previous.y + point.y) / 2);
  });

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();

  points.forEach((point) => {
    ctx.globalAlpha = progress;
    ctx.fillStyle = point.value >= 0 ? "#33d17a" : "#ff7468";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#9ca59d";
  ctx.font = "700 18px system-ui";
  ctx.fillText("7-day balance", padding, 30);
}

function renderCategoryChart(items) {
  const canvas = elements.categoryChart;
  const ctx = canvas.getContext("2d");
  const expenses = Object.entries(
    items
      .filter((entry) => entry.type === "expense")
      .reduce((result, entry) => {
        result[entry.category] = (result[entry.category] || 0) + entry.amount;
        return result;
      }, {})
  ).sort((a, b) => b[1] - a[1]);

  if (categoryAnimationFrame) cancelAnimationFrame(categoryAnimationFrame);
  animate(760, (progress) => {
    drawCategoryFrame(ctx, canvas.width, canvas.height, expenses, progress);
  }, (frame) => {
    categoryAnimationFrame = frame;
  });
}

function drawCategoryFrame(ctx, width, height, expenses, progress) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#9ca59d";
  ctx.font = "700 18px system-ui";
  ctx.fillText("Category mix", 24, 30);

  if (!expenses.length) {
    ctx.fillStyle = "#9ca59d";
    ctx.font = "600 15px system-ui";
    ctx.fillText("No spending yet", 24, 112);
    return;
  }

  const total = expenses.reduce((sum, [, amount]) => sum + amount, 0);
  const centerX = 86;
  const centerY = 118;
  const radius = 58;
  let start = -Math.PI / 2;

  expenses.slice(0, 6).forEach(([category, amount], index) => {
    const slice = (amount / total) * Math.PI * 2 * progress;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.fillStyle = categoryColors[index % categoryColors.length];
    ctx.arc(centerX, centerY, radius, start, start + slice);
    ctx.closePath();
    ctx.fill();
    start += slice;
  });

  ctx.beginPath();
  ctx.fillStyle = "#0b0e0c";
  ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
  ctx.fill();

  expenses.slice(0, 4).forEach(([category, amount], index) => {
    const y = 78 + index * 30;
    ctx.fillStyle = categoryColors[index % categoryColors.length];
    ctx.beginPath();
    ctx.arc(178, y - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f7f8f5";
    ctx.font = "700 13px system-ui";
    ctx.fillText(category, 190, y);
    ctx.fillStyle = "#9ca59d";
    ctx.font = "600 12px system-ui";
    ctx.fillText(money(amount), 190, y + 16);
  });
}

function animate(duration, draw, setFrame) {
  const startedAt = performance.now();

  function tick(now) {
    const rawProgress = Math.min(1, (now - startedAt) / duration);
    const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
    draw(easedProgress);

    if (rawProgress < 1) {
      const frame = requestAnimationFrame(tick);
      setFrame(frame);
    }
  }

  const frame = requestAnimationFrame(tick);
  setFrame(frame);
}

function animateMoneyElement(element, target, suffix = "") {
  animateValueElement(element, target, (value) => `${money(value)}${suffix}`);
}

function animatePercentElement(element, target) {
  animateValueElement(element, target, (value) => `${Math.round(value)}%`);
}

function animateNumberElement(element, target) {
  animateValueElement(element, target, (value) => String(Math.round(value)));
}

function animateValueElement(element, target, formatter) {
  const from = Number.parseFloat(element.dataset.rawValue || "0");
  const safeTarget = Number.isFinite(target) ? target : 0;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (element._valueFrame) {
    cancelAnimationFrame(element._valueFrame);
  }

  if (prefersReducedMotion || Math.abs(from - safeTarget) < 0.01) {
    element.textContent = formatter(safeTarget);
    element.dataset.rawValue = String(safeTarget);
    return;
  }

  const startedAt = performance.now();
  const duration = 520;

  function tick(now) {
    const rawProgress = Math.min(1, (now - startedAt) / duration);
    const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
    const current = from + (safeTarget - from) * easedProgress;
    element.textContent = formatter(current);

    if (rawProgress < 1) {
      element._valueFrame = requestAnimationFrame(tick);
      return;
    }

    element.textContent = formatter(safeTarget);
    element.dataset.rawValue = String(safeTarget);
  }

  element._valueFrame = requestAnimationFrame(tick);
}

function mapY(value, min, range, height, padding) {
  return height - padding - ((value - min) / range) * (height - padding * 2);
}

function money(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);
}

function parseMoney(value) {
  return Number.parseFloat(String(value).replace(/,/g, ""));
}

function formatPlainAmount(value) {
  if (!Number.isFinite(value)) return "";
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

function daysAgo(count) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date.toISOString();
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    weekday: "short"
  });
}

function dayKey(value) {
  const date = startOfDay(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getLastLoggedOn() {
  if (!entries.length) return null;

  const latest = entries
    .map((entry) => new Date(entry.date).getTime())
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => b - a)[0];

  return latest ? dayKey(new Date(latest)) : null;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (character) =>
    (Number(character) ^ (Math.random() * 16 >> Number(character) / 4)).toString(16)
  );
}

function normalizeUuid(value) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value) ? value : makeId();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      setSyncStatus("PWA install works on HTTPS or localhost. Local file mode cannot register a service worker.");
    });
  });
}
