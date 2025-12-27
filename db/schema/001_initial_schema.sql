-- TaskMD Database Schema
-- Version: 001
-- Description: Initial schema for TaskMD project

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- ============================================================================
-- Custom Types (Enums)
-- ============================================================================

-- Task status enum
CREATE TYPE task_status AS ENUM (
  'open',
  'in_progress',
  'review',
  'blocked',
  'done',
  'archived'
);

-- Task priority enum
CREATE TYPE task_priority AS ENUM (
  'P0',  -- Emergency
  'P1',  -- Urgent
  'P2',  -- Important (planned)
  'P3',  -- Nice to have
  'P4'   -- Someday
);

-- Project member role enum
CREATE TYPE project_role AS ENUM (
  'owner',
  'maintainer',
  'member',
  'viewer'
);

-- Project visibility enum
CREATE TYPE project_visibility AS ENUM (
  'private',
  'team',
  'public'
);

-- Saved view scope enum
CREATE TYPE view_scope AS ENUM (
  'private',
  'shared'
);

-- Task relation type enum
CREATE TYPE relation_type AS ENUM (
  'parent',
  'child',
  'blocks',
  'blocked_by',
  'related',
  'duplicates',
  'duplicated_by'
);

-- Audit action type enum
CREATE TYPE audit_action AS ENUM (
  'task.create',
  'task.update',
  'task.delete',
  'task.status_change',
  'task.assign',
  'view.create',
  'view.update',
  'view.delete',
  'view.share',
  'project.create',
  'project.update',
  'project.delete',
  'project.member_add',
  'project.member_remove',
  'project.member_role_change'
);

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Users table
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  avatar_url    TEXT,

  -- Authentication (for email/password mode)
  password_hash TEXT,

  -- OIDC attributes
  oidc_provider TEXT,
  oidc_subject  TEXT,

  -- User preferences
  preferences   JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oidc ON users(oidc_provider, oidc_subject) WHERE oidc_provider IS NOT NULL;

-- Projects table
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  visibility  project_visibility NOT NULL DEFAULT 'private',

  -- Project settings
  settings    JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_archived ON projects(archived_at) WHERE archived_at IS NOT NULL;

-- Project members table
CREATE TABLE project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       project_role NOT NULL DEFAULT 'member',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(project_id, role);

-- Tasks table (core entity)
CREATE TABLE tasks (
  id            TEXT PRIMARY KEY,           -- e.g., "T-1042"
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Basic metadata
  title         TEXT NOT NULL,
  status        task_status NOT NULL DEFAULT 'open',
  priority      task_priority NOT NULL DEFAULT 'P2',

  -- Assignment and categorization
  assignees     TEXT[] NOT NULL DEFAULT '{}',
  labels        TEXT[] NOT NULL DEFAULT '{}',

  -- Dates
  start_date    DATE,
  due_date      DATE,

  -- Markdown content (source of truth)
  markdown_body TEXT NOT NULL,

  -- Extended metadata (for future expansion)
  extra_meta    JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Full-text search vector (auto-updated by trigger)
  search_vector TSVECTOR,

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  archived_at   TIMESTAMPTZ,

  -- Creator/editor tracking
  created_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by    TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for tasks
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assignees ON tasks USING GIN(assignees);
CREATE INDEX idx_tasks_labels ON tasks USING GIN(labels);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_start_date ON tasks(start_date) WHERE start_date IS NOT NULL;
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_updated_at ON tasks(updated_at);
CREATE INDEX idx_tasks_search_vector ON tasks USING GIN(search_vector);
CREATE INDEX idx_tasks_archived ON tasks(archived_at) WHERE archived_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_project_priority ON tasks(project_id, priority);
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);

-- Task relations table
CREATE TABLE task_relations (
  source_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  target_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  relation_type  relation_type NOT NULL,

  -- Timestamps
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,

  PRIMARY KEY (source_task_id, target_task_id, relation_type),

  -- Prevent self-reference
  CHECK (source_task_id != target_task_id)
);

CREATE INDEX idx_task_relations_source ON task_relations(source_task_id);
CREATE INDEX idx_task_relations_target ON task_relations(target_task_id);
CREATE INDEX idx_task_relations_type ON task_relations(relation_type);

-- Saved views table
CREATE TABLE saved_views (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,

  -- View configuration
  name              TEXT NOT NULL,
  description       TEXT,
  scope             view_scope NOT NULL DEFAULT 'private',

  -- Query (both raw and normalized for stability)
  raw_query         TEXT NOT NULL,
  normalized_query  TEXT NOT NULL,

  -- Presentation settings (sort/group/cols/view/limit)
  presentation      JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Usage tracking
  use_count         INTEGER NOT NULL DEFAULT 0,
  last_used_at      TIMESTAMPTZ,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_views_project ON saved_views(project_id);
CREATE INDEX idx_saved_views_owner ON saved_views(owner_user_id);
CREATE INDEX idx_saved_views_scope ON saved_views(project_id, scope);
CREATE INDEX idx_saved_views_usage ON saved_views(use_count DESC, last_used_at DESC);

-- ============================================================================
-- History & Audit Tables
-- ============================================================================

-- Task revisions table (complete history)
CREATE TABLE task_revisions (
  rev_id         BIGSERIAL PRIMARY KEY,
  task_id        TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Editor information
  editor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- Full snapshot
  markdown_body  TEXT NOT NULL,
  meta_snapshot  JSONB NOT NULL,  -- Contains status, priority, assignees, etc.

  -- Change summary
  change_summary TEXT,

  -- Timestamp
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_revisions_task ON task_revisions(task_id, created_at DESC);
CREATE INDEX idx_task_revisions_editor ON task_revisions(editor_user_id);
CREATE INDEX idx_task_revisions_created ON task_revisions(created_at);

-- Audit logs table
CREATE TABLE audit_logs (
  id             BIGSERIAL PRIMARY KEY,

  -- Actor information
  actor_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_ip       INET,

  -- Action details
  action         audit_action NOT NULL,
  target_type    TEXT NOT NULL,  -- 'task', 'view', 'project', etc.
  target_id      TEXT NOT NULL,

  -- Additional context
  detail         JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Timestamp
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Composite index for common audit queries
CREATE INDEX idx_audit_logs_actor_created ON audit_logs(actor_user_id, created_at DESC);

-- ============================================================================
-- Additional Tables
-- ============================================================================

-- Task comments table (optional, for future use)
CREATE TABLE task_comments (
  id             TEXT PRIMARY KEY,
  task_id        TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Comment content
  markdown_body  TEXT NOT NULL,

  -- Author
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id, created_at);
CREATE INDEX idx_task_comments_author ON task_comments(author_user_id);

-- Task attachments table (optional, for future use with MinIO/S3)
CREATE TABLE task_attachments (
  id             TEXT PRIMARY KEY,
  task_id        TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- File metadata
  filename       TEXT NOT NULL,
  content_type   TEXT NOT NULL,
  size_bytes     BIGINT NOT NULL,

  -- Storage location
  storage_key    TEXT NOT NULL,  -- S3/MinIO key
  storage_bucket TEXT NOT NULL,

  -- Uploader
  uploaded_by    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX idx_task_attachments_uploader ON task_attachments(uploaded_by);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update task search vector
CREATE OR REPLACE FUNCTION update_task_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.markdown_body, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.labels, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Create task revision on update
CREATE OR REPLACE FUNCTION create_task_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create revision if content actually changed
  IF OLD.markdown_body IS DISTINCT FROM NEW.markdown_body OR
     OLD.status IS DISTINCT FROM NEW.status OR
     OLD.priority IS DISTINCT FROM NEW.priority OR
     OLD.assignees IS DISTINCT FROM NEW.assignees OR
     OLD.title IS DISTINCT FROM NEW.title THEN

    INSERT INTO task_revisions (
      task_id,
      editor_user_id,
      markdown_body,
      meta_snapshot
    ) VALUES (
      OLD.id,
      NEW.updated_by,
      OLD.markdown_body,
      jsonb_build_object(
        'title', OLD.title,
        'status', OLD.status,
        'priority', OLD.priority,
        'assignees', OLD.assignees,
        'labels', OLD.labels,
        'start_date', OLD.start_date,
        'due_date', OLD.due_date,
        'extra_meta', OLD.extra_meta
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Log audit event
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  v_action audit_action;
  v_detail JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := (TG_TABLE_NAME || '.create')::audit_action;
    v_detail := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := (TG_TABLE_NAME || '.update')::audit_action;
    v_detail := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := (TG_TABLE_NAME || '.delete')::audit_action;
    v_detail := to_jsonb(OLD);
  END IF;

  -- Insert audit log (actor_user_id should be set by application)
  INSERT INTO audit_logs (
    action,
    target_type,
    target_id,
    detail
  ) VALUES (
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id::TEXT, OLD.id::TEXT),
    v_detail
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_members_updated_at
  BEFORE UPDATE ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_views_updated_at
  BEFORE UPDATE ON saved_views
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Search vector triggers
CREATE TRIGGER update_tasks_search_vector
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_search_vector();

-- Revision triggers
CREATE TRIGGER create_task_revision_on_update
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_task_revision();

-- ============================================================================
-- Default Data
-- ============================================================================

-- Create a default system user (for system-generated actions)
INSERT INTO users (id, email, name, preferences)
VALUES ('system', 'system@taskmd.local', 'System', '{}'::JSONB)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE tasks IS 'Core task entity with Markdown body as source of truth';
COMMENT ON COLUMN tasks.markdown_body IS 'Original Markdown content - never modify, only replace';
COMMENT ON COLUMN tasks.extra_meta IS 'Extended metadata for future expansion (JSONB)';
COMMENT ON COLUMN tasks.search_vector IS 'Auto-generated full-text search vector';

COMMENT ON TABLE saved_views IS 'Saved queries with presentation settings';
COMMENT ON COLUMN saved_views.raw_query IS 'User-entered query string';
COMMENT ON COLUMN saved_views.normalized_query IS 'Normalized query for stability';
COMMENT ON COLUMN saved_views.presentation IS 'Display settings: sort, group, columns, view type, limit';

COMMENT ON TABLE task_revisions IS 'Complete history of all task changes';
COMMENT ON COLUMN task_revisions.meta_snapshot IS 'Full metadata snapshot at time of revision';

COMMENT ON TABLE audit_logs IS 'Audit trail for all significant actions';
COMMENT ON COLUMN audit_logs.detail IS 'Action-specific details in JSONB format';
