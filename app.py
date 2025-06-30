import os
import json
import math
import itertools
from flask import Flask, jsonify, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

# --- CONFIGURAÇÃO INICIAL (sem alterações) ---
basedir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
app.config['SECRET_KEY'] = 'uma-chave-secreta-muito-segura-e-dificil-de-adivinhar' 
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'platform.db')
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
    def set_password(self, password): self.password_hash = generate_password_hash(password)
    def check_password(self, password): return check_password_hash(self.password_hash, password)

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_name = db.Column(db.String(150), nullable=False)
    system_state_json = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- ROTAS DE AUTENTICAÇÃO (sem alterações) ---
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

# --- ROTAS DA PLATAFORMA ---
@app.route('/')
def index():
    if current_user.is_authenticated: return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('platform.html')

# --- ROTAS DA API ---

# NOVA ROTA PARA SALVAR PROJETOS
@app.route('/save_project', methods=['POST'])
@login_required
def save_project():
    data = request.get_json()
    project_name = data.get('project_name')
    system_state = data.get('system_state')
    if not project_name or not system_state:
        return jsonify({"error": "Dados incompletos."}), 400
    
    new_project = Project(
        project_name=project_name,
        system_state_json=json.dumps(system_state),
        author=current_user
    )
    db.session.add(new_project)
    db.session.commit()
    return jsonify({"success": True, "message": "Projeto salvo com sucesso!", "project_id": new_project.id})

# NOVA ROTA PARA LISTAR PROJETOS
@app.route('/get_projects', methods=['GET'])
@login_required
def get_projects():
    projects = Project.query.filter_by(user_id=current_user.id).all()
    project_list = [{"id": p.id, "name": p.project_name} for p in projects]
    return jsonify(project_list)

# (Rotas de análise e otimização permanecem aqui)
@app.route('/get_component_database')
def get_component_database():
    try:
        with open('database.json', 'r', encoding='utf-8') as f: data = json.load(f)
        return jsonify(data)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/analyze_system', methods=['POST'])
def analyze_system_route():
    try: return jsonify(AnalisadorDeSistema(request.get_json()).analisar())
    except Exception as e: return jsonify({"error": str(e)}), 400

@app.route('/optimize_system', methods=['POST'])
def optimize_system_route():
    # A lógica de otimização permanece a mesma
    try:
        data = request.get_json(); base_system = data['system']; goal = data['goal']
        with open('database.json', 'r', encoding='utf-8') as f: db_file = json.load(f)
        p_opts = db_file['polias']['diametros_comerciais_mm']; b_opts = db_file['rolamentos']; solutions = []
        p_combos = list(itertools.product(p_opts, repeat=2)); b_combos = list(itertools.product(b_opts, repeat=2))
        total_combos = list(itertools.product(p_combos, b_combos))
        for p_combo, b_combo in total_combos[:1500]:
            cs = json.loads(json.dumps(base_system))
            if len(cs['components']) >= 5:
                cs['components'][1]['data']['diameter'] = p_combo[0]; cs['components'][2]['data']['diameter'] = p_combo[1]
                cs['components'][3]['data'] = {'modelo': b_combo[0]['modelo'], 'bearing_type': b_combo[0]['tipo'], 'dynamic_load_c': b_combo[0]['carga_c']}
                cs['components'][4]['data'] = {'modelo': b_combo[1]['modelo'], 'bearing_type': b_combo[1]['tipo'], 'dynamic_load_c': b_combo[1]['carga_c']}
            else: continue
            r = AnalisadorDeSistema(cs).analisar()
            cost = r.get('financeiro_energetico', {}).get('custo_operacional_anual_brl', 0)
            eff = float(r.get('financeiro_energetico', {}).get('eficiencia_transmissao', '0%').replace('%',''))
            lifespans = [v['vida_util_l10h'] for k,v in r.items() if k.startswith('comp_')]; min_life = min(lifespans) if lifespans else 0
            solutions.append({"config": f"P:{p_combo[0]}/{p_combo[1]} R:{b_combo[0]['modelo']}/{b_combo[1]['modelo']}", "cost": cost, "efficiency": eff, "min_life": min_life})
        if goal == 'cost': solutions.sort(key=lambda x: x['cost'])
        elif goal == 'life': solutions.sort(key=lambda x: x['min_life'], reverse=True)
        elif goal == 'efficiency': solutions.sort(key=lambda x: x['efficiency'], reverse=True)
        return jsonify(solutions[:5])
    except Exception as e: return jsonify({"error": str(e)}), 400


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
