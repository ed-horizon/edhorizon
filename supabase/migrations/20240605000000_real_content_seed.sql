
-- Seeding Real Content for Hindi Horizon and MathHorizon

-- 1. Hindi Horizon
INSERT INTO public.modules (id, title, slug, description, icon)
VALUES (
  'h1111111-1111-1111-1111-111111111111',
  'Hindi Horizon',
  'hindi-horizon',
  'Discover the beauty of the Hindi language through literature and grammar.',
  'Languages'
) ON CONFLICT (slug) DO NOTHING;

-- Courses for Hindi
INSERT INTO public.courses (id, module_id, title, "order")
VALUES 
  ('h2222222-2222-2222-2222-222222222222', 'h1111111-1111-1111-1111-111111111111', 'Primary Hindi (Grade 1-3)', 1),
  ('h3333333-3333-3333-3333-333333333333', 'h1111111-1111-1111-1111-111111111111', 'Intermediate Hindi (Grade 4-6)', 2)
ON CONFLICT (id) DO NOTHING;

-- Topics for Primary Hindi
INSERT INTO public.topics (id, course_id, title, "order")
VALUES 
  ('h4444444-4444-4444-4444-444444444444', 'h2222222-2222-2222-2222-222222222222', 'Vowels (Swar)', 1),
  ('h5555555-5555-5555-5555-555555555555', 'h2222222-2222-2222-2222-222222222222', 'Consonants (Vyanjan)', 2)
ON CONFLICT (id) DO NOTHING;

-- 2. MathHorizon Enhancements
INSERT INTO public.modules (id, title, slug, description, icon)
VALUES (
  'm1111111-1111-1111-1111-111111111111',
  'MathHorizon',
  'math-horizon',
  'Master logic and problem-solving with advanced mathematical concepts.',
  'Calculator'
) ON CONFLICT (slug) DO UPDATE SET description = EXCLUDED.description;

-- Courses for Math
INSERT INTO public.courses (id, module_id, title, "order")
VALUES 
  ('m2222222-2222-2222-2222-222222222222', 'm1111111-1111-1111-1111-111111111111', 'Foundational Arithmetic', 1),
  ('m3333333-3333-3333-3333-333333333333', 'm1111111-1111-1111-1111-111111111111', 'Practical Geometry', 2)
ON CONFLICT (id) DO NOTHING;

-- Topics for Foundational Arithmetic
INSERT INTO public.topics (id, course_id, title, "order")
VALUES 
  ('m4444444-4444-4444-4444-444444444444', 'm2222222-2222-2222-2222-222222222222', 'Addition Mastery', 1),
  ('m5555555-5555-5555-5555-555555555555', 'm2222222-2222-2222-2222-222222222222', 'Subtraction Strategies', 2)
ON CONFLICT (id) DO NOTHING;

-- Initial Capsules for Vowels
INSERT INTO public.capsules (topic_id, title, type, status, content, "order")
VALUES 
  ('h4444444-4444-4444-4444-444444444444', 'Introduction to Swar', 'video', 'published', 
  '{"videoUrl": "https://www.youtube.com/watch?v=S2u9K7vK9-k", "description": "Learn the Hindi vowels with fun songs."}'::jsonb, 1),
  ('h4444444-4444-4444-4444-444444444444', 'Vowel Matching', 'flashcards', 'published', 
  '{"cards": [{"front": "अ", "back": "A"}, {"front": "आ", "back": "AA"}]}'::jsonb, 2)
ON CONFLICT DO NOTHING;
