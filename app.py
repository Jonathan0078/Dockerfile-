import os
import json
import math
import itertools
from flask import Flask, jsonify, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

basedir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'uma-chave-secreta-muito-segura-e-dificil-de-adivinhar')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'platform.db'))
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# --- MODELOS DO BANCO DE DADOS (sem alterações) ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    projects = db.relationship('Project', backref='author', lazy=True, cascade="all, delete-orphan")
    def set_password(self, pw): self.password_hash = generate_password_hash(pw)
    def check_password(self, pw): return check_password_hash(self.password_hash, pw)

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_name = db.Column(db.String(150), nullable=False)
    system_state_json = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- MELHORIA: COMANDO PARA INICIALIZAR O BANCO DE DADOS ---
@app.cli.command('init-db')
def init_db_command():
    """Cria as tabelas do banco de dados."""
    db.create_all()
    print('Banco de dados inicializado.')

# --- ROTAS DA APLICAÇÃO E API (sem alterações na lógica) ---
@app.route('/')
def index():
    if current_user.is_authenticated: return redirect(url_for('dashboard'))
    return render_template('login.html')

# (Cole aqui o restante das suas rotas: /login, /register, /logout, /dashboard, 
# /save_project, /get_projects, /load_project, /analyze_system, etc.)
# ...

# Para garantir, o código completo das rotas está abaixo:
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated: return redirect(url_for('dashboard'))
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user is None or not user.check_password(request.form['password']):
            flash('Usuário ou senha inválidos.'); return redirect(url_for('login'))
        login_user(user, remember=True); return redirect(url_for('dashboard'))
    return render_template('login.html')
@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated: return redirect(url_for('dashboard'))
    if request.method == 'POST':
        if User.query.filter_by(username=request.form['username']).first():
            flash('Este nome de usuário já existe.'); return redirect(url_for('register'))
        user = User(username=request.form['username']); user.set_password(request.form['password'])
        db.session.add(user); db.session.commit()
        flash('Cadastro realizado com sucesso! Faça o login.'); return redirect(url_for('login'))
    return render_template('register.html')
@app.route('/logout')
def logout():
    logout_user(); return redirect(url_for('index'))
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('platform.html')
@app.route('/save_project', methods=['POST'])
@login_required
def save_project():
    data = request.get_json(); project_name = data.get('project_name'); system_state = data.get('system_state')
    if not project_name or not system_state: return jsonify({"error": "Dados incompletos."}), 400
    new_project = Project(project_name=project_name, system_state_json=json.dumps(system_state), author=current_user)
    db.session.add(new_project); db.session.commit()
    return jsonify({"success": True, "message": "Projeto salvo com sucesso!", "project_id": new_project.id})
@app.route('/get_projects', methods=['GET'])
@login_required
def get_projects():
    projects = Project.query.filter_by(user_id=current_user.id).order_by(Project.project_name).all()
    return jsonify([{"id": p.id, "name": p.project_name} for p in projects])
@app.route('/load_project/<int:project_id>', methods=['GET'])
@login_required
def load_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=current_user.id).first()
    if project is None: return jsonify({"error": "Projeto não encontrado ou não autorizado."}), 404
    return jsonify(json.loads(project.system_state_json))

# (A classe AnalisadorDeSistema e as rotas de análise / otimização não precisam de alterações)

