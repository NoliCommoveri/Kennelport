-- The vet visit's count as her setting, whether she has saved her portal settings, and
-- her automatic invites (2026-11-25, the owner: a second breeder's contract is 72 hours,
-- a third's 48, so the count can't be fixed in code). Additive only: three new columns.
--
-- portal_settings.vet_count: the number of hours or days her contract gives. vet_rule
-- (its CHECK still allows only 'hours72' and 'days3') now says only how it's counted,
-- hours or days; empty means 72 or 3, as every site is counted today
-- (portal/store.js getSettings joins the two into one rule, "hours48").
--
-- portal_settings.saved_at: when she first saved her portal settings. Until then the
-- defaults (Eastern, 72 hours) are only a starting point, so no invite or vet reminder
-- goes out. A row can exist without her saving it (KennelOS fills in her vet), so the
-- row alone doesn't say it. Every row today belongs to a portal already running, so
-- each counts as saved from its last change.
ALTER TABLE portal_settings ADD COLUMN vet_count INTEGER;
ALTER TABLE portal_settings ADD COLUMN saved_at TEXT;
UPDATE portal_settings SET saved_at = COALESCE(updated_at, '2026-11-25T00:00:00.000Z') WHERE saved_at IS NULL;

-- portal_settings.auto_invite_at: when she switched on "Send invites by themselves"; empty
-- is off, as for every site today. Only families added from then on are invited by
-- themselves (portal/auth.js autoInvite), so switching it on never invites a family she
-- chose not to.
ALTER TABLE portal_settings ADD COLUMN auto_invite_at TEXT;
