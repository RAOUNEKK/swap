/*
# Per-skill star ratings

Adds skill_id to reviews so a rating is tied to the specific skill the
reviewer learned from the reviewee (not just an overall rating), and a
public aggregate view for showing "rated 4.0 on teaching Graphic Design by
3 swappers" on a profile — without ever exposing who left which rating.
*/

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS skill_id uuid REFERENCES skills_catalog(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_skill ON reviews(skill_id);

-- Public, anonymous aggregate: average rating + count per (reviewee, skill).
-- Deliberately excludes reviewer_id and review body so per-skill ratings can
-- be shown on a profile without ever revealing who rated them.
CREATE OR REPLACE VIEW skill_rating_summary AS
SELECT
  reviewee_id,
  skill_id,
  round(avg(rating)::numeric, 1) AS avg_rating,
  count(*) AS rating_count
FROM reviews
WHERE skill_id IS NOT NULL
GROUP BY reviewee_id, skill_id;

-- security_invoker makes the view respect the querying role's own RLS
-- (on reviews) rather than running with the view creator's privileges.
ALTER VIEW skill_rating_summary SET (security_invoker = true);

GRANT SELECT ON skill_rating_summary TO anon, authenticated;
