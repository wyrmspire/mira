#!/usr/bin/env python
import argparse
import os
import sys
import json
import time
import requests
import uuid

API_BASE = "http://localhost:3000"
USER_ID = "a0000000-0000-0000-0000-000000000001"

def print_result(endpoint, payload, expected_status, actual_status, response_body=None):
    pass_fail = "PASS" if actual_status == expected_status else "FAIL"
    print(f"[{pass_fail}] {endpoint}")
    print(f"    Expected: {expected_status} | Actual: {actual_status}")
    if actual_status != expected_status and response_body:
        print(f"    Body: {response_body}")

def test_endpoints():
    print("--- Running test-endpoints for Mira ---")
    created_entities = {"goals": [], "knowledge": [], "boards": [], "experiences": [], "memories": []}
    
    # 1. GET /api/gpt/state
    print("\n[1] GET /api/gpt/state")
    r = requests.get(f"{API_BASE}/api/gpt/state?userId={USER_ID}")
    print_result("GET /api/gpt/state", None, 200, r.status_code, r.text)

    # 2. POST /api/gpt/create (Goal)
    print("\n[2] POST /api/gpt/create (type: goal)")
    goal_payload = {
        "type": "goal",
        "userId": USER_ID,
        "title": f"CLI Test Goal {uuid.uuid4().hex[:6]}",
        "domains": [f"CLI Domain {uuid.uuid4().hex[:6]}"]
    }
    r = requests.post(f"{API_BASE}/api/gpt/create", json=goal_payload)
    print_result("POST /api/gpt/create (goal)", goal_payload, 201, r.status_code, r.text)
    if r.status_code in [200, 201]:
        goal_id = r.json().get("id")
        created_entities["goals"].append(goal_id)

    # 3. POST /api/gpt/plan (create_outline)
    print("\n[3] POST /api/gpt/plan (action: create_outline)")
    outline_payload = {
        "action": "create_outline",
        "userId": USER_ID,
        "topic": "History of CLI Tools",
        "subtopics": [{"title": "DOS commands", "order": 1}]
    }
    r = requests.post(f"{API_BASE}/api/gpt/plan", json=outline_payload)
    print_result("POST /api/gpt/plan (create_outline)", outline_payload, 201, r.status_code, r.text)

    # 4. POST /api/gpt/create (memory)
    print("\n[4] POST /api/gpt/create (type: memory)")
    memory_payload = {
        "type": "memory",
        "userId": USER_ID,
        "kind": "preference",
        "topic": "Testing",
        "content": "User prefers CLI tools over GUIs for testing."
    }
    r = requests.post(f"{API_BASE}/api/gpt/create", json=memory_payload)
    print_result("POST /api/gpt/create (memory)", memory_payload, 201, r.status_code, r.text)
    if r.status_code in [200, 201]:
        created_entities["memories"].append(r.json().get("id"))

    # 5. POST /api/gpt/create (board)
    print("\n[5] POST /api/gpt/create (type: board)")
    board_payload = {
        "type": "board",
        "userId": USER_ID,
        "name": f"CLI Test Board {uuid.uuid4().hex[:6]}",
        "purpose": "general"
    }
    r = requests.post(f"{API_BASE}/api/gpt/create", json=board_payload)
    print_result("POST /api/gpt/create (board)", board_payload, 201, r.status_code, r.text)
    board_id = None
    if r.status_code in [200, 201]:
        board_id = r.json().get("id")
        created_entities["boards"].append(board_id)

    # 6. POST /api/gpt/update (suggest_board_gaps)
    if board_id:
        print("\n[6] POST /api/gpt/update (action: suggest_board_gaps)")
        suggest_payload = {
            "action": "suggest_board_gaps",
            "userId": USER_ID,
            "boardId": board_id
        }
        r = requests.post(f"{API_BASE}/api/gpt/update", json=suggest_payload)
        print_result("POST /api/gpt/update (suggest_board_gaps)", suggest_payload, 200, r.status_code, r.text)

    # Clean Up
    print("\n--- Cleaning Up DB Entries ---")
    for key, ids in created_entities.items():
        # Using Supabase directly from Python is hard without keys, so we will use Mira endpoints if they have delete actions
        for ent_id in ids:
            if key == "memories":
                r = requests.post(f"{API_BASE}/api/gpt/update", json={"action": "memory_delete", "memoryId": ent_id})
                print(f"Deleted memory {ent_id}: {r.status_code}")
            elif key == "goals":
                # Archive goal
                r = requests.post(f"{API_BASE}/api/gpt/update", json={"action": "transition_goal", "goalId": ent_id, "transitionAction": "archive"})
                print(f"Archived goal {ent_id}: {r.status_code}")
            elif key == "boards":
                # Archive board
                r = requests.post(f"{API_BASE}/api/gpt/update", json={"action": "archive_board", "boardId": ent_id})
                print(f"Archived board {ent_id}: {r.status_code}")

    print("Cleanup commands dispatched.")

def main():
    parser = argparse.ArgumentParser(description="Mira CLI Testing Tool")
    subparsers = parser.add_subparsers(dest="command")

    p_test_endpoints = subparsers.add_parser("test", help="Run end-to-end endpoint stress test")

    args = parser.parse_args()

    if args.command == "test":
        test_endpoints()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
