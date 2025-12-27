.PHONY: help
help: ## Show this help message
	@echo "TaskMD - Makefile Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: setup
setup: ## Initial setup (create .env from example)
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo ".env file created. Please edit it with your configuration."; \
	else \
		echo ".env file already exists."; \
	fi

.PHONY: up
up: ## Start all services
	docker compose up -d

.PHONY: down
down: ## Stop all services
	docker compose down

.PHONY: restart
restart: ## Restart all services
	docker compose restart

.PHONY: logs
logs: ## Show logs from all services
	docker compose logs -f

.PHONY: logs-api
logs-api: ## Show API server logs
	docker compose logs -f api

.PHONY: logs-web
logs-web: ## Show web server logs
	docker compose logs -f web

.PHONY: logs-db
logs-db: ## Show database logs
	docker compose logs -f postgres

.PHONY: build
build: ## Build all Docker images
	docker compose build

.PHONY: rebuild
rebuild: ## Rebuild all Docker images (no cache)
	docker compose build --no-cache

.PHONY: dev
dev: ## Start services in development mode
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

.PHONY: dev-down
dev-down: ## Stop development services
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down

.PHONY: db-init
db-init: ## Initialize database with schema
	./db/init.sh

.PHONY: db-seed
db-seed: ## Initialize database with schema and seed data
	./db/init.sh --seed

.PHONY: db-reset
db-reset: ## Reset database (DANGEROUS: deletes all data!)
	./db/init.sh --drop --seed

.PHONY: db-shell
db-shell: ## Open PostgreSQL shell
	docker compose exec postgres psql -U postgres -d taskmd

.PHONY: db-backup
db-backup: ## Backup database
	@mkdir -p backups
	@docker compose exec postgres pg_dump -U postgres taskmd | gzip > backups/taskmd_$(shell date +%Y%m%d_%H%M%S).sql.gz
	@echo "Backup created in backups/"

.PHONY: db-restore
db-restore: ## Restore database from backup (usage: make db-restore FILE=backups/taskmd_20231225_120000.sql.gz)
	@if [ -z "$(FILE)" ]; then \
		echo "Error: Please specify FILE=<backup-file>"; \
		exit 1; \
	fi
	@gunzip -c $(FILE) | docker compose exec -T postgres psql -U postgres -d taskmd
	@echo "Database restored from $(FILE)"

.PHONY: api-shell
api-shell: ## Open shell in API container
	docker compose exec api sh

.PHONY: web-shell
web-shell: ## Open shell in web container
	docker compose exec web sh

.PHONY: clean
clean: ## Remove stopped containers and volumes
	docker compose down -v

.PHONY: prune
prune: ## Remove all unused Docker resources
	docker system prune -af --volumes

.PHONY: status
status: ## Show status of all services
	docker compose ps

.PHONY: health
health: ## Check health of all services
	@echo "API Health:"
	@curl -s http://localhost:8080/healthz | jq . || echo "API not responding"
	@echo ""
	@echo "Web Health:"
	@curl -s http://localhost/ -I | head -n 1 || echo "Web not responding"
	@echo ""
	@echo "Database Health:"
	@docker compose exec postgres pg_isready -U postgres || echo "Database not responding"
