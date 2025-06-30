from app import app, db

# Este script importa a app e o objeto db do nosso app.py
# e executa o comando para criar as tabelas.
# Ele precisa do contexto da aplicação para saber onde (qual URL de DB) criar as tabelas.

with app.app_context():
    print("Iniciando a criação do banco de dados...")
    db.create_all()
    print("Banco de dados e tabelas criados com sucesso.")

