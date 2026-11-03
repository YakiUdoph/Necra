#!/usr/bin/env bash
set -euo pipefail

NECRA_TEST_DATABASE="necra_test_t002_$$"

if [[ ! "${NECRA_TEST_DATABASE}" =~ ^necra_test_t002_[0-9]+$ ]]; then
  echo "Refusing to use an unsafe test database name" >&2
  exit 1
fi

cleanup() {
  dropdb --if-exists --maintenance-db=postgres "${NECRA_TEST_DATABASE}" >/dev/null
}
trap cleanup EXIT

createdb --maintenance-db=postgres "${NECRA_TEST_DATABASE}"
psql --dbname="${NECRA_TEST_DATABASE}" --set=ON_ERROR_STOP=1 --file=migrations/0000_lovely_marvel_apes.sql
psql --dbname="${NECRA_TEST_DATABASE}" --set=ON_ERROR_STOP=1 --file=tests/integration/schema.sql
psql --dbname="${NECRA_TEST_DATABASE}" --set=ON_ERROR_STOP=1 --file=migrations/rollback/0000_lovely_marvel_apes.down.sql

remaining_tables="$(psql --dbname="${NECRA_TEST_DATABASE}" --tuples-only --no-align --command="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")"
if [[ "${remaining_tables}" != "0" ]]; then
  echo "Rollback left ${remaining_tables} public tables" >&2
  exit 1
fi

echo "T002 migration apply, constraints, rollback, and disposable database checks passed"
