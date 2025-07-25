import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
} from "recharts";
import { Tab } from "@headlessui/react";
import dynamic from "next/dynamic";
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });


import { motion } from "framer-motion";

export default function Home() {
  const [amount, setAmount] = useState(1);
  const [runs, setRuns] = useState(10);
  const [data, setData] = useState(null);
  const [customLogic, setCustomLogic] = useState("");
  const [theme, setTheme] = useState("glass");
  const [useLive, setUseLive] = useState(false);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const runSimulation = async () => {
    setData(null);
    for (let i = 0; i < runs; i++) {
      const res = await fetch(`http://34.87.148.219:8000/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_token: "ETH",
          to_token: "BTC",
          amount: parseFloat(amount),
          max_slippage: 0.5,
          simulations: i + 1,
          custom_logic: customLogic,
          use_live: useLive,
        }),
      });
      const updated = await res.json();
      setData(updated);
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  // ✅ Build graph nodes & links from pool data
  const graphData = data
  ? (() => {
      const pools = Object.keys(data.pools || data.pool_usage || {});
      const nodes = [
        { id: "BTC", color: "#f59e0b" },
        ...pools.map((p) => ({
          id: p,
          color: "#3b82f6",
        })),
      ];
      const links = pools.map((p) => ({
        source: p,
        target: "BTC",
        value: data.pool_usage ? data.pool_usage[p] : data.pools[p].liquidity || 1,
      }));
      return { nodes, links };
    })()
  : { nodes: [], links: [] };

  return (
    <div
      className={`min-h-screen text-white p-6 ${
        theme === "neon"
          ? "bg-gradient-to-br from-black via-gray-900 to-green-900"
          : theme === "cyberpunk"
          ? "bg-black text-green-400"
          : "bg-gray-900"
      }`}
    >
      <div className="flex items-center justify-center gap-3 mb-6">
  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text">
    Solver Research Suite
  </h1>
</div>


      {/* ✅ Theme & Live Toggle */}
      <div className="flex justify-center gap-4 mb-4">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="px-3 py-2 rounded bg-gray-800 border border-gray-700"
        >
          <option value="glass">Glass</option>
          <option value="neon">Neon</option>
          <option value="cyberpunk">Cyberpunk</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useLive}
            onChange={() => setUseLive(!useLive)}
          />
          Use Live Prices
        </label>
      </div>

      <Tab.Group>
        <Tab.List className="flex space-x-2 justify-center mb-6">
          {["Dashboard", "Analytics", "History", "Graph"].map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                `px-4 py-2 rounded-full text-sm font-bold ${
                  selected
                    ? "bg-gradient-to-r from-green-400 to-blue-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`
              }
            >
              {tab}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          {/* ✅ Dashboard Tab */}
          <Tab.Panel>
            <div className="max-w-xl mx-auto bg-gray-800 bg-opacity-40 rounded-xl p-6 backdrop-blur-md shadow-lg">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">
                    ETH Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">
                    Simulation Runs
                  </label>
                  <input
                    type="number"
                    value={runs}
                    onChange={(e) => setRuns(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">
                    Custom Solver Strategy
                  </label>
                  <textarea
                    rows={2}
                    value={customLogic}
                    onChange={(e) => setCustomLogic(e.target.value)}
                    placeholder="e.g., best_pool = min(pools, key=lambda p: pools[p]['gas'])"
                    className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                  />
                </div>
                <button
                  onClick={runSimulation}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 transition font-bold"
                >
                  Run Simulation
                </button>
              </div>
            </div>

            {data && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.values(data.last_run).map((solver, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    animate={{
                      boxShadow:
                        solver.btc_received ===
                        Math.max(
                          ...Object.values(data.last_run).map((s) => s.btc_received)
                        )
                          ? "0 0 15px #22c55e"
                          : "0 0 0px transparent",
                    }}
                    className="p-4 rounded-xl bg-gray-800 bg-opacity-40 backdrop-blur-md shadow-md"
                  >
                    <h2 className="font-bold text-lg">{solver.solver}</h2>
                    <p className="text-green-400">
                      BTC: {solver.btc_received.toFixed(6)}
                    </p>
                    <p className="text-yellow-400">
                      Gas: {solver.gas_cost.toFixed(6)}
                    </p>
                    <p className="text-blue-400">
                      Profit: {solver.solver_profit.toFixed(6)}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Latency: {solver.latency_ms.toFixed(1)} ms
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </Tab.Panel>

          {/* ✅ Analytics Tab */}
          <Tab.Panel>
            {data ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-72">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={Object.entries(data.win_rate).map(
                          ([name, value]) => ({
                            name,
                            value,
                          })
                        )}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                      >
                        {Object.entries(data.win_rate).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <ResponsiveContainer>
                    <ScatterChart>
                      <XAxis dataKey="gas" name="Gas Cost" />
                      <YAxis dataKey="profit" name="Profit" />
                      <Tooltip />
                      <Legend />
                      <Scatter
                        name="Solvers"
                        data={Object.values(data.last_run).map((s) => ({
                          gas: s.gas_cost,
                          profit: s.solver_profit,
                        }))}
                        fill="#10b981"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-72">
                  <ResponsiveContainer>
                    <LineChart
                      data={data.history.map((run, i) => {
                        const acc = { run: i + 1 };
                        run.forEach((solver) => {
                          acc[solver.solver] = solver.btc_received;
                        });
                        return acc;
                      })}
                    >
                      <XAxis dataKey="run" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {Object.keys(data.last_run).map((solver, i) => (
                        <Line
                          key={i}
                          type="monotone"
                          dataKey={solver}
                          stroke={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart
                      data={Object.entries(data.pool_usage).map(
                        ([pool, value]) => ({
                          pool,
                          value,
                        })
                      )}
                    >
                      <XAxis dataKey="pool" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                Run a simulation to view analytics.
              </div>
            )}
          </Tab.Panel>

          {/* ✅ History Tab */}
          <Tab.Panel>
            {data ? (
              <div className="space-y-6">
                <div className="overflow-x-auto bg-gray-800 bg-opacity-40 backdrop-blur-md rounded-xl shadow-md p-4">
                  <h2 className="text-xl font-bold mb-4 text-green-400">
                    Solver Leaderboard
                  </h2>
                  <table className="table-auto w-full text-left">
                    <thead>
                      <tr className="text-gray-300">
                        <th className="p-2">Rank</th>
                        <th className="p-2">Solver</th>
                        <th className="p-2">Avg Profit</th>
                        <th className="p-2">Avg Gas</th>
                        <th className="p-2">Win Rate (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.win_rate)
                        .sort((a, b) => b[1] - a[1])
                        .map(([solver, winRate], i) => {
                          const allRuns = data.history.flat();
                          const solverRuns = allRuns.filter(
                            (s) => s.solver === solver
                          );
                          const avgProfit =
                            solverRuns.reduce(
                              (acc, s) => acc + s.solver_profit,
                              0
                            ) / solverRuns.length;
                          const avgGas =
                            solverRuns.reduce(
                              (acc, s) => acc + s.gas_cost,
                              0
                            ) / solverRuns.length;
                          return (
                            <tr
                              key={solver}
                              className="border-t border-gray-700"
                            >
                              <td className="p-2">
                                {i === 0
                                  ? "🥇"
                                  : i === 1
                                  ? "🥈"
                                  : i === 2
                                  ? "🥉"
                                  : i + 1}
                              </td>
                              <td className="p-2 font-bold">{solver}</td>
                              <td className="p-2 text-blue-400">
                                {avgProfit.toFixed(6)}
                              </td>
                              <td className="p-2 text-yellow-400">
                                {avgGas.toFixed(6)}
                              </td>
                              <td className="p-2 text-green-400">
                                {winRate.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <div className="h-72 mt-6">
                  <ResponsiveContainer>
                    <BarChart
                      data={Object.entries(data.win_streaks).map(
                        ([solver, streak]) => ({
                          solver,
                          streak,
                        })
                      )}
                    >
                      <XAxis dataKey="solver" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="streak" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                Run a simulation to view history.
              </div>
            )}
          </Tab.Panel>

          {/* ✅ Graph Tab */}
          <Tab.Panel>
            {data ? (
              <div className="bg-gray-800 p-4 rounded-xl shadow-md h-[500px]">
                <ForceGraph2D
  graphData={graphData}
  nodeAutoColorBy="id"
  linkDirectionalParticles={2}
  linkDirectionalParticleSpeed={d => d.value / 1000}
  width={600}
  height={400}
/>

              </div>
            ) : (
              <div className="text-center text-gray-400">
                Run a simulation to view pool graph.
              </div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
<footer className="text-center text-gray-500 text-sm mt-6">
  built by <a href="https://twitter.com/0xharshh" className="text-blue-400 hover:underline">@0xharshh</a> | powered by <span className="text-green-400">Intent</span>
</footer>
    </div>
  );
}
