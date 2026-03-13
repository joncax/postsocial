#!/bin/bash
cd ~/postsocial
source .venv/bin/activate
cd backend
uvicorn main:app --reload --port 8000 --host 0.0.0.0
