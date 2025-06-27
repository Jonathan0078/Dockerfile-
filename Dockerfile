# Arquivo: Dockerfile (versão final corrigida)

# 1. Imagem Base
FROM python:3.10-slim

# 2. Diretório de Trabalho
WORKDIR /app

# 3. Cache de Dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Código da Aplicação
COPY . .

# 5. Expor a Porta
EXPOSE $PORT

# 6. Comando de Inicialização (VERSÃO CORRIGIDA)
CMD gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 120 main:app
