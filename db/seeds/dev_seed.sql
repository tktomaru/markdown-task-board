-- Development Seed Data
-- Purpose: Sample data for local development and testing

-- ============================================================================
-- Cleanup (for idempotent execution)
-- ============================================================================

-- Delete in correct order to respect foreign key constraints
DELETE FROM task_attachments;
DELETE FROM task_comments;
DELETE FROM audit_logs;
DELETE FROM task_revisions;
DELETE FROM task_relations;
DELETE FROM saved_views;
DELETE FROM tasks;
DELETE FROM project_members;
DELETE FROM projects;
DELETE FROM users WHERE id != 'system';

-- ============================================================================
-- Sample Users
-- ============================================================================

INSERT INTO users (id, email, name, avatar_url, preferences) VALUES
  ('user-taku', 'taku@taskmd.dev', 'Taku Tomaru', 'https://avatars.githubusercontent.com/u/1', '{"theme": "dark", "timezone": "Asia/Tokyo"}'::jsonb),
  ('user-alice', 'alice@taskmd.dev', 'Alice Chen', 'https://avatars.githubusercontent.com/u/2', '{"theme": "light", "timezone": "America/Los_Angeles"}'::jsonb),
  ('user-bob', 'bob@taskmd.dev', 'Bob Smith', 'https://avatars.githubusercontent.com/u/3', '{"theme": "auto", "timezone": "Europe/London"}'::jsonb),
  ('user-carol', 'carol@taskmd.dev', 'Carol Kim', NULL, '{"theme": "dark", "timezone": "Asia/Seoul"}'::jsonb);

-- ============================================================================
-- Sample Projects
-- ============================================================================

INSERT INTO projects (id, name, description, visibility, settings) VALUES
  (
    'proj-taskmd',
    'TaskMD Development',
    'Main TaskMD project for building the task management system',
    'team',
    '{"defaultStatus": "open", "defaultPriority": "P2", "allowedLabels": ["backend", "frontend", "database", "docs", "bug", "feature"]}'::jsonb
  ),
  (
    'proj-demo',
    'Demo Project',
    'Sample project for demonstration purposes',
    'private',
    '{"defaultStatus": "open", "defaultPriority": "P3"}'::jsonb
  );

-- ============================================================================
-- Project Members
-- ============================================================================

INSERT INTO project_members (project_id, user_id, role) VALUES
  ('proj-taskmd', 'user-taku', 'owner'),
  ('proj-taskmd', 'user-alice', 'maintainer'),
  ('proj-taskmd', 'user-bob', 'member'),
  ('proj-taskmd', 'user-carol', 'viewer'),
  ('proj-demo', 'user-taku', 'owner'),
  ('proj-demo', 'user-alice', 'member');

-- ============================================================================
-- Sample Tasks
-- ============================================================================

