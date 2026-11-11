#!/bin/bash
# Pornit de Lambda Web Adapter (AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap).
# Portul vine din AWS_LWA_PORT (implicit 8080).
exec python -m uvicorn --factory --host 127.0.0.1 --port "${AWS_LWA_PORT:-8080}" --no-access-log ba_server.main:create_app
