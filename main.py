from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from typing import Optional
import httpx

app = FastAPI()

# ✅ Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Input format
class TradeIntent(BaseModel):
    from_token: str
    to_token: str
    amount: float
    max_slippage: float
    simulations: int = 1
    custom_logic: Optional[str] = None
    use_live: bool = False  # toggle for real DEX prices


# ✅ Simulated pool generator with dynamic liquidity & gas auction
def get_contract_pools():
    return {
        "poolA": {"price": random.uniform(0.055, 0.061), "fee": random.uniform(0.001,0.005), "gas": random.uniform(0.0001,0.00015), "liquidity": random.randint(100,500)},
        "poolB": {"price": random.uniform(0.054, 0.06), "fee": random.uniform(0.0002,0.002), "gas": random.uniform(0.00012,0.00018), "liquidity": random.randint(80,400)},
        "poolC": {"price": random.uniform(0.053, 0.062), "fee": random.uniform(0.001,0.003), "gas": random.uniform(0.00009,0.00014), "liquidity": random.randint(150,600)}
    }

# ✅ Live Uniswap price fetcher (optional)
async def get_live_pools():
    try:
        async with httpx.AsyncClient() as client:
            eth_price = float((await client.get("https://api.coinbase.com/v2/prices/ETH-USD/spot")).json()["data"]["amount"])
            btc_price = float((await client.get("https://api.coinbase.com/v2/prices/BTC-USD/spot")).json()["data"]["amount"])
        eth_to_btc = eth_price / btc_price
        return {
            "poolA": {"price": eth_to_btc * random.uniform(0.99,1.01), "fee": 0.002, "gas": 0.00012, "liquidity": random.randint(200,700)},
            "poolB": {"price": eth_to_btc * random.uniform(0.98,1.02), "fee": 0.001, "gas": 0.00015, "liquidity": random.randint(150,500)},
            "poolC": {"price": eth_to_btc * random.uniform(0.97,1.03), "fee": 0.0015, "gas": 0.0001, "liquidity": random.randint(300,900)}
        }
    except Exception:
        return get_contract_pools()

# ✅ Solver Definitions
def naive_solver(amount, pools):
    best_pool = max(pools, key=lambda p: pools[p]["price"]*(1-pools[p]["fee"]))
    effective_price = pools[best_pool]["price"]*(1-pools[best_pool]["fee"])
    btc_received = amount*(effective_price + random.uniform(-0.0005,0.0005))
    return {
        "solver": "naiveSolver",
        "btc_received": btc_received,
        "route": [best_pool],
        "gas_cost": pools[best_pool]["gas"],
        "solver_profit": btc_received*0.0002,
        "latency_ms": random.uniform(50,200)
    }

def optimizer_solver(amount, pools):
    sorted_pools = sorted(pools.items(), key=lambda x: x[1]["price"]*(1-x[1]["fee"]), reverse=True)
    split = [0.5,0.5]
    price1 = sorted_pools[0][1]["price"]*(1-sorted_pools[0][1]["fee"])
    price2 = sorted_pools[1][1]["price"]*(1-sorted_pools[1][1]["fee"])
    btc = amount*split[0]*price1 + amount*split[1]*price2
    return {
        "solver": "optimizerSolver",
        "btc_received": btc,
        "route": [sorted_pools[0][0], sorted_pools[1][0]],
        "gas_cost": (sorted_pools[0][1]["gas"]+sorted_pools[1][1]["gas"])/2,
        "solver_profit": btc*0.0004,
        "latency_ms": random.uniform(100,300)
    }

def arbitrage_solver(amount, pools):
    combos = [(a,b,c) for a in pools for b in pools for c in pools if a!=b and b!=c]
    best_btc=0; best_route=None
    for a,b,c in combos:
        btc = amount
        for pool in [a,b,c]:
            btc *= pools[pool]["price"]*(1-pools[pool]["fee"])
        if btc>best_btc:
            best_btc=btc; best_route=[a,b,c]
    return {
        "solver":"arbitrageSolver",
        "btc_received":best_btc,
        "route":best_route,
        "gas_cost":sum(pools[p]["gas"] for p in best_route)/3,
        "solver_profit":best_btc*0.0005,
        "latency_ms":random.uniform(200,400)
    }

def greedy_solver(amount, pools):
    best_pool=max(pools, key=lambda p:pools[p]["price"])
    btc=amount*pools[best_pool]["price"]*(1-pools[best_pool]["fee"])
    return {
        "solver":"greedySolver",
        "btc_received":btc,
        "route":[best_pool],
        "gas_cost":pools[best_pool]["gas"],
        "solver_profit":btc*0.0006,
        "latency_ms":random.uniform(30,100)
    }

def balanced_solver(amount, pools):
    best=max(pools, key=lambda p:(pools[p]["price"]*(1-pools[p]["fee"]))/pools[p]["gas"])
    btc=amount*pools[best]["price"]*(1-pools[best]["fee"])
    return {
        "solver":"balancedSolver",
        "btc_received":btc,
        "route":[best],
        "gas_cost":pools[best]["gas"],
        "solver_profit":btc*0.0003,
        "latency_ms":random.uniform(80,150)
    }

@app.post("/optimize")
async def optimize_trade(intent: TradeIntent):
    pools = await get_live_pools() if intent.use_live else get_contract_pools()
    results_history = []
    solvers = [naive_solver, optimizer_solver, arbitrage_solver, greedy_solver, balanced_solver]
    win_counts = {s.__name__.replace("_solver", "Solver"): 0 for s in solvers}
    pool_usage = {p: 0 for p in pools}
    win_streaks = {solver: 0 for solver in win_counts}
    current_streak = {solver: 0 for solver in win_counts}

    # ✅ Custom solver logic
    if intent.custom_logic:
        def custom_solver(amount, pools):
            local_vars = {"pools": pools, "amount": amount, "random": random}
            try:
                exec(intent.custom_logic, {}, local_vars)
                best = local_vars.get("best_pool", max(pools, key=lambda p: pools[p]["price"]))
                btc = amount * pools[best]["price"] * (1 - pools[best]["fee"])
                return {
                    "solver": "customSolver",
                    "btc_received": btc,
                    "route": [best],
                    "gas_cost": pools[best]["gas"],
                    "solver_profit": btc * 0.0003,
                    "latency_ms": random.uniform(50, 150)
                }
            except:
                return {"solver":"customSolver","btc_received":0,"route":["error"],"gas_cost":0,"solver_profit":0,"latency_ms":0}
        solvers.append(custom_solver)

    for _ in range(intent.simulations):
        round_results = [s(intent.amount, pools) for s in solvers]
        winner = max(round_results, key=lambda x: x["btc_received"])
        win_counts[winner["solver"]] += 1

        for r in winner["route"]:
            pool_usage[r.split(":")[0]] += 1

        for solver in win_counts:
            if solver == winner["solver"]:
                current_streak[solver] += 1
                win_streaks[solver] = max(win_streaks[solver], current_streak[solver])
            else:
                current_streak[solver] = 0

        results_history.append(round_results)

    last_run = {res["solver"]: res for res in results_history[-1]}
    return {
        "last_run": last_run,
        "win_rate": {k: (v / intent.simulations * 100) for k, v in win_counts.items()},
        "pool_usage": pool_usage,
        "win_streaks": win_streaks,
        "history": results_history,
        "pools": pools
    }
