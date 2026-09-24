/*
# Seed: curated skills catalog

The earlier core-schema migration's comments described a catalog pre-seeded
with ~60 skills, but no migration ever actually inserted them — the live
project this app points at was seeded by hand at some point, which means a
fresh Supabase project created from this migration folder alone would start
with an empty, unusable Discover page. This migration makes the project
reproducible: it inserts the curated (non-custom) catalog idempotently.

icon values match keys in src/lib/utils.ts's ICON_MAP exactly, so every
seeded skill renders a real icon instead of falling back to BookOpen.
*/

INSERT INTO skills_catalog (name, category, icon, is_custom) VALUES
  ('Photography', 'Creative', 'Camera', false),
  ('Videography', 'Creative', 'Video', false),
  ('Digital Illustration', 'Creative', 'Palette', false),
  ('Calligraphy', 'Creative', 'PenTool', false),
  ('Watercolor Painting', 'Creative', 'Brush', false),
  ('Film Editing', 'Creative', 'Film', false),
  ('3D Modeling', 'Creative', 'Box', false),
  ('Pottery', 'Creative', 'Coffee', false),
  ('Creative Writing', 'Creative', 'PenLine', false),
  ('Graphic Design', 'Creative', 'Palette', false),
  ('Sketching', 'Creative', 'PenTool', false),
  ('Animation', 'Creative', 'Film', false),

  ('Web Development', 'Technology', 'Code', false),
  ('Mobile App Development', 'Technology', 'Smartphone', false),
  ('Command Line Basics', 'Technology', 'Terminal', false),
  ('Python Programming', 'Technology', 'Braces', false),
  ('Data Analysis', 'Technology', 'BarChart3', false),
  ('Machine Learning', 'Technology', 'Brain', false),
  ('Cloud Infrastructure', 'Technology', 'Server', false),
  ('Cybersecurity Basics', 'Technology', 'Shield', false),
  ('Blockchain Fundamentals', 'Technology', 'Link', false),
  ('Game Development', 'Technology', 'Gamepad2', false),
  ('UX/UI Design', 'Technology', 'Palette', false),
  ('SEO', 'Technology', 'Search', false),
  ('WordPress', 'Technology', 'Globe', false),

  ('Spanish', 'Languages', 'Globe', false),
  ('French', 'Languages', 'Globe', false),
  ('Arabic', 'Languages', 'Globe', false),
  ('Mandarin Chinese', 'Languages', 'Globe', false),
  ('Japanese', 'Languages', 'Globe', false),
  ('German', 'Languages', 'Globe', false),
  ('Italian', 'Languages', 'Globe', false),
  ('Portuguese', 'Languages', 'Globe', false),
  ('Sign Language (ASL)', 'Languages', 'Globe', false),
  ('English Conversation', 'Languages', 'Globe', false),

  ('Guitar', 'Music', 'Music', false),
  ('Piano', 'Music', 'Music', false),
  ('Singing', 'Music', 'Mic2', false),
  ('Music Production', 'Music', 'Sliders', false),
  ('Drums', 'Music', 'Disc', false),
  ('Violin', 'Music', 'Music', false),
  ('Music Theory', 'Music', 'Music', false),
  ('DJing', 'Music', 'Disc', false),

  ('Public Speaking', 'Business', 'Megaphone', false),
  ('Podcasting', 'Business', 'Mic', false),
  ('Marketing Strategy', 'Business', 'Search', false),
  ('Bookkeeping', 'Business', 'Calculator', false),
  ('Excel & Spreadsheets', 'Business', 'Table', false),
  ('Project Management', 'Business', 'ClipboardList', false),
  ('Sales', 'Business', 'TrendingUp', false),
  ('Startup Fundraising', 'Business', 'Rocket', false),
  ('Negotiation', 'Business', 'Handshake', false),
  ('Resume & Interview Coaching', 'Business', 'ClipboardList', false),

  ('Yoga', 'Lifestyle', 'Flower2', false),
  ('Cooking', 'Lifestyle', 'ChefHat', false),
  ('Meditation', 'Lifestyle', 'Sparkles', false),
  ('Personal Training', 'Lifestyle', 'Dumbbell', false),
  ('Nutrition Planning', 'Lifestyle', 'Apple', false),
  ('Gardening', 'Lifestyle', 'Sprout', false),
  ('Wine Tasting', 'Lifestyle', 'Wine', false),
  ('Home Organization', 'Lifestyle', 'Sofa', false),
  ('Sewing & Tailoring', 'Lifestyle', 'Shirt', false),
  ('Chess', 'Lifestyle', 'BookOpen', false)
ON CONFLICT (name) DO NOTHING;
