"""JSON-line bridge for the user-supplied RIFT Manager rebuild engine.

The game's Python source (engine.py, draft.py, data.py, terrain.py and
assets/map.png) must be installed next to this bridge from rift-rebuild.zip.
Only this bridge is versioned in the web-game repository.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def draft_state(payload):
    from draft import Draft
    from data import KITS, ROLES

    draft = Draft()
    actions = payload.get("actions", [])
    if not isinstance(actions, list) or len(actions) > 16:
        raise ValueError("Invalid draft history")
    for action in actions:
        if not isinstance(action, str) or not draft.choose(action):
            raise ValueError("Invalid draft action")
    # For AI games the opponent drafts automatically, respecting the engine's
    # legality checks and the same turn order as human-v-human drafting.
    def auto_opponent():
        while not draft.done and draft.turn()[1] == 1:
            if not draft.choose(draft.suggest()):
                raise ValueError("CPU draft failed")

    if payload.get("mode") == "AI":
        auto_opponent()
    choice = payload.get("choice")
    if choice is not None:
        if not isinstance(choice, str) or not draft.choose(choice):
            raise ValueError("Unavailable champion or wrong role")
        if payload.get("mode") == "AI":
            auto_opponent()

    turn = draft.turn()
    return {
        "actions": list(draft.banned) + [] if False else actions + (
            [] if choice is None else [choice]
        ),
        "history": None,
        "banned": draft.banned,
        "picks": draft.picks,
        "turn": None if turn is None else {
            "kind": turn[0], "team": turn[1], "role": turn[2]
        },
        "legal": [name for name in KITS if draft.legal(name)] if turn else [],
        "champions": [
            {"id": name, "name": kit.ko, "roles": list(kit.roles)}
            for name, kit in KITS.items()
        ],
        "done": draft.done,
        "roster": [list(team) for team in draft.roster()] if draft.done else None,
    }


def reliable_draft_state(payload):
    """Preserve every CPU turn in actions so the DB state can be replayed."""
    from draft import Draft
    from data import KITS
    draft = Draft()
    actions = payload.get("actions", [])
    if not isinstance(actions, list) or len(actions) > 16:
        raise ValueError("Invalid draft history")
    history = []
    for champion in actions:
        if not isinstance(champion, str) or not draft.choose(champion):
            raise ValueError("Illegal draft history")
        history.append(champion)
    def complete_cpu_turns():
        while not draft.done and draft.turn()[1] == 1:
            champion = draft.suggest()
            if not draft.choose(champion):
                raise ValueError("CPU draft unavailable")
            history.append(champion)
    if payload.get("mode") == "AI":
        complete_cpu_turns()
    choice = payload.get("choice")
    if choice is not None:
        if not isinstance(choice, str) or not draft.choose(choice):
            raise ValueError("Illegal champion choice")
        history.append(choice)
        if payload.get("mode") == "AI":
            complete_cpu_turns()
    turn = draft.turn()
    return {
        "actions": history,
        "banned": draft.banned,
        "picks": draft.picks,
        "turn": None if turn is None else {"kind":turn[0],"team":turn[1],"role":turn[2]},
        "legal": [k for k in KITS if draft.legal(k)] if turn else [],
        "champions": [{"id":k,"name":v.ko,"roles":list(v.roles)} for k,v in KITS.items()],
        "done": draft.done,
        "roster": [list(t) for t in draft.roster()] if draft.done else None,
    }


def simulate(payload):
    from engine import Match, DT
    from data import ROLES
    roster = payload.get("roster")
    teams = payload.get("teams")
    strategies = payload.get("strategies")
    if not isinstance(teams, list) or len(teams) != 2:
        raise ValueError("Expected two verified card decks")
    if not isinstance(strategies, list) or len(strategies) != 2:
        raise ValueError("Expected both team strategies")
    seed = int(payload.get("seed", 1))
    match = Match(seed=seed, roster=tuple(tuple(t) for t in roster))
    for side in (0, 1):
        if len(teams[side]) != 5:
            raise ValueError("Each side must have five players")
        strategy = strategies[side]
        for idx, unit in enumerate(match.players(side)):
            card = teams[side][idx]
            if card.get("position") != ROLES[idx]:
                raise ValueError("Player card must match draft position")
            overall = max(50, min(120, float(card.get("overall", 80))))
            scale = 1 + (overall - 80) / 360
            unit.maxhp *= scale
            unit.hp = unit.maxhp
            unit.ad *= scale
            unit.mechanics = max(.62, min(.99, unit.mechanics + (overall - 80) / 850))
            aggression = {
                "AGGRESSIVE": .76, "SAFE": .35, "SCALING": .46,
            }.get(strategy.get("laning"), .55)
            if strategy.get("teamfight") == "ENGAGE":
                aggression += .08
            if strategy.get("teamfight") == "PROTECT":
                aggression -= .09
            if strategy.get("macro") == "OBJECTIVE":
                aggression -= .03
            unit.aggression = max(.24, min(.93, aggression))
            unit.player_id = card.get("id")
            unit.player_name = card.get("name")
    # This is the exact uploaded engine: time advances by DT, not an OVR roll.
    # Unfinished simulations return a DRAW, NEVER a fabricated winner.
    limit_seconds = 2400
    while match.winner is None and match.t < limit_seconds:
        match.step()
    result = match.result()
    important = {"kill", "objective", "structure", "victory"}
    highlights = [
        {k:v for k,v in event.items() if k not in ("p", "ids")}
        for event in match.events if event.get("type") in important
    ]
    return {
        "winnerTeam": match.winner if match.winner is not None else None,
        "finished": bool(result["finished"]),
        "time": round(match.t, 1),
        "players": result["players"],
        "eventCounts": result["events"],
        "highlights": highlights[-120:],
        "engine": "rift-rebuild",
    }


def main():
    payload = json.load(sys.stdin)
    action = payload.get("operation")
    if action == "draft":
        data = reliable_draft_state(payload)
    elif action == "simulate":
        data = simulate(payload)
    else:
        raise ValueError("Unknown operation")
    print(json.dumps({"success":True,"data":data},ensure_ascii=False,separators=(",",":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"success":False,"error":str(exc)},ensure_ascii=False))
        sys.exit(1)
