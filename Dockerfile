# Arquivo: Dockerfile

# 1. Imagem Base: Usar uma versão estável e slim do Python
FROM python:3.10-slim

# 2. Diretório de Trabalho: Definir o local dos arquivos dentro do contêiner
WORKDIR /app

# 3. Cache de Dependências: Copiar e instalar as dependências primeiro
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Código da Aplicação: Copiar o resto do código do projeto
COPY . .

# 5. Expor a Porta: Informar ao Docker que a aplicação usará uma porta de rede
# A variável $PORT é fornecida automaticamente pelo ambiente do Render.
EXPOSE $PORT

# 6. Comando de Inicialização: Como iniciar o servidor web de produção
# Este é o comando que executa sua aplicação de forma robusta.
CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "--workers", "2", "--timeout", "120", "main:app"]
