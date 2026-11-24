-- A vet record she declines (2026-11-24, the owner: "if she declines to accept it, the
-- Vet visit tab can come back"). Additive only: one new column, empty for every record
-- today. portal_placements.proof_declined_at: set when she declines the record the
-- family uploaded (portal/store.js declineProof). The family's pages then read as if no
-- record were in, and their Vet visit tab comes back (portal/vet.js vetTabShown); their
-- next upload, or her accepting it after all, clears it. The file itself is kept.
ALTER TABLE portal_placements ADD COLUMN proof_declined_at TEXT;
