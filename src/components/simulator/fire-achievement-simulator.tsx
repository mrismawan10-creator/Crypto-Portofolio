"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, Calendar, DollarSign, Target, TrendingUp } from "lucide-react";

type SimulationInputs = {
  currentNetWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyInvestment: number;
  investmentReturn: number;
  yearsToSimulate: number;
  targetPassiveIncome: number;
  inflationRate: number;
  startDate: string;
};

type SimulationPoint = {
  month: number;
  year: string;
  monthLabel: string;
  netWorth: number;
  passiveIncome: number;
  monthlyExpense: number;
  fireProgress: number;
  gap: number;
};

const initialInputs: SimulationInputs = {
  currentNetWorth: 129_700_000,
  monthlyIncome: 15_717_000,
  monthlyExpense: 7_260_000,
  monthlyInvestment: 8_000_000,
  investmentReturn: 12,
  yearsToSimulate: 3,
  targetPassiveIncome: 7_260_000,
  inflationRate: 4,
  startDate: new Date().toISOString().slice(0, 10),
};

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatRupiah = (value: number) => rupiahFormatter.format(Math.round(value));

type InputFieldConfig = {
  label: string;
  field: keyof SimulationInputs;
  step?: number;
  min?: number;
  max?: number;
  type?: "number" | "date";
};

