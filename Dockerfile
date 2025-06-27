# Arquivo: Dockerfile

# 1. Começamos com uma imagem oficial do Python.
FROM python:3.9-slim

# 2. Definimos o diretório de trabalho dentro do contêiner.
WORKDIR /app

# 3. Atualizamos os pacotes do sistema e instalamos o Tesseract.
# O -y confirma automaticamente a instalação.
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/*

# 4. Copiamos o arquivo de dependências para o contêiner.
COPY requirements.txt .

# 5. Instalamos as bibliotecas Python.
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copiamos todo o resto do código do seu projeto para o contêiner.
COPY . .

# 7. Expomos a porta que o nosso servidor gunicorn irá usar.
EXPOSE 8000

# 8. Definimos o comando para iniciar a sua aplicação quando o contêiner rodar.
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "main:app"]
