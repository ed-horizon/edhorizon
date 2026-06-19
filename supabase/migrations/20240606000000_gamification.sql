
-- Gamification Schema

-- 1. User XP and Levels
CREATE TABLE IF NOT EXISTS public.user_gamification (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  xp_total INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Streaks
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  last_streak_date DATE DEFAULT CURRENT_DATE
);

-- 3. Leaderboard View (Materialized for Performance)
CREATE OR REPLACE VIEW public.global_leaderboard AS
SELECT 
  p.id,
  p.full_name,
  g.xp_total,
  g.level,
  s.current_streak
FROM public.profiles p
JOIN public.user_gamification g ON p.id = g.user_id
JOIN public.user_streaks s ON p.id = s.user_id
WHERE p.role = 'student'
ORDER BY g.xp_total DESC;

-- 4. Enable RLS
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Public can view leaderboard gamification"
  ON public.user_gamification FOR SELECT
  USING (true);

CREATE POLICY "Public can view leaderboard streaks"
  ON public.user_streaks FOR SELECT
  USING (true);

CREATE POLICY "Users can only update their own gamification"
  ON public.user_gamification FOR UPDATE
  USING (auth.uid() = user_id);

-- 6. Trigger to initialize gamification on profile creation
CREATE OR REPLACE FUNCTION public.initialize_gamification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_gamification (user_id) VALUES (NEW.id);
  INSERT INTO public.user_streaks (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_gamification
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.initialize_gamification();
