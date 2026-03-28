-- ============================================================
-- SMASHERS — Seed Data
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- Insert 13 categories
INSERT INTO categories (name, age_group, gender, display_order) VALUES
  ('Under 9 Boys',  'U9',   'Boys',  1),
  ('Under 9 Girls', 'U9',   'Girls', 2),
  ('Under 11 Boys', 'U11',  'Boys',  3),
  ('Under 11 Girls','U11',  'Girls', 4),
  ('Under 13 Boys', 'U13',  'Boys',  5),
  ('Under 13 Girls','U13',  'Girls', 6),
  ('Under 15 Boys', 'U15',  'Boys',  7),
  ('Under 15 Girls','U15',  'Girls', 8),
  ('Under 17 Boys', 'U17',  'Boys',  9),
  ('Under 17 Girls','U17',  'Girls', 10),
  ('Under 19 Boys', 'U19',  'Boys',  11),
  ('Under 19 Girls','U19',  'Girls', 12),
  ('Open',          'Open', 'Mixed', 13);

-- Insert 4 tournaments for 2026
INSERT INTO tournaments (name, tournament_number, scheduled_date, status, registration_open, championship_year) VALUES
  ('Smashers Championship 2026 — Tournament 1', 1, '2026-04-05', 'upcoming', true,  2026),
  ('Smashers Championship 2026 — Tournament 2', 2, '2026-07-15', 'upcoming', false, 2026),
  ('Smashers Championship 2026 — Tournament 3', 3, '2026-09-20', 'upcoming', false, 2026),
  ('Smashers Championship 2026 — Tournament 4', 4, '2026-12-10', 'upcoming', false, 2026);
