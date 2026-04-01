#!/bin/bash
curl -i -X POST http://localhost:3000/api/gpt/create \
-H "Content-Type: application/json" \
-d '{
  "type": "knowledge",
  "userId": "a0000000-0000-0000-0000-000000000001",
  "topic": "TEST: Normalization Fix",
  "domain": "Gateway Hardening",
  "unitType": "playbook",
  "title": "TEST: The Payload Normalizer",
  "thesis": "Gateway routers must normalize camelCase to snake_case for service compatibility.",
  "content": "This is a test of the normalization logic.",
  "keyIdeas": ["Always check userId", "Map unitType to unit_type"]
}'
