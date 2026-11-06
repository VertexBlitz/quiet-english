CREATE TABLE IF NOT EXISTS plan_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  goal TEXT NOT NULL DEFAULT 'general',
  level_min TEXT NOT NULL DEFAULT 'Pre-A1',
  level_max TEXT NOT NULL DEFAULT 'C2',
  duration_weeks SMALLINT NOT NULL DEFAULT 4 CHECK (duration_weeks IN (4,8,12)),
  minutes_per_day SMALLINT NOT NULL DEFAULT 10 CHECK (minutes_per_day IN (5,10,15,30)),
  weekly_themes JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plan_templates
  (id,title,goal,level_min,level_max,duration_weeks,minutes_per_day,weekly_themes,status)
VALUES
  ('general-4-week','General English · 4 weeks','general','Pre-A1','C2',4,10,
   '[
     {"theme":"Everyday communication","objective":"Describe routines, experiences and plans with clear everyday language.","tasks":["V04","G01","R04","V01","G06","R01","V05"]},
     {"theme":"Travel and problem solving","objective":"Ask for help, make polite requests and understand practical information.","tasks":["V02","G03","R03","V05","G02","R01","V06"]},
     {"theme":"Work, study and opinions","objective":"Explain reasons, express opinions and write clear short messages.","tasks":["V06","G07","R02","V03","G03","R05","V02"]},
     {"theme":"Practical communication","objective":"Combine vocabulary, grammar and comprehension in realistic situations.","tasks":["V07","G08","R05","V03","G04","R03","V06"]}
   ]'::jsonb,
   'published')
ON CONFLICT (id) DO NOTHING;
