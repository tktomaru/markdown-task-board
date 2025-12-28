-- Add parent_id column to tasks table for hierarchical task grouping
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id TEXT;

-- Add foreign key constraint
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_parent
  FOREIGN KEY (parent_id)
  REFERENCES tasks(id)
  ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

-- Add comment
COMMENT ON COLUMN tasks.parent_id IS 'ID of the parent task for hierarchical grouping';
