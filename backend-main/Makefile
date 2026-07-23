
# Makefile for Docker Compose (base + dev/prod)
# Usage:
#   make dev
#   make prod
#   make down
#   make logs
#   make ps
#   make build ENV=dev
#   make exec SERVICE=web
#   make dbshell

ENV ?= dev
DC := docker compose
BASE := -f docker-compose.base.yml
DEV  := -f docker-compose.dev.yml
PROD := -f docker-compose.prod.yml

ifeq ($(ENV),prod)
  FILES := $(BASE) $(PROD)
else
  FILES := $(BASE) $(DEV)
endif

# ---------- helpers ----------
.PHONY: help
help:
	@echo "Targets:"
	@echo "  make dev              Start dev stack (build + up)"
	@echo "  make prod             Start prod stack (build + up -d)"
	@echo "  make up ENV=dev|prod  Start stack (ENV default: dev)"
	@echo "  make down             Stop and remove containers"
	@echo "  make restart          Restart stack"
	@echo "  make build ENV=...    Build images"
	@echo "  make ps ENV=...       Show containers"
	@echo "  make logs ENV=...     Follow logs"
	@echo "  make exec SERVICE=web ENV=...  Exec shell in service"
	@echo "  make prune            Remove volumes (DANGEROUS)"
	@echo "  make dbshell          PSQL shell to db"

# ---------- common ----------
.PHONY: dev prod up down restart build ps logs pull exec stop rm prune dbshell

dev:
	@$(MAKE) up ENV=dev

prod:
	@$(MAKE) up ENV=prod

up:
ifeq ($(ENV),prod)
	$(DC) $(FILES) up -d --build
else
	$(DC) $(FILES) up --build
endif

down:
	$(DC) $(FILES) down

restart:
	$(DC) $(FILES) down
	@$(MAKE) up ENV=$(ENV)

build:
	$(DC) $(FILES) build

pull:
	$(DC) $(FILES) pull

ps:
	$(DC) $(FILES) ps

logs:
	$(DC) $(FILES) logs -f --tail=200

stop:
	$(DC) $(FILES) stop

rm:
	$(DC) $(FILES) rm -f

# Remove volumes too (careful: deletes DB data if stored in named volumes)
prune:
	$(DC) $(FILES) down -v

# ---------- shells ----------
SERVICE ?= web

exec:
	$(DC) $(FILES) exec $(SERVICE) sh

dbshell:
	$(DC) $(FILES) exec db psql -U app -d app
