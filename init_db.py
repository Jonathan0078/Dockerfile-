# init_db.py
from app import app, db

print("Iniciando a criação do banco de dados...")

with app.app_context():
    try:
        db.create_all()
        print("Tabelas do banco de dados criadas com sucesso.")
    except Exception as e:
        print(f"Ocorreu um erro ao criar as tabelas: {e}")
