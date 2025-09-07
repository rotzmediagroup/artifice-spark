#!/bin/sh

# Start nginx
nginx

# Start the API server (PostgreSQL version)
exec node server.js