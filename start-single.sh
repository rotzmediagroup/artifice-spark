#!/bin/sh

# Initialize SQLite database
if [ ! -f /app/database.sqlite ]; then
    echo "Initializing SQLite database..."
    sqlite3 /app/database.sqlite < /app/database/init-sqlite.sql
fi

# Start nginx
nginx

# Start the API server
exec node server-sqlite.js