-- ============================================================
-- SMASHERS — Database Schema for Supabase
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. TOURNAMENTS
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tournament_number INT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'upcoming',
  registration_open BOOLEAN DEFAULT true,
  championship_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  google_sheet_id TEXT,
  google_sheet_tab TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATEGORIES
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age_group TEXT NOT NULL,
  gender TEXT NOT NULL,
  display_order INT NOT NULL,
  entry_fee INT DEFAULT 600
);

-- 3. PLAYERS
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  date_of_birth DATE,
  academy_name TEXT,
  city TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_proof_url TEXT,
  registration_source TEXT DEFAULT 'google_form',
  contact_number TEXT,
  payment_mode_registration TEXT,
  email TEXT,
  status TEXT DEFAULT 'active',
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  income_added BOOLEAN DEFAULT false
);

-- 4. FIXTURES (BRACKETS)
CREATE TABLE fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  round_number INT NOT NULL,
  round_name TEXT NOT NULL,
  match_number INT NOT NULL,
  player1_id UUID REFERENCES players(id),
  player2_id UUID REFERENCES players(id),
  player1_score INT,
  player2_score INT,
  winner_id UUID REFERENCES players(id),
  is_bye BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CHAMPIONSHIP POINTS
CREATE TABLE championship_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id),
  category_id UUID REFERENCES categories(id),
  player_name TEXT NOT NULL,
  academy_name TEXT,
  championship_year INT NOT NULL,
  finish_position TEXT,
  points_awarded INT NOT NULL DEFAULT 0,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EXPENSES
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id),
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  payment_mode TEXT,
  status TEXT DEFAULT 'pending',
  responsible_person TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SEASON ARCHIVES
CREATE TABLE season_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_year INT NOT NULL,
  category_id UUID REFERENCES categories(id),
  champion_name TEXT,
  champion_academy TEXT,
  champion_points INT,
  full_leaderboard JSONB,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_players_tournament ON players(tournament_id);
CREATE INDEX idx_players_category ON players(category_id);
CREATE INDEX idx_fixtures_tournament ON fixtures(tournament_id);
CREATE INDEX idx_fixtures_category ON fixtures(category_id);
CREATE INDEX idx_points_player ON championship_points(player_id);
CREATE INDEX idx_points_year ON championship_points(championship_year);
CREATE INDEX idx_expenses_tournament ON expenses(tournament_id);
