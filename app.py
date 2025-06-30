import os
import json
from flask import Flask, jsonify, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

# --- CONFIGURAÇÃO E CRIAÇÃO DA APP ---
app = Flask(__name__)

# Pega a URL do banco de dados do ambiente do Render
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError("FATAL: A variável de ambiente DATABASE_URL não foi encontrada.")

# Garante compatibilidade com o SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'uma-chave-secreta-muito-segura')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# --- MODELOS DO BANCO DE DADOS ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    projects = db.relationship('Project', backref='author', lazy=True, cascade="all, delete-orphan")

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_name = db.Column(db.String(150), nullable=False)
    system_state_json = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- ROTAS DA APLICAÇÃO ---
@app.route('/')
def index():
    if current_user.is_authenticated: return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated: return redirect(url_for('dashboard'))
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user is None or not check_password_hash(user.password_hash, request.form['password']):
            flash('Usuário ou senha inválidos.'); return redirect(url_for('login'))
        login_user(user, remember=True); return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated: return redirect(url_for('dashboard'))
    if request.method == 'POST':
        if User.query.filter_by(username=request.form['username']).first():
            flash('Este nome de usuário já existe.'); return redirect(url_for('register'))
        hashed_password = generate_password_hash(request.form['password'], method='pbkdf2:sha256')
        new_user = User(username=request.form['username'], password_hash=hashed_password)
        db.session.add(new_user); db.session.commit()
        flash('Cadastro realizado com sucesso! Faça o login.'); return redirect(url_for('login'))
    return render_template('register.html')
    
# (As outras rotas não precisam de alteração)
@app.route('/logout')
def logout(): logout_user(); return redirect(url_for('index'))
@app.route('/dashboard')
@login_required
def dashboard(): return render_template('platform.html')
# ... (demais rotas da API aqui)

# --- INICIALIZAÇÃO DO BANCO DE DADOS (SE NECESSÁRIO) ---
with app.app_context():
    inspector = inspect(db.engine)
    # Verifica se a tabela 'user' (ou qualquer outra) já existe
    if not inspector.has_table("user"):
        print("Tabelas não encontradas, criando banco de dados...")
        db.create_all()
        print("Banco de dados e tabelas criados com sucesso.")
    else:
        print("Tabelas já existem, pulando a criação.")

