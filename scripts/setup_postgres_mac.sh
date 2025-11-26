#!/usr/bin/env bash

set -euo pipefail

POSTGRES_VERSION="${POSTGRES_VERSION:-16}"
DB_NAME="${DB_NAME:-secret_santa}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "This script is intended for macOS only." >&2
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  cat <<'EOF'
Homebrew is required but not found.
Install it with:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
EOF
  exit 1
fi

echo "▶ Installing PostgreSQL ${POSTGRES_VERSION} with Homebrew (if needed)..."
if ! brew list --formula "postgresql@${POSTGRES_VERSION}" >/dev/null 2>&1; then
  brew install "postgresql@${POSTGRES_VERSION}"
else
  echo "PostgreSQL ${POSTGRES_VERSION} already installed."
fi

BREW_PREFIX="$(brew --prefix)"
POSTGRES_BIN="${BREW_PREFIX}/opt/postgresql@${POSTGRES_VERSION}/bin"

if [[ ":$PATH:" != *":${POSTGRES_BIN}:"* ]]; then
  echo "Temporarily adding ${POSTGRES_BIN} to PATH."
  export PATH="${POSTGRES_BIN}:$PATH"
fi

echo "▶ Starting PostgreSQL service..."
brew services start "postgresql@${POSTGRES_VERSION}" >/dev/null

echo "▶ Verifying psql availability..."
if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found even after installation. Check your PATH settings." >&2
  exit 1
fi

create_role() {
  local role_exists
  role_exists="$(psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" || true)"
  if [[ -z "${role_exists}" ]]; then
    echo "▶ Creating role ${DB_USER}..."
    if [[ -z "${DB_PASSWORD}" ]]; then
      psql postgres -c "CREATE ROLE ${DB_USER} WITH LOGIN SUPERUSER;"
    else
      psql postgres -c "CREATE ROLE ${DB_USER} WITH LOGIN SUPERUSER PASSWORD '${DB_PASSWORD}';"
    fi
  else
    echo "Role ${DB_USER} already exists."
  fi
}

create_database() {
  local db_exists
  db_exists="$(psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" || true)"
  if [[ -z "${db_exists}" ]]; then
    echo "▶ Creating database ${DB_NAME}..."
    createdb "${DB_NAME}"
  else
    echo "Database ${DB_NAME} already exists."
  fi
}

create_role
create_database

cat <<EOF
✅ PostgreSQL setup complete.
- Version: ${POSTGRES_VERSION}
- Role: ${DB_USER}
- Database: ${DB_NAME}

If you want this PATH change to persist, add this line to your shell profile:
  export PATH="${POSTGRES_BIN}:\$PATH"
EOF

