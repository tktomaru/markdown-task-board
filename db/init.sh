#!/bin/bash
# Database initialization script for TaskMD
# This script initializes the PostgreSQL database with schema and optional seed data

set -e  # Exit on error

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-taskmd}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Parse arguments
SEED_DATA=false
DROP_EXISTING=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --seed)
            SEED_DATA=true
            shift
            ;;
        --drop)
            DROP_EXISTING=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --seed       Load development seed data"
            echo "  --drop       Drop existing database before creating (DANGEROUS!)"
            echo "  --help, -h   Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  DB_HOST      Database host (default: localhost)"
            echo "  DB_PORT      Database port (default: 5432)"
            echo "  DB_NAME      Database name (default: taskmd)"
            echo "  DB_USER      Database user (default: postgres)"
            echo "  DB_PASSWORD  Database password"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Build psql command
PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER"

if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD="$DB_PASSWORD"
fi

info "TaskMD Database Initialization"
info "================================"
info "Host: $DB_HOST:$DB_PORT"
info "Database: $DB_NAME"
info "User: $DB_USER"
echo ""

# Check PostgreSQL connection
info "Checking PostgreSQL connection..."
if ! $PSQL_CMD -c '\q' 2>/dev/null; then
    error "Cannot connect to PostgreSQL. Please check your connection settings."
fi
info "✓ Connected to PostgreSQL"

# Drop existing database if requested
if [ "$DROP_EXISTING" = true ]; then
    warn "Dropping existing database '$DB_NAME'..."
    read -p "Are you sure? This will DELETE ALL DATA! (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        $PSQL_CMD -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
        info "✓ Database dropped"
    else
        info "Aborted."
        exit 0
    fi
fi

# Create database if it doesn't exist
info "Creating database '$DB_NAME' if not exists..."
$PSQL_CMD -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    $PSQL_CMD -c "CREATE DATABASE $DB_NAME;"
info "✓ Database ready"

# Apply schema migrations
info "Applying schema migrations..."

# 001: Initial schema
info "  → 001_initial_schema.sql"
$PSQL_CMD -d $DB_NAME -f "$SCRIPT_DIR/schema/001_initial_schema.sql" > /dev/null
info "  ✓ Initial schema applied"

# 002: Default views
info "  → 002_default_views.sql"
$PSQL_CMD -d $DB_NAME -f "$SCRIPT_DIR/schema/002_default_views.sql" > /dev/null
info "  ✓ Default views applied"

info "✓ All migrations applied"

# Load seed data if requested
if [ "$SEED_DATA" = true ]; then
    info "Loading development seed data..."
    $PSQL_CMD -d $DB_NAME -f "$SCRIPT_DIR/seeds/dev_seed.sql"
    info "✓ Seed data loaded"
fi

# Verify installation
info "Verifying installation..."
TABLE_COUNT=$($PSQL_CMD -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
info "✓ Tables created: $TABLE_COUNT"

# Show summary
echo ""
info "Database initialization complete!"
echo ""
info "Summary:"
info "  Database: $DB_NAME"
info "  Tables: $TABLE_COUNT"

if [ "$SEED_DATA" = true ]; then
    USER_COUNT=$($PSQL_CMD -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE id != 'system';")
    PROJECT_COUNT=$($PSQL_CMD -d $DB_NAME -t -c "SELECT COUNT(*) FROM projects;")
    TASK_COUNT=$($PSQL_CMD -d $DB_NAME -t -c "SELECT COUNT(*) FROM tasks;")

    info "  Sample data:"
    info "    Users: $USER_COUNT"
    info "    Projects: $PROJECT_COUNT"
    info "    Tasks: $TASK_COUNT"
fi

echo ""
info "You can now connect to the database:"
echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
echo ""

# Clean up
unset PGPASSWORD
