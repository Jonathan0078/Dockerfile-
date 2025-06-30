import os
import json
import math
import itertools
from flask import Flask, jsonify, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

# --- CONFIGURAÇÃO INICIAL DA APLICAÇÃO E DO BANCO DE DADOS ---
basedir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
# Chave secreta para segurança da sessão de login
app.config['SECRET_KEY'] = 'uma-chave-secreta-muito-segura-e-dificil-de-adivinhar' 
# Localização do nosso banco de dados
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'platform.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login' # Redireciona usuários não logados para a página de login

# --- MODELOS DO BANCO DE DADOS (Nossas "Tabelas") ---

# Tabela de Usuários
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    projects = db.relationship('Project', backref='author', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# Tabela de Projetos
class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_name = db.Column(db.String(150), nullable=False)
    system_state_json = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# Função para carregar um usuário a partir da sessão
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- ROTAS DE AUTENTICAÇÃO (LOGIN, REGISTRO, LOGOUT) ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user is None or not user.check_password(request.form['password']):
            flash('Usuário ou senha inválidos.')
            return redirect(url_for('login'))
        login_user(user, remember=True)
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        if User.query.filter_by(username=request.form['username']).first():
            flash('Este nome de usuário já existe.')
            return redirect(url_for('register'))
        user = User(username=request.form['username'])
        user.set_password(request.form['password'])
        db.session.add(user)
        db.session.commit()
        flash('Cadastro realizado com sucesso! Faça o login.')
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))

# --- ROTAS DA PLATAFORMA ---

# Página inicial agora é o login se não estiver logado
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/dashboard')
@login_required # Protege esta rota
def dashboard():
    # Futuramente, aqui listaremos os projetos do usuário
    return render_template('platform.html') # A nossa bancada agora se chama platform.html

# --- ROTAS DA API (Permanecem as mesmas, mas agora precisarão de login no futuro) ---
# (Aqui entrariam as rotas /analyze_system, /optimize_system, /get_component_database...)
# (Por enquanto, vamos mantê-las simples para focar na autenticação)

if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Cria o arquivo do banco de dados e as tabelas se não existirem
    app.run(debug=True)

