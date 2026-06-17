import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSetting, setSetting } from "../db/db";
import TopAppBar from "../components/TopAppBar";
import BottomNav from "../components/BottomNav";
import FAB from "../components/FAB";
import { isFinancialGoal, getFinancialGoalStats } from "../utils/goalProgress";

const EXPENSE_CATEGORIES = ["Food & Drink", "Groceries", "Transport", "Bills", "Shopping", "Health", "Entertainment", "Other"];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Gift", "Investment", "Other"];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

export default function Finance() {
  const navigate = useNavigate();
  const location = useLocation();
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const goals = useLiveQuery(() => db.goals.toArray(), []) || [];

  const [currency, setCurrency] = useState("EGP");
  const [dailyLimit, setDailyLimit] = useState(null);
  const [monthlyLimit, setMonthlyLimit] = useState(null);
  const [activeSheet, setActiveSheet] = useState(location.state?.openNew ? "new" : null); // null | "new" | "limits" | transaction object

  useEffect(() => {
    getSetting("financeCurrency", "EGP").then(setCurrency);
    getSetting("financeDailyLimit", null).then(setDailyLimit);
    getSetting("financeMonthlyLimit", null).then(setMonthlyLimit);
  }, []);

  const today = todayStr();
  const monthStart = monthStartStr();

  const todayTx = transactions.filter((t) => t.date === today);
  const todayIncome = todayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const todayExpense = todayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const todayNet = todayIncome - todayExpense;

  const monthExpense = transactions
    .filter((t) => t.date >= monthStart && t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const recentTransactions = [...transactions]
    .sort((a, b) => (b.date === a.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
    .slice(0, 15);

  const linkedFinancialGoals = goals.filter((g) => isFinancialGoal(g));

  const deleteTransaction = async (tx) => {
    if (!confirm("Delete this transaction?")) return;
    await db.transactions.delete(tx.id);
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-24">
      <TopAppBar title="Finance" showProfile rightIcon="notifications" onRightClick={() => navigate("/settings/notifications")} />

      <main className="px-container_margin_mobile mt-20 space-y-xl max-w-2xl mx-auto">
        {/* Today snapshot */}
        <section className="grid grid-cols-2 gap-md">
          <div className="bg-surface-container-lowest rounded-xl shadow-card p-lg border border-outline-variant">
            <span className="text-label-md text-on-surface-variant">Today's Income</span>
            <p className="text-headline-lg-mobile text-tertiary mt-1">+{todayIncome}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl shadow-card p-lg border border-outline-variant">
            <span className="text-label-md text-on-surface-variant">Today's Expense</span>
            <p className="text-headline-lg-mobile text-error mt-1">-{todayExpense}</p>
          </div>
        </section>

        <section className="bg-primary-container rounded-xl p-lg text-on-primary-container flex items-center justify-between">
          <div>
            <p className="text-label-md opacity-80 uppercase tracking-widest mb-1">Today's Net</p>
            <p className="text-display-lg">
              {todayNet >= 0 ? "+" : ""}{todayNet} {currency}
            </p>
          </div>
          <span className="material-symbols-outlined text-[40px] opacity-80">account_balance_wallet</span>
        </section>

        {/* Limits */}
        <section className="space-y-md">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-title-md text-on-surface">Spending Limits</h3>
            <button onClick={() => setActiveSheet("limits")} className="text-label-md text-primary hover:underline">
              Set Limits
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-card p-lg space-y-lg">
            <LimitRow label="Daily" spent={todayExpense} limit={dailyLimit} currency={currency} />
            <LimitRow label="This Month" spent={monthExpense} limit={monthlyLimit} currency={currency} />
          </div>
        </section>

        {/* Linked financial goals (reverse link) */}
        {linkedFinancialGoals.length > 0 && (
          <section className="space-y-sm">
            <h3 className="text-title-md text-on-surface px-1">Linked Goals</h3>
            <div className="flex flex-col gap-sm">
              {linkedFinancialGoals.map((goal) => {
                const stats = getFinancialGoalStats(goal, transactions);
                return (
                  <button
                    key={goal.id}
                    onClick={() => navigate("/goals")}
                    className="w-full flex items-center gap-md p-md rounded-xl bg-primary-fixed/30 border border-primary/20 text-left hover:border-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-primary icon-filled shrink-0">
                      {goal.linkedType === "income" ? "savings" : "shield"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-on-surface truncate">{goal.title}</p>
                      <p className="text-label-md text-on-surface-variant">
                        {stats.current}/{stats.target} {currency}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0">chevron_right</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent transactions */}
        <section className="space-y-md">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-title-md text-on-surface">Recent Transactions</h3>
            <button onClick={() => navigate("/stats/finance")} className="text-label-md text-primary hover:underline">
              View Stats
            </button>
          </div>

          {recentTransactions.length === 0 && (
            <div className="text-center py-lg text-on-surface-variant text-body-sm">
              No transactions yet — tap + to log your first one.
            </div>
          )}

          <div className="flex flex-col gap-sm">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => setActiveSheet(tx)}
                className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant/30 flex items-center gap-md hover:shadow-md transition-shadow cursor-pointer"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    tx.type === "income" ? "bg-tertiary-fixed text-tertiary" : "bg-error-container/40 text-error"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {tx.type === "income" ? "arrow_downward" : "arrow_upward"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm text-on-surface truncate">
                    {tx.category}
                    {tx.note ? ` · ${tx.note}` : ""}
                  </p>
                  <p className="text-label-md text-on-surface-variant">{tx.date}</p>
                </div>
                <span className={`text-title-md shrink-0 ${tx.type === "income" ? "text-tertiary" : "text-error"}`}>
                  {tx.type === "income" ? "+" : "-"}{tx.amount}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTransaction(tx);
                  }}
                  aria-label="Delete transaction"
                  className="text-on-surface-variant hover:text-error p-1 rounded-full transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <FAB onClick={() => setActiveSheet("new")} />

      {activeSheet === "limits" && (
        <LimitsSheet
          currency={currency}
          dailyLimit={dailyLimit}
          monthlyLimit={monthlyLimit}
          onClose={() => setActiveSheet(null)}
          onSaved={({ currency: c, dailyLimit: d, monthlyLimit: m }) => {
            setCurrency(c);
            setDailyLimit(d);
            setMonthlyLimit(m);
            setActiveSheet(null);
          }}
        />
      )}

      {activeSheet && activeSheet !== "limits" && (
        <TransactionSheet transaction={activeSheet === "new" ? null : activeSheet} onClose={() => setActiveSheet(null)} />
      )}

      <BottomNav />
    </div>
  );
}

function LimitRow({ label, spent, limit, currency }) {
  if (!limit) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-body-sm text-on-surface-variant">{label} limit not set</span>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((spent / limit) * 100));
  const over = spent > limit;
  const colorClass = pct >= 100 ? "bg-error" : pct >= 75 ? "bg-secondary" : "bg-tertiary";
  const textClass = pct >= 100 ? "text-error" : pct >= 75 ? "text-secondary" : "text-tertiary";

  return (
    <div className="space-y-xs">
      <div className="flex justify-between items-center">
        <span className="text-body-sm text-on-surface">{label}</span>
        <span className={`text-label-md ${textClass}`}>
          {spent}/{limit} {currency}
        </span>
      </div>
      <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      {over && <p className="text-label-md text-error">Over by {spent - limit} {currency}</p>}
    </div>
  );
}

function LimitsSheet({ currency, dailyLimit, monthlyLimit, onClose, onSaved }) {
  const [curr, setCurr] = useState(currency);
  const [daily, setDaily] = useState(dailyLimit ? String(dailyLimit) : "");
  const [monthly, setMonthly] = useState(monthlyLimit ? String(monthlyLimit) : "");

  const save = async () => {
    const newCurrency = curr.trim() || "EGP";
    const newDaily = daily ? Number(daily) : null;
    const newMonthly = monthly ? Number(monthly) : null;
    await setSetting("financeCurrency", newCurrency);
    await setSetting("financeDailyLimit", newDaily);
    await setSetting("financeMonthlyLimit", newMonthly);
    onSaved({ currency: newCurrency, dailyLimit: newDaily, monthlyLimit: newMonthly });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-t-2xl p-lg pb-xl space-y-md" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-md" />
        <h3 className="text-title-md text-on-surface">Spending Limits</h3>

        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Currency</label>
          <input
            value={curr}
            onChange={(e) => setCurr(e.target.value)}
            placeholder="EGP"
            className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none"
          />
        </div>

        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Daily Limit</label>
          <input
            type="number"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            placeholder="No limit"
            className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none"
          />
        </div>

        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Monthly Limit</label>
          <input
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            placeholder="No limit"
            className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none"
          />
        </div>

        <button
          onClick={save}
          className="w-full py-4 px-lg rounded-full text-title-md text-on-primary bg-primary active:scale-[0.98] transition-all flex items-center justify-center gap-sm shadow-lg"
        >
          <span className="material-symbols-outlined icon-filled">check_circle</span>
          Save Limits
        </button>
      </div>
    </div>
  );
}

function TransactionSheet({ transaction, onClose }) {
  const isEdit = !!transaction;
  const [type, setType] = useState(transaction?.type || "expense");
  const [amount, setAmount] = useState(transaction?.amount ? String(transaction.amount) : "");
  const [category, setCategory] = useState(
    transaction?.category || (transaction?.type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
  );
  const [date, setDate] = useState(transaction?.date || todayStr());
  const [note, setNote] = useState(transaction?.note || "");

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeChange = (newType) => {
    setType(newType);
    const list = newType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!list.includes(category)) setCategory(list[0]);
  };

  const save = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    const payload = { type, amount: numAmount, category, date, note: note.trim() };
    if (isEdit) {
      await db.transactions.update(transaction.id, payload);
    } else {
      payload.createdAt = Date.now();
      await db.transactions.add(payload);
    }
    onClose();
  };

  const remove = async () => {
    if (!confirm("Delete this transaction?")) return;
    await db.transactions.delete(transaction.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface rounded-t-2xl p-lg pb-xl space-y-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-md" />
        <h3 className="text-title-md text-on-surface">{isEdit ? "Edit Transaction" : "New Transaction"}</h3>

        <div className="flex gap-sm">
          <button
            onClick={() => handleTypeChange("expense")}
            className={`flex-1 py-3 rounded-xl text-label-md font-bold uppercase tracking-wider transition-all ${
              type === "expense"
                ? "bg-error-container text-on-error-container ring-2 ring-error"
                : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
            }`}
          >
            Expense
          </button>
          <button
            onClick={() => handleTypeChange("income")}
            className={`flex-1 py-3 rounded-xl text-label-md font-bold uppercase tracking-wider transition-all ${
              type === "income"
                ? "bg-tertiary-fixed text-on-tertiary-fixed-variant ring-2 ring-tertiary"
                : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
            }`}
          >
            Income
          </button>
        </div>

        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none"
          />
        </div>

        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Category</label>
          <div className="flex gap-sm flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-lg py-2 rounded-full text-label-md transition-all ${
                  category === c
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg outline-none"
          />
        </div>

        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Lunch with friends"
            className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none"
          />
        </div>

        <div className="flex gap-md">
          {isEdit && (
            <button
              onClick={remove}
              aria-label="Delete transaction"
              className="py-4 px-lg rounded-full text-error border border-error active:scale-[0.98] transition-all flex items-center justify-center"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          )}
          <button
            onClick={save}
            className="flex-1 py-4 px-lg rounded-full text-title-md text-on-primary bg-primary active:scale-[0.98] transition-all flex items-center justify-center gap-sm shadow-lg"
          >
            <span className="material-symbols-outlined icon-filled">check_circle</span>
            {isEdit ? "Save Changes" : "Add Transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}
