import React, { useState } from "react";
import { Transaction, Category } from "../types";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from "lucide-react";

interface CalendarViewProps {
  transactions: Transaction[];
  categories: Category[];
  currentYear: number;
  currentMonth: number; // 0-indexed (0 is Jan, 11 is Dec)
  currencySymbol: string;
  onSelectDate: (dateStr: string) => void;
}

export default function CalendarView({
  transactions,
  categories,
  currentYear,
  currentMonth,
  currencySymbol,
  onSelectDate,
}: CalendarViewProps) {
  const [selectedDayOffset, setSelectedDayOffset] = useState<number | null>(null);

  // Helper arrays
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Total days in the active month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Day of week of the 1st of the month
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const totalDays = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Create grid cells
  const gridCells = [];
  
  // Empty slots for previous month padding
  for (let i = 0; i < firstDayIndex; i++) {
    gridCells.push(null);
  }

  // Days of current month
  for (let d = 1; d <= totalDays; d++) {
    gridCells.push(d);
  }

  // Get date string (YYYY-MM-DD) helper
  const getDateStr = (dayNum: number) => {
    const mm = String(currentMonth + 1).padStart(2, "0");
    const dd = String(dayNum).padStart(2, "0");
    return `${currentYear}-${mm}-${dd}`;
  };

  // Check transactions for a day
  const getDayTransactions = (dayNum: number) => {
    const dStr = getDateStr(dayNum);
    return transactions.filter((t) => t.date === dStr);
  };

  return (
    <div className="bg-slate-900 p-4 rounded-3xl border border-slate-850 shadow-2xl text-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon size={16} className="text-emerald-400" />
          <h4 className="text-xs font-extrabold text-slate-200">
            {monthNames[currentMonth]} {currentYear} Grid
          </h4>
        </div>
        <span className="text-[10px] text-slate-455 flex items-center gap-1 text-slate-400">
          <Info size={11} />
          Tap a day
        </span>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-[10px] font-extrabold text-slate-500 py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Monthly grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {gridCells.map((dayNum, cellIdx) => {
          if (dayNum === null) {
            return <div key={`empty-${cellIdx}`} className="aspect-square bg-slate-950/20 border border-slate-900/40 rounded-xl" />;
          }

          const dailyTrans = getDayTransactions(dayNum);
          const dailyExpense = dailyTrans
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);
          const dailyIncome = dailyTrans
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);

          const hasTrans = dailyTrans.length > 0;
          const labelStr = getDateStr(dayNum);

          return (
            <button
              key={`day-${dayNum}`}
              onClick={() => {
                onSelectDate(labelStr);
              }}
              className="aspect-square bg-slate-950 hover:bg-slate-850/80 border border-slate-850 rounded-xl p-1 flex flex-col justify-between items-start transition-all cursor-pointer relative group text-left active:scale-95"
            >
              <span className="text-[11px] font-black text-slate-300">{dayNum}</span>
              
              {hasTrans && (
                <div className="w-full space-y-0.5 mt-0.5 pointer-events-none">
                  {dailyIncome > 0 && (
                    <div className="text-[7.5px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-sm px-1 py-0.5 truncate leading-none text-center">
                      +{currencySymbol}{dailyIncome >= 1000 ? `${(dailyIncome / 1000).toFixed(0)}k` : dailyIncome}
                    </div>
                  )}
                  {dailyExpense > 0 && (
                    <div className="text-[7.5px] font-black text-rose-455 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-sm px-1 py-0.5 truncate leading-none text-center">
                      -{currencySymbol}{dailyExpense >= 1000 ? `${(dailyExpense / 1000).toFixed(0)}k` : dailyExpense}
                    </div>
                  )}
                </div>
              )}

              {/* Little visual highlights on hover */}
              <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5">
                {dailyIncome > 0 && <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />}
                {dailyExpense > 0 && <span className="w-1 h-1 rounded-full bg-rose-400 shadow-[0_0_4px_rgba(248,113,113,0.8)]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
