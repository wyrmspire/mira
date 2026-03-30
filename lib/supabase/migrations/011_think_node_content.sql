-- Migration 011: Add content column to think_nodes
-- This field stores long-form elaboration for mind map nodes.

ALTER TABLE think_nodes ADD COLUMN IF NOT EXISTS content text DEFAULT '';
