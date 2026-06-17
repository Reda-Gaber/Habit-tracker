import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSetting } from "../db/db";
import BottomNav from "../components/BottomNav";

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function FinanceStats() {
  const navigate = useNavigate();
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const [currency, setCurrency] = useState("EGP");

  useEffect(() => {
    getSetting("financeCurrency", "EGP").then(setCurrency);
  }, []);

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netAll = totalIncome - totalExpense;

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = new Date(thisMonthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const thisMonthTx = transactions.filter((t) => new Date(t.date) >= thisMonthStart);
  const lastMonthTx = transactions.filter((t) => new Date(t.date) >= lastMonthStart && new Date(t.date) < thisMonthStart);

  const thisMonthIncome = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const thisMonthExpense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const lastMonthExpense = lastMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  let expenseChange = null;
  if (lastMonthExpense > 0) {
    const pct = Math.round(((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100);
    expenseChange = { pct, up: pct >= 0 };
  } else if (thisMonthExpense > 0) {
    expenseChange = { pct: 100, up: true };
  }

  // Category breakdown (expenses), this month
  const categoryTotals = {};
  thisMonthTx
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const maxCategoryAmount = Math.max(...categoryBreakdown.map((c) => c.amount), 1);

  // Last 7 days spending trend
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const dayLabels = weekDates.map((d) => "SMTWTFS"[new Date(d).getDay()]);
  const dailyExpense = weekDates.map((date) =>
    transactions.filter((t) => t.date === date && t.type === "expense").reduce((s, t) => s + t.amount, 0)
  );
  const maxDaily = Math.max(...dailyExpense, 1);

  return (
    <div className="bg-background text-on-background min-h-screen pb-24">
      <header className="bg-surface sticky top-0 z-40 flex justify-between items-center w-full px-container_margin_mobile h-16">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 p-2 -ml-2 rounded-full"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-label-md">Back</span>
        </button>
        <h1 className="text-title-md text-primary">Finance Stats</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-2xl mx-auto px-container_margin_mobile pt-4 flex flex-col gap-lg">
        {/* All-time summary */}
        <section className="bg-primary-container rounded-xl p-lg text-on-primary-container">
          <p className="text-label-md opacity-80 uppercase tracking-widest mb-1">All-Time Net</p>
          <p className="text-display-lg mb-sm">
            {netAll >= 0 ? "+" : ""}
            {netAll} {currency}
          </p>
          <div className="flex items-center justify-between text-body-sm">
            <span>Income: {totalIncome} {currency}</span>
            <span>Expense: {totalExpense} {currency}</span>
          </div>
        </section>

        {/* This month vs last month */}
        <section className="grid grid-cols-2 gap-md">
          <div className="bg-surface-container-lowest rounded-xl shadow-card p-lg border border-outline-variant">
            <span className="text-label-md text-on-surface-variant">This Month Income</span>
            <p className="text-headline-lg-mobile text-tertiary mt-1">
              {thisMonthIncome} {currency}
            </p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl shadow-card p-lg border border-outline-variant">
            <span className="text-label-md text-on-surface-variant">This Month Expense</span>
            <p className="text-headline-lg-mobile text-error mt-1">
              {thisMonthExpense} {currency}
            </p>
            {expenseChange && (
              <span className={`flex items-center gap-0.5 text-label-md mt-1 ${expenseChange.up ? "text-error" : "text-tertiary"}`}>
                <span className="material-symbols-outlined text-[16px]">{expenseChange.up ? "trending_up" : "trending_down"}</span>
                {Math.abs(expenseChange.pct)}% vs last month
              </span>
            )}
          </div>
        </section>

        {/* 7-day spending trend */}
        <section className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-card">
          <h2 className="text-title-md text-on-surface mb-lg">Last 7 Days · Spending</h2>
          <div className="h-40 flex items-end justify-between gap-sm px-sm">
            {dailyExpense.map((amount, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-sm">
                <div className="w-full rounded-t-full bg-error/70" style={{ height: `${Math.max(4, (amount / maxDaily) * 100)}%` }} />
                <span className="text-label-md text-on-surface-variant">{dayLabels[i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Category breakdown */}
        <section className="space-y-md">
          <h2 className="text-title-md text-on-surface">Spending by Category · This Month</h2>

          {categoryBreakdown.length === 0 && (
            <div className="text-center py-lg text-on-surface-variant text-body-sm">No expenses logged this month yet.</div>
          )}

          {categoryBreakdown.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl shadow-card p-lg space-y-md">
              {categoryBreakdown.map(({ category, amount }) => (
                <div key={category} className="space-y-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-on-surface">{category}</span>
                    <span className="text-label-md text-on-surface-variant">
                      {amount} {currency}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${(amount / maxCategoryAmount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
