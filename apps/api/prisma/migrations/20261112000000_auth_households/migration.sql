CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "HouseholdRole" AS ENUM ('OWNER', 'MEMBER');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "supabase_auth_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "provisioning_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "household_members" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "HouseholdRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_supabase_auth_id_key" ON "users"("supabase_auth_id");
CREATE UNIQUE INDEX "household_members_household_id_user_id_key" ON "household_members"("household_id", "user_id");
CREATE INDEX "household_members_user_id_idx" ON "household_members"("user_id");
CREATE INDEX "household_members_household_id_idx" ON "household_members"("household_id");

ALTER TABLE "household_members"
    ADD CONSTRAINT "household_members_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "household_members"
    ADD CONSTRAINT "household_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "households" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "household_members" ENABLE ROW LEVEL SECURITY;
