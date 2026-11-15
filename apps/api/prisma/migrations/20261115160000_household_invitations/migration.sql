BEGIN;

CREATE TABLE "household_invitations" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "accepted_by_id" UUID,
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "household_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "household_invitations_token_hash_sha256_check"
      CHECK ("token_hash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "household_invitations_terminal_state_check"
      CHECK ("accepted_at" IS NULL OR "revoked_at" IS NULL)
);

CREATE UNIQUE INDEX "household_invitations_token_hash_key"
  ON "household_invitations"("token_hash");
CREATE INDEX "household_invitations_household_id_accepted_at_revoked_at_expires_at_idx"
  ON "household_invitations"("household_id", "accepted_at", "revoked_at", "expires_at");
CREATE INDEX "household_invitations_created_by_id_idx"
  ON "household_invitations"("created_by_id");

DROP INDEX "household_members_user_id_idx";
CREATE UNIQUE INDEX "household_members_user_id_key" ON "household_members"("user_id");

ALTER TABLE "household_invitations" ADD CONSTRAINT "household_invitations_household_id_fkey"
  FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "household_invitations" ADD CONSTRAINT "household_invitations_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "household_invitations" ADD CONSTRAINT "household_invitations_accepted_by_id_fkey"
  FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "household_invitations" ENABLE ROW LEVEL SECURITY;

COMMIT;