INSERT INTO tasks (
  id, project_id, title, status, priority,
  assignees, labels, start_date, due_date,
  markdown_body, extra_meta, created_by, updated_by
) VALUES
  (
    'T-1001',
    'proj-taskmd',
    'Setup PostgreSQL database schema',
    'done',
    'P1',
    ARRAY['user-taku'],
    ARRAY['database', 'backend'],
    '2025-12-20',
    '2025-12-25',
    E'## Background\n\nWe need a robust database schema that supports:\n- Markdown as the source of truth\n- Efficient filtering and search\n- Change history tracking\n- Audit logs\n\n## Tasks\n\n1. Design core tables (users, projects, tasks, saved_views)\n2. Add support for task relations\n3. Implement revision tracking\n4. Setup audit logging\n5. Create indexes for common queries\n\n## Acceptance Criteria\n\n- [ ] All tables created with proper constraints\n- [ ] Indexes on commonly filtered columns\n- [ ] Triggers for updated_at and search_vector\n- [ ] Sample data loads successfully\n- [ ] README documentation complete',
    '{"estimatedHours": 8, "actualHours": 6}'::jsonb,
    'user-taku',
    'user-taku'
  ),
  (
    'T-1002',
    'proj-taskmd',
    'Implement Markdown parser for task body',
    'in_progress',
    'P1',
    ARRAY['user-taku', 'user-alice'],
    ARRAY['backend', 'parser'],
    '2025-12-26',
    '2026-01-05',
    E'## Background\n\nTasks are stored as YAML frontmatter + Markdown body. We need a parser that:\n- Extracts metadata from YAML safely\n- Preserves the original Markdown content\n- Handles edge cases (missing fields, malformed YAML, etc.)\n\n## Implementation Plan\n\n1. Use `gopkg.in/yaml.v3` for YAML parsing\n2. Use `github.com/yuin/goldmark` for Markdown rendering (read-only)\n3. Create validation layer for required fields\n4. Add comprehensive error handling\n\n## Acceptance Criteria\n\n- [ ] Parse YAML frontmatter correctly\n- [ ] Extract id, status, priority, assignees, dates, labels\n- [ ] Preserve original markdown_body without modification\n- [ ] Handle missing optional fields gracefully\n- [ ] Return clear error messages for invalid input\n- [ ] Unit tests with 90%+ coverage',
    '{"estimatedHours": 12, "dependencies": ["T-1001"]}'::jsonb,
    'user-taku',
    'user-alice'
  ),
  (
    'T-1003',
    'proj-taskmd',
    'Build query parser for SavedView',
    'open',
    'P1',
    ARRAY['user-alice'],
    ARRAY['backend', 'parser'],
    '2026-01-06',
    '2026-01-15',
    E'## Background\n\nSavedView queries use a custom syntax:\n- Space = AND\n- `key:(a b c)` = OR\n- `-key:value` = NOT\n- Comparisons: `due:<=2026-01-15`\n- Relative dates: `due:today`, `updated:last_7d`\n\n## Requirements\n\n1. Parse query string into AST\n2. Normalize queries for stable comparison\n3. Generate SQL WHERE clauses\n4. Support all filter keys (id, status, priority, assignee, label, dates, text)\n5. Validate syntax and provide helpful error messages\n\n## Acceptance Criteria\n\n- [ ] Parser handles all query syntax correctly\n- [ ] SQL generation is safe (parameterized, no injection)\n- [ ] Relative dates resolve correctly\n- [ ] Error messages guide users to fix syntax\n- [ ] Query normalization is deterministic\n- [ ] Performance tests with complex queries',
    '{"estimatedHours": 16, "dependencies": ["T-1002"]}'::jsonb,
    'user-taku',
    'user-taku'
  ),
  (
    'T-1004',
    'proj-taskmd',
    'Create REST API endpoints for tasks',
    'open',
    'P2',
    ARRAY['user-bob'],
    ARRAY['backend', 'api'],
    '2026-01-10',
    '2026-01-20',
    E'## Endpoints\n\n### Tasks\n- `GET /api/v1/projects/:projectId/tasks` - List tasks\n- `GET /api/v1/projects/:projectId/tasks/:taskId` - Get task\n- `POST /api/v1/projects/:projectId/tasks` - Create task\n- `PUT /api/v1/projects/:projectId/tasks/:taskId` - Update task\n- `DELETE /api/v1/projects/:projectId/tasks/:taskId` - Delete task\n\n### SavedViews\n- `GET /api/v1/projects/:projectId/views` - List views\n- `POST /api/v1/projects/:projectId/views` - Create view\n- `PUT /api/v1/projects/:projectId/views/:viewId` - Update view\n- `DELETE /api/v1/projects/:projectId/views/:viewId` - Delete view\n- `POST /api/v1/projects/:projectId/views/:viewId/execute` - Execute view query\n\n## Acceptance Criteria\n\n- [ ] All endpoints implemented with proper error handling\n- [ ] Request validation with clear error messages\n- [ ] Authentication and authorization checks\n- [ ] Rate limiting applied\n- [ ] OpenAPI/Swagger documentation\n- [ ] Integration tests for all endpoints',
    '{"estimatedHours": 20}'::jsonb,
    'user-taku',
    'user-taku'
  ),
  (
    'T-1005',
    'proj-taskmd',
    'Implement Task Pack generation',
    'open',
    'P2',
    ARRAY['user-alice'],
    ARRAY['backend', 'feature'],
    NULL,
    '2026-01-25',
    E'## Background\n\nTask Pack is a formatted Markdown bundle for AI handoff.\n\n## Structure\n\n0. **Instructions** - Goal, expected output, constraints\n1. **Context** - Project, deadline, priority, status, relations\n2. **Task Body** - Original markdown\n3. **Acceptance Criteria** - Extracted AC items\n4. **Output Format** - Expected response structure\n\n## Templates\n\n- `IMPLEMENT` - Feature implementation\n- `BUGFIX` - Bug investigation and fix\n- `RESEARCH` - Research and comparison\n- `REVIEW` - Code/design review\n\n## Acceptance Criteria\n\n- [ ] Template system with variable substitution\n- [ ] AC extraction from markdown\n- [ ] Related tasks inclusion\n- [ ] Multiple task bundling support\n- [ ] API endpoint: `POST /api/v1/task-packs`\n- [ ] Example templates included',
    '{"estimatedHours": 10}'::jsonb,
    'user-taku',
    'user-taku'
  ),
  (
    'T-1006',
    'proj-taskmd',
    'Fix: Assignee array not filtering correctly',
    'review',
    'P0',
    ARRAY['user-bob'],
    ARRAY['bug', 'backend'],
    '2025-12-24',
    '2025-12-27',
    E'## Issue\n\nWhen filtering by `assignee:me`, tasks with multiple assignees are not returned correctly.\n\n## Reproduction\n\n```sql\nSELECT * FROM tasks WHERE ''user-1'' = ANY(assignees);\n```\n\nThis works, but the query builder is generating:\n\n```sql\nSELECT * FROM tasks WHERE assignees @> ARRAY[''user-1''];\n```\n\nWhich fails on some PostgreSQL versions.\n\n## Root Cause\n\nUsing `@>` (contains) instead of `= ANY()` for array membership.\n\n## Fix\n\nChange query builder to use `= ANY()` operator.\n\n## Acceptance Criteria\n\n- [ ] Fix implemented and tested\n- [ ] Unit tests added\n- [ ] Regression test added\n- [ ] Works on PostgreSQL 14, 15, 16\n- [ ] Code reviewed by maintainer',
    '{"reportedBy": "user-alice", "severity": "high"}'::jsonb,
    'user-bob',
    'user-bob'
  ),
  (
    'T-1007',
    'proj-taskmd',
    'Add support for task comments',
    'blocked',
    'P3',
    ARRAY['user-carol'],
    ARRAY['feature', 'backend'],
    NULL,
    '2026-02-01',
    E'## Background\n\nUsers want to discuss tasks without editing the main body.\n\n## Requirements\n\n1. Comments as separate entities\n2. Markdown support\n3. Edit/delete by author or project maintainer\n4. Email notifications (future)\n\n## Blocked By\n\nWaiting for notification system design (T-2001)\n\n## Acceptance Criteria\n\n- [ ] Comment CRUD API\n- [ ] Markdown rendering\n- [ ] Permission checks\n- [ ] Activity log integration',
    '{"estimatedHours": 8, "blockedBy": ["T-2001"]}'::jsonb,
    'user-taku',
    'user-taku'
  ),
  (
    'T-1008',
    'proj-taskmd',
    'Setup CI/CD pipeline',
    'open',
    'P2',
    ARRAY['user-taku'],
    ARRAY['devops'],
    NULL,
    '2026-01-30',
    E'## Requirements\n\n1. GitHub Actions workflow\n2. Run tests on PR\n3. Build Docker images\n4. Push to GHCR\n5. Deploy to staging on merge to main\n\n## Workflow\n\n```yaml\nname: CI/CD\non: [push, pull_request]\njobs:\n  test:\n    - Run Go tests\n    - Run frontend tests\n  build:\n    - Build Docker images\n    - Push to registry\n  deploy:\n    - Deploy to staging (main branch only)\n```\n\n## Acceptance Criteria\n\n- [ ] Tests run automatically\n- [ ] Images built and pushed\n- [ ] Staging deployment works\n- [ ] Rollback procedure documented',
    '{"estimatedHours": 6}'::jsonb,
    'user-taku',
    'user-taku'
  );

