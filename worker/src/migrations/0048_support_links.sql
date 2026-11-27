-- KennelOS support's connections (2026-11-27, the owner): a KennelOS device signed in as
-- support's helper on her account says so when it connects (POST /v1/link helper: true).
-- Support often helps from a private browser tab that forgets everything when closed, so
-- each help left a device on her Link KennelOS list for good. A support connection now
-- stops by itself after 24 hours unused (kennelos/link.js SUPPORT_IDLE_MS), and her list
-- names it KennelOS support. Her own devices are never stopped by themselves.
-- Additive only: one new column, 0 for every link today.
ALTER TABLE links ADD COLUMN helper INTEGER NOT NULL DEFAULT 0;