export default function FireAchievementSimulator() {
  const [inputs, setInputs] = useState<SimulationInputs>(initialInputs);

  const simulationData = useMemo<SimulationPoint[]>(() => {
    const data: SimulationPoint[] = [];
    let netWorth = inputs.currentNetWorth;
    let monthlyExpense = inputs.monthlyExpense;
    const totalMonths = Math.max(1, inputs.yearsToSimulate) * 12;
    const monthsToSimulate = Math.floor(totalMonths);
    const baseDate = (() => {
      const parsed = new Date(inputs.startDate);
      return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    })();

    for (let month = 0; month <= monthsToSimulate; month++) {
      const pointDate = new Date(baseDate);
      pointDate.setMonth(pointDate.getMonth() + month);
      const monthLabel = pointDate.toLocaleDateString("id-ID", {
        month: "short",
        year: "2-digit",
      });
      if (month > 0 && month % 12 === 0) {
        monthlyExpense *= 1 + inputs.inflationRate / 100;
      }

      const monthlyReturn = inputs.investmentReturn / 100 / 12;
      const investmentGrowth = netWorth * monthlyReturn;

      netWorth += inputs.monthlyInvestment + investmentGrowth;

      const passiveIncome = (netWorth * 0.04) / 12;
      const fireProgressRaw = inputs.monthlyExpense
        ? (passiveIncome / monthlyExpense) * 100
        : 0;

      data.push({
        month,
        year: (month / 12).toFixed(1),
        monthLabel,
        netWorth: Math.round(netWorth),
        passiveIncome: Math.round(passiveIncome),
        monthlyExpense: Math.round(monthlyExpense),
        fireProgress: Math.min(fireProgressRaw, 100),
        gap: Math.max(0, monthlyExpense - passiveIncome),
      });
    }

    return data;
  }, [inputs]);

  const fireAchievementMonth = useMemo(() => {
    return simulationData.findIndex((point) => point.fireProgress >= 100);
  }, [simulationData]);

  const finalData = simulationData.at(-1);
  if (!finalData) {
    return null;
  }

  const totalInvested = inputs.monthlyInvestment * Math.max(inputs.yearsToSimulate, 0) * 12;
  const netWorthGrowthPct =
    inputs.currentNetWorth > 0
      ? ((finalData.netWorth - inputs.currentNetWorth) / inputs.currentNetWorth) * 100
      : 0;

  const handleInputChange = (field: keyof SimulationInputs, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [field]: field === "startDate" ? value : Number(value) || 0,
    }));
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-white to-blue-50 p-6 shadow-md dark:from-slate-900/80 dark:to-blue-950/40">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <Target className="text-blue-600" />
          FIRE Achievement Simulator
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Simulasi matematis untuk merancang Financial Independence Retire Early (FIRE).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Net Worth Akhir</span>
            <DollarSign className="text-emerald-600" size={22} />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-white">
            {formatRupiah(finalData.netWorth)}
          </p>
          <p className="text-xs font-semibold text-emerald-600">
            {netWorthGrowthPct >= 0 ? "+" : ""}
            {netWorthGrowthPct.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-2xl border-l-4 border-blue-500 bg-white p-4 shadow-sm dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Passive Income</span>
            <TrendingUp className="text-blue-600" size={22} />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-white">
            {formatRupiah(finalData.passiveIncome)}
          </p>
          <p className="text-xs font-semibold text-blue-600">
            {finalData.fireProgress.toFixed(1)}% dari target
          </p>
        </div>

        <div className="rounded-2xl border-l-4 border-purple-500 bg-white p-4 shadow-sm dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>FIRE Achievement</span>
            <Calendar className="text-purple-600" size={22} />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-white">
            {fireAchievementMonth >= 0
              ? `${Math.floor(fireAchievementMonth / 12)} thn ${fireAchievementMonth % 12} bln`
              : "Belum tercapai"}
          </p>
          <p className="text-xs font-semibold text-purple-600">
            Usia perkiraan:{" "}
            {fireAchievementMonth >= 0
              ? `${25 + Math.floor(fireAchievementMonth / 12)} tahun`
              : "N/A"}
          </p>
        </div>

        <div className="rounded-2xl border-l-4 border-orange-500 bg-white p-4 shadow-sm dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Progress</span>
            <Award className="text-orange-500" size={22} />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-white">
            {finalData.fireProgress.toFixed(1)}%
          </p>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all"
              style={{ width: `${Math.min(finalData.fireProgress, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-md dark:bg-slate-900/60">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
          Parameter Simulasi
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { label: "Start Date", field: "startDate", type: "date" },
              { label: "Net Worth Awal", field: "currentNetWorth" },
              { label: "Monthly Income", field: "monthlyIncome" },
              { label: "Monthly Expense", field: "monthlyExpense" },
              { label: "Monthly Investment", field: "monthlyInvestment" },
              { label: "Investment Return (% p.a)", field: "investmentReturn", step: 0.5 },
              { label: "Inflation Rate (% p.a)", field: "inflationRate", step: 0.5 },
              { label: "Years to Simulate", field: "yearsToSimulate", min: 1, max: 35 },
              { label: "Target Passive Income", field: "targetPassiveIncome" },
            ] satisfies InputFieldConfig[]
          ).map((inputConfig) => {
            const isDate = inputConfig.type === "date";
            const value = inputs[inputConfig.field];
            return (
            <label key={inputConfig.field} className="text-sm font-medium text-slate-700 dark:text-slate-200 space-y-1">
              <span>{inputConfig.label}</span>
              <input
                type={inputConfig.type ?? "number"}
                inputMode={isDate ? undefined : "decimal"}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900"
                value={isDate ? (value as string) : Number(value ?? 0)}
                step={inputConfig.step}
                min={inputConfig.min}
                max={inputConfig.max}
                onChange={(event) => handleInputChange(inputConfig.field, event.target.value)}
              />
            </label>
          );})}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-2xl bg-white p-6 shadow-md dark:bg-slate-900/60">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Proyeksi Net Worth Growth
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={simulationData}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="year"
                tick={{ fill: "#64748b", fontSize: 12 }}
                label={{ value: "Tahun", position: "insideBottom", offset: -5, fill: "#475569" }}
              />
              <YAxis
                tickFormatter={(value) => `${(value / 1_000_000).toFixed(0)}jt`}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => formatRupiah(value)}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "0.75rem",
                  border: "none",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorNetWorth)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-md dark:bg-slate-900/60">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Passive Income vs Monthly Expense
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={simulationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fill: "#64748b", fontSize: 12 }}
                label={{ value: "Bulan", position: "insideBottom", offset: -5, fill: "#475569" }}
              />
              <YAxis
                tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)}jt`}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => formatRupiah(value)}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "0.75rem",
                  border: "none",
                  color: "#fff",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="passiveIncome"
                stroke="#10b981"
                strokeWidth={3}
                name="Passive Income"
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="monthlyExpense"
                stroke="#ef4444"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Monthly Expense (inflasi)"
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-md dark:bg-slate-900/60">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            FIRE Progress Timeline
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={simulationData}>
              <defs>
                <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="year"
                tick={{ fill: "#64748b", fontSize: 12 }}
                label={{ value: "Tahun", position: "insideBottom", offset: -5, fill: "#475569" }}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(1)}%`}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "0.75rem",
                  border: "none",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="fireProgress"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorProgress)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>

          {fireAchievementMonth >= 0 && (
            <div className="mt-4 rounded-xl border-l-4 border-emerald-500 bg-gradient-to-r from-green-50 to-emerald-50 p-4 text-sm text-emerald-800 dark:from-emerald-900/20 dark:to-emerald-800/10 dark:text-emerald-200">
              <p className="font-semibold">
                🎯 FIRE Achievement: bulan ke-{fireAchievementMonth} (
                {Math.floor(fireAchievementMonth / 12)} tahun {fireAchievementMonth % 12} bulan)
              </p>
              <p className="text-xs mt-1">
                Prediksi kebebasan finansial pada usia {25 + Math.floor(fireAchievementMonth / 12)} tahun.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-inner dark:border-blue-900/60 dark:from-slate-900 dark:to-indigo-900/40">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
          📊 Key Insights
        </h3>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">→</span>
            Net worth tumbuh dari {formatRupiah(inputs.currentNetWorth)} menjadi {formatRupiah(finalData.netWorth)} dalam{" "}
            {inputs.yearsToSimulate} tahun.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold">→</span>
            Passive income mencapai {formatRupiah(finalData.passiveIncome)} per bulan (
            {finalData.fireProgress.toFixed(1)}% dari kebutuhan).
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">→</span>
            {fireAchievementMonth >= 0
              ? `FIRE tercapai dalam ${Math.floor(fireAchievementMonth / 12)} tahun ${fireAchievementMonth % 12} bulan.`
              : `Perlu lebih dari ${inputs.yearsToSimulate} tahun untuk mencapai FIRE dengan parameter saat ini.`}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 font-bold">→</span>
            Total investasi rutin selama periode simulasi: {formatRupiah(totalInvested)}.
          </li>
        </ul>
      </div>
    </div>
  );
}