-- ============================================================================
-- Task Relations
-- ============================================================================

INSERT INTO task_relations (source_task_id, target_task_id, relation_type, created_by) VALUES
  ('T-1002', 'T-1001', 'blocked_by', 'user-taku'),
  ('T-1003', 'T-1002', 'blocked_by', 'user-alice'),
  ('T-1004', 'T-1002', 'blocked_by', 'user-taku'),
  ('T-1004', 'T-1003', 'related', 'user-taku'),
  ('T-1007', 'T-1004', 'blocked_by', 'user-carol');

-- ============================================================================
-- Task Revisions (sample history)
-- ============================================================================

INSERT INTO task_revisions (task_id, editor_user_id, markdown_body, meta_snapshot) VALUES
  (
    'T-1002',
    'user-taku',
    E'## Background\n\nWe need a Markdown parser.\n\n## TODO\n\n- Research libraries\n- Implement basic parser',
    jsonb_build_object(
      'title', 'Implement Markdown parser',
      'status', 'open',
      'priority', 'P2',
      'assignees', ARRAY['user-taku']
    )
  );

-- ============================================================================
-- Audit Logs (sample)
-- ============================================================================

INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, detail) VALUES
  (
    'user-taku',
    'task.create',
    'task',
    'T-1001',
    '{"title": "Setup PostgreSQL database schema"}'::jsonb
  ),
  (
    'user-taku',
    'task.status_change',
    'task',
    'T-1001',
    '{"old": "in_progress", "new": "done"}'::jsonb
  ),
  (
    'user-alice',
    'task.update',
    'task',
    'T-1002',
    '{"fields": ["markdown_body", "assignees"]}'::jsonb
  );

