"use client";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const BRAND = "#5B53C6";
const PALETTE = ["#5B53C6", "#3FB27F", "#9C94F7", "#E0556B", "#F5B942"];

export function SignupsLine({ data }: { data: { date: string; signups: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7E5EF" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9794A4" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9794A4" }} />
        <Tooltip />
        <Line type="monotone" dataKey="signups" stroke={BRAND} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PlanPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Legend />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function StateBar({ data }: { data: { state: string; users: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7E5EF" />
        <XAxis dataKey="state" tick={{ fontSize: 11, fill: "#9794A4" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9794A4" }} />
        <Tooltip />
        <Bar dataKey="users" fill={BRAND} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
