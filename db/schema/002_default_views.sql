-- Default Saved Views
-- Version: 002
-- Description: Create default/template saved views for each project

-- ============================================================================
-- Function: Create Default Views for a Project
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_saved_views(
  p_project_id TEXT,
  p_owner_user_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- View 1: My Work (Today)
  INSERT INTO saved_views (
    id,
    project_id,
    owner_user_id,
    scope,
    name,
    description,
    raw_query,
    normalized_query,
    presentation
  ) VALUES (
    p_project_id || '-view-my-work-today',
    p_project_id,
    p_owner_user_id,
    CASE WHEN p_owner_user_id IS NULL THEN 'shared'::view_scope ELSE 'private'::view_scope END,
    'My Work (Today)',
    'Tasks assigned to me due today',
    'assignee:me due:today -status:(done archived)',
    'assignee:me due:today -status:(done archived)',
    jsonb_build_object(
      'sort', 'priority_desc',
      'group', 'none',
      'cols', ARRAY['id', 'title', 'status', 'priority', 'due_date'],
      'view', 'table',
      'limit', 50
    )
  ) ON CONFLICT (id) DO NOTHING;

  -- View 2: My Work (This Week)
  INSERT INTO saved_views (
    id,
    project_id,
    owner_user_id,
    scope,
    name,
    description,
    raw_query,
    normalized_query,
    presentation
  ) VALUES (
    p_project_id || '-view-my-work-week',
    p_project_id,
    p_owner_user_id,
    CASE WHEN p_owner_user_id IS NULL THEN 'shared'::view_scope ELSE 'private'::view_scope END,
    'My Work (This Week)',
    'Tasks assigned to me due this week',
    'assignee:me due:this_week -status:(done archived)',
    'assignee:me due:this_week -status:(done archived)',
    jsonb_build_object(
      'sort', 'due_asc',
      'group', 'status',
      'cols', ARRAY['id', 'title', 'status', 'priority', 'due_date'],
      'view', 'table',
      'limit', 100
    )
  ) ON CONFLICT (id) DO NOTHING;

  -- View 3: Review Queue
  INSERT INTO saved_views (
    id,
    project_id,
    owner_user_id,
    scope,
    name,
    description,
    raw_query,
    normalized_query,
    presentation
  ) VALUES (
    p_project_id || '-view-review-queue',
    p_project_id,
    p_owner_user_id,
    'shared'::view_scope,
    'Review Queue',
    'All tasks waiting for review',
    'status:review',
    'status:review',
    jsonb_build_object(
      'sort', 'updated_desc',
      'group', 'none',
      'cols', ARRAY['id', 'title', 'assignees', 'priority', 'updated_at'],
      'view', 'table',
      'limit', 50
    )
  ) ON CONFLICT (id) DO NOTHING;

  -- View 4: Blocked Tasks
  INSERT INTO saved_views (
    id,
    project_id,
    owner_user_id,
    scope,
    name,
    description,
    raw_query,
    normalized_query,
    presentation
  ) VALUES (
    p_project_id || '-view-blocked',
    p_project_id,
    p_owner_user_id,
    'shared'::view_scope,
    'Blocked',
    'Tasks that are currently blocked',
    'status:blocked',
    'status:blocked',
    jsonb_build_object(
      'sort', 'updated_desc',
      'group', 'priority',
      'cols', ARRAY['id', 'title', 'assignees', 'priority', 'updated_at'],
      'view', 'table',
      'limit', 50
    )
  ) ON CONFLICT (id) DO NOTHING;

  -- View 5: P0/P1 Open
  INSERT INTO saved_views (
    id,
    project_id,
    owner_user_id,
    scope,
    name,
    description,
    raw_query,
    normalized_query,
    presentation
  ) VALUES (
    p_project_id || '-view-p0-p1-open',
    p_project_id,
    p_owner_user_id,
    'shared'::view_scope,
    'P0/P1 Open',
    'High priority open tasks',
    'priority:(P0 P1) status:(open in_progress blocked)',
    'priority:(P0 P1) status:(open in_progress blocked)',
    jsonb_build_object(
      'sort', 'priority_desc',
      'group', 'status',
      'cols', ARRAY['id', 'title', 'assignees', 'priority', 'status', 'due_date'],
      'view', 'table',
      'limit', 100
    )
  ) ON CONFLICT (id) DO NOTHING;

  -- View 6: Overdue
  INSERT INTO saved_views (
    id,
    project_id,
    owner_user_id,
    scope,
    name,
    description,
    raw_query,
    normalized_query,
    presentation
  ) VALUES (
    p_project_id || '-view-overdue',
    p_project_id,
    p_owner_user_id,
    'shared'::view_scope,
    'Overdue',
    'Tasks past their due date',
    'due:overdue -status:(done archived)',
    'due:overdue -status:(done archived)',
    jsonb_build_object(
      'sort', 'due_asc',
      'group', 'assignee',
      'cols', ARRAY['id', 'title', 'assignees', 'priority', 'due_date', 'status'],
      'view', 'table',
      'limit', 100
    )
  ) ON CONFLICT (id) DO NOTHING;

  -- View 7: All Open Tasks
  INSERT INTO saved_views (
    id,
    project_id,
    owner_user_id,
    scope,
    name,
    description,
    raw_query,
    normalized_query,
    presentation
  ) VALUES (
    p_project_id || '-view-all-open',
    p_project_id,
    p_owner_user_id,
    'shared'::view_scope,
    'All Open',
    'All open tasks in the project',
    '-status:(done archived)',
    '-status:(done archived)',
    jsonb_build_object(
      'sort', 'updated_desc',
      'group', 'status',
      'cols', ARRAY['id', 'title', 'assignees', 'priority', 'status', 'due_date'],
      'view', 'table',
      'limit', 200
    )
  ) ON CONFLICT (id) DO NOTHING;

  -- View 8: Recently Completed
  INSERT INTO saved_views (
    id,
    project_id,
    owner_user_id,
    scope,
    name,
    description,
    raw_query,
    normalized_query,
    presentation
  ) VALUES (
    p_project_id || '-view-recent-done',
    p_project_id,
    p_owner_user_id,
    'shared'::view_scope,
    'Recently Completed',
    'Tasks completed in the last 7 days',
    'status:done updated:last_7d',
    'status:done updated:last_7d',
    jsonb_build_object(
      'sort', 'updated_desc',
      'group', 'none',
      'cols', ARRAY['id', 'title', 'assignees', 'priority', 'completed_at'],
      'view', 'table',
      'limit', 100
    )
  ) ON CONFLICT (id) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger: Auto-create default views for new projects
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_default_views()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default shared views for the new project
  PERFORM create_default_saved_views(NEW.id, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_default_views
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_default_views();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION create_default_saved_views IS 'Creates standard set of saved views for a project';
COMMENT ON FUNCTION auto_create_default_views IS 'Automatically creates default views when a new project is created';
