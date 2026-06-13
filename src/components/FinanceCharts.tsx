/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Transaction, Category, Account } from "../types";
import { TrendingUp, TrendingDown, DollarSign, Wallet, Layers, Cpu } from "lucide-react";

interface FinanceChartsProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  currencySymbol: string;
}

export default function FinanceCharts({
  transactions,
  categories,
  accounts,
  currencySymbol,
}: FinanceChartsProps) {
  const [activeChartTab, setActiveChartTab] = useState<"expense" | "income">("expense");
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // Filter transactions of active type
  const activeTransactions = transactions.filter(
    (t) => t.type === activeChartTab
  );

  // Total amount
  const totalAmount = activeTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const categorySummary: { [cat: string]: number } = {};
  activeTransactions.forEach((t) => {
    categorySummary[t.category] = (categorySummary[t.category] || 0) + t.amount;
  });

  const chartSegments = Object.entries(categorySummary).map(([name, amount]) => {
    const categoryInfo = categories.find((c) => c.name === name);
    return {
      name,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      color: categoryInfo?.color || "#9CA3AF",
    };
  }).sort((a, b) => b.amount - a.amount);

  // Math helper for drawing Donut segments
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const getDonutPath = (
    x: number,
    y: number,
    radius: number,
    innerRadius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
    const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" ");
  };

  // Generate pie sectors
  let currentAngle = 0;
  const donuts = chartSegments.map((seg, i) => {
    const angleSize = (seg.amount / (totalAmount || 1)) * 360;
    const start = currentAngle;
    const end = currentAngle + angleSize;
    currentAngle = end;

    // Guard against identical start and end values
    const safeEnd = end - start >= 360 ? start + 359.99 : end;

    return {
      ...seg,
      start,
      end: safeEnd,
      path: getDonutPath(100, 100, 80, 50, start, safeEnd),
    };
  });

  // Calculate Key Metrics for past 7 days
  const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Let's create visual data for Trend of Spent (Last 7 Days)
  const getPastNDays = (n: number) => {
    const list = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d.toISOString().split("T")[0]);
    }
    return list;
  };

  const last7Days = getPastNDays(7);
  const trendData = last7Days.map((dateStr) => {
    const dailyExpenses = transactions
      .filter((t) => t.date === dateStr && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const dailyIncome = transactions
      .filter((t) => t.date === dateStr && t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const parts = dateStr.split("-");
    const label = new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    return {
      date: dateStr,
      label,
      expense: dailyExpenses,
      income: dailyIncome,
    };
  });

  const maxTrendValue = Math.max(...trendData.map((d) => Math.max(d.expense, d.income, 500)));

  return (
    <div className="space-y-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 flex flex-col justify-between h-24">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Income</span>
          <h3 className="text-lg font-black text-emerald-400 mt-2 truncate">
            {currencySymbol}{totalIncome.toLocaleString()}
          </h3>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 flex flex-col justify-between h-24">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Expenses</span>
          <h3 className="text-lg font-black text-rose-400 mt-2 truncate">
            {currencySymbol}{totalExpense.toLocaleString()}
          </h3>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="space-y-5">
        {/* Pie/Donut Chart Section (Category Breakdown) */}
        <div className="bg-slate-950 p-4 rounded-3xl border border-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-200">Category Slices</h4>
            {/* Income / Expense Toggle */}
            <div className="bg-slate-900 p-0.5 rounded-lg flex border border-slate-800">
              <button
                maxLength={2}
                onClick={() => setActiveChartTab("expense")}
                className={`px-2.5 py-1 text-[9.5px] font-bold rounded-md transition-all cursor-pointer ${
                  activeChartTab === "expense"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setActiveChartTab("income")}
                className={`px-2.5 py-1 text-[9.5px] font-bold rounded-md transition-all cursor-pointer ${
                  activeChartTab === "income"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Income
              </button>
            </div>
          </div>

          {totalAmount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Layers size={24} className="stroke-1 mb-1 opacity-50" />
              <p className="text-[10px] font-medium">No ledger records found this month</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5 items-center">
              {/* Visual Donut Chart */}
              <div className="relative w-40 h-40 flex-shrink-0">
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#1E293B" strokeWidth="25" />
                  {donuts.map((donut, index) => (
                    <path
                      key={index}
                      d={donut.path}
                      fill={donut.color}
                      className="transition-all duration-300 stroke-slate-950 stroke-[3] hover:brightness-110 cursor-pointer"
                      style={{
                        transform: hoveredSegment === index ? "scale(1.05)" : "scale(1)",
                        transformOrigin: "100px 100px",
                      }}
                      onMouseEnter={() => setHoveredSegment(index)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    />
                  ))}
                </svg>
                {/* Center Text inside Donut with rich colors */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold truncate max-w-[80px]">
                    {hoveredSegment !== null ? donuts[hoveredSegment].name : "Total"}
                  </span>
                  <span className="text-sm font-black text-slate-100 mt-0.5">
                    {currencySymbol}
                    {hoveredSegment !== null
                      ? donuts[hoveredSegment].amount.toLocaleString()
                      : totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Categories legends list */}
              <div className="w-full space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                {donuts.map((seg, index) => (
                  <div
                    key={index}
                    onMouseEnter={() => setHoveredSegment(index)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                      hoveredSegment === index
                        ? "bg-slate-900 border-slate-800"
                        : "bg-transparent border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-[11px] font-extrabold text-slate-300 truncate">{seg.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[11.5px] font-black text-slate-100 block">
                        {currencySymbol}{seg.amount.toLocaleString()}
                      </span>
                      <span className="text-[8.5px] text-slate-500 font-bold">{seg.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Spend Trend Bar Chart */}
        <div className="bg-slate-950 p-4 rounded-3xl border border-slate-900 space-y-4">
          <div>
            <h4 className="text-xs font-extrabold text-slate-200">7-Day Trend Comparison</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Comparing recent daily ledger changes</p>
          </div>

          <div className="flex items-center gap-3 text-[9px] font-bold">
            <div className="flex items-center gap-1.5 text-rose-455 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400/80" />
              <span>Expense</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
              <span>Income</span>
            </div>
          </div>

          {/* Inline bar chart layout */}
          <div className="h-44 flex items-end gap-2 border-b border-dashed border-slate-850 pb-2 relative">
            {trendData.map((day, dIdx) => {
              const expPct = (day.expense / (maxTrendValue || 1)) * 100;
              const incPct = (day.income / (maxTrendValue || 1)) * 100;

              return (
                <div
                  key={dIdx}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
                  onMouseEnter={() => setHoveredTrendIndex(dIdx)}
                  onMouseLeave={() => setHoveredTrendIndex(null)}
                >
                  {/* Tooltip on active hover */}
                  {hoveredTrendIndex === dIdx && (
                    <div className="absolute bottom-full mb-2 bg-slate-900 border border-slate-800 text-white p-2.5 rounded-xl shadow-2xl z-30 transition-all text-left min-w-[130px] pointer-events-none">
                      <p className="text-[9px] font-bold text-slate-400 mb-1">{day.label}</p>
                      <div className="flex items-center justify-between text-[10.5px] font-bold text-rose-400 leading-none">
                        <span>Paid:</span>
                        <span>{currencySymbol}{day.expense}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] font-bold text-emerald-400 mt-1.5 leading-none">
                        <span>Earned:</span>
                        <span>{currencySymbol}{day.income}</span>
                      </div>
                    </div>
                  )}

                  {/* Dual side-by-side slim visual bars */}
                  <div className="flex items-end w-full h-[85%] gap-1 justify-center">
                    {/* Expense bar */}
                    <div
                      className="w-2 md:w-2.5 rounded-t bg-rose-500/30 group-hover:bg-rose-400 group-hover:scale-105 transition-all relative overflow-hidden"
                      style={{ height: `${Math.max(expPct, day.expense > 0 ? 5 : 0)}%` }}
                    />
                    {/* Income bar */}
                    <div
                      className="w-2 md:w-2.5 rounded-t bg-emerald-500/30 group-hover:bg-emerald-400 group-hover:scale-105 transition-all relative overflow-hidden"
                      style={{ height: `${Math.max(incPct, day.income > 0 ? 5 : 0)}%` }}
                    />
                  </div>

                  <span className="text-[8px] font-bold text-slate-500 mt-2 block w-full text-center truncate group-hover:text-slate-300">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