-- ============================================================================
-- Saved Views (custom examples, in addition to auto-created defaults)
-- ============================================================================

INSERT INTO saved_views (
  id, project_id, owner_user_id, scope, name, description,
  raw_query, normalized_query, presentation
) VALUES
  (
    'view-taku-urgent',
    'proj-taskmd',
    'user-taku',
    'private',
    'My Urgent Tasks',
    'P0/P1 tasks assigned to me',
    'assignee:me priority:(P0 P1) -status:done',
    'assignee:me priority:(P0 P1) -status:done',
    jsonb_build_object(
      'sort', 'priority_desc',
      'group', 'status',
      'cols', ARRAY['id', 'title', 'status', 'priority', 'due_date'],
      'view', 'table',
      'limit', 20
    )
  ),
  (
    'view-alice-review',
    'proj-taskmd',
    'user-alice',
    'private',
    'Waiting for My Review',
    'Tasks in review that I need to check',
    'status:review assignee:user-alice',
    'status:review assignee:user-alice',
    jsonb_build_object(
      'sort', 'updated_desc',
      'group', 'none',
      'cols', ARRAY['id', 'title', 'priority', 'updated_at'],
      'view', 'table',
      'limit', 50
    )
  );

-- ============================================================================
-- Update sequences (ensure IDs don't conflict with future inserts)
-- ============================================================================

SELECT setval('task_revisions_rev_id_seq', 1000, false);
SELECT setval('audit_logs_id_seq', 1000, false);

-- ============================================================================
-- Verification
-- ============================================================================

-- Show summary
DO $$
BEGIN
  RAISE NOTICE 'Seed data loaded successfully!';
  RAISE NOTICE 'Users: %', (SELECT COUNT(*) FROM users WHERE id != 'system');
  RAISE NOTICE 'Projects: %', (SELECT COUNT(*) FROM projects);
  RAISE NOTICE 'Tasks: %', (SELECT COUNT(*) FROM tasks);
  RAISE NOTICE 'Saved Views: %', (SELECT COUNT(*) FROM saved_views);
  RAISE NOTICE 'Task Relations: %', (SELECT COUNT(*) FROM task_relations);
END $$;
