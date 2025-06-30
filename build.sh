#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Iniciando o processo de build ---"

echo "Instalando dependências..."
pip install -r requirements.txt

echo "Inicializando o banco de dados..."
flask init-db

echo "--- Build concluído com sucesso! ---"
