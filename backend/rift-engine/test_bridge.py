"""Smoke tests for RIFT integration after extracting rift-rebuild.zip.

Run: cd backend/rift-engine && .venv/bin/python -m unittest -v test_bridge.py
"""
import unittest

from bridge import reliable_draft_state
from engine import Match


class RiftBridgeTest(unittest.TestCase):
    def test_ai_draft_completes_with_valid_rosters(self):
        state = reliable_draft_state({"mode": "AI", "actions": []})
        self.assertEqual(state["turn"]["team"], 0)
        self.assertEqual(len(state["champions"]), 17)
        while not state["done"]:
            self.assertEqual(state["turn"]["team"], 0)
            self.assertGreater(len(state["legal"]), 0)
            state = reliable_draft_state({
                "mode": "AI", "actions": state["actions"],
                "choice": state["legal"][0],
            })
        self.assertEqual(len(state["actions"]), 16)
        self.assertEqual(len(state["banned"]), 6)
        self.assertEqual(len(state["roster"]), 2)
        self.assertTrue(all(len(team) == 5 for team in state["roster"]))
        # Constructor itself enforces 10 unique champion kits and valid role lanes.
        match = Match(seed=37, roster=tuple(tuple(t) for t in state["roster"]))
        self.assertEqual(len(match.players()), 10)
        for _ in range(25):
            match.step()

    def test_rejects_replayed_invalid_or_duplicate_pick(self):
        state = reliable_draft_state({"mode":"PVP","actions":[]})
        first = state["legal"][0]
        with self.assertRaises(ValueError):
            reliable_draft_state({"mode":"PVP","actions":[first,first]})


if __name__ == "__main__":
    unittest.main()
