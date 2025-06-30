#!/usr/bin/env bash
# Exit on error
set -o errexit

pip install -r requirements.txt

# Executa nosso script simples para criar o banco de dados
python init_db.py
