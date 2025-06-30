import os
import json
import math
import itertools
from flask import Flask, jsonify, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

# --- CONFIGURAÇÃO INICIAL ---
app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SECRET_KEY'] = 'uma-chave-secreta-muito-segura-e-dificil-de-adivinhar' 
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'platform.db')
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

# --- ROTAS DE AUTENTICAÇÃO ---
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

# --- ROTAS DA API (DADOS DO USUÁRIO) ---
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
    if project is None:
        return jsonify({"error": "Projeto não encontrado ou não autorizado."}), 404
    return jsonify(json.loads(project.system_state_json))

# --- ROTAS DE ANÁLISE E OTIMIZAÇÃO (ainda no servidor) ---
class AnalisadorDeSistema:
    def __init__(self, sistema_json): self.componentes = sistema_json.get('components', []); self.resultados = {}
    def analisar(self):
        motor = self._find_component_by_type('motor'); polia_motora = self._find_component_by_type('polia_motora'); polia_movida = self._find_component_by_type('polia_movida'); rolamentos = self._find_components_by_type('rolamento')
        if not all([motor, polia_motora, polia_movida]): raise ValueError("Sistema incompleto. Faltam motor ou polias.")
        rpm_motor = float(motor['data'].get('rpm', 0)); power_kw = float(motor['data'].get('power_kw', 0)); motor_efficiency = float(motor['data'].get('efficiency', 95)) / 100; cost_per_kwh = float(motor['data'].get('cost_per_kwh', 0.75)); operating_hours_per_day = float(motor['data'].get('operating_hours', 8)); belt_type = polia_motora['data'].get('belt_type', 'V'); d_motora = float(polia_motora['data'].get('diameter', 0)); d_movida = float(polia_movida['data'].get('diameter', 0))
        relacao_transmissao = d_movida / d_motora if d_motora > 0 else 0; rpm_movida = rpm_motor / relacao_transmissao if relacao_transmissao > 0 else 0; power_watts = power_kw * 1000; torque_motor_nm = (power_watts * 60) / (2 * math.pi * rpm_motor) if rpm_motor > 0 else 0; forca_transmissao = torque_motor_nm / (d_motora / 2000) if d_motora > 0 else 0; tensao_total_na_correia = 2 * forca_transmissao
        transmission_efficiency_map = {'V': 0.96, 'sincronizadora': 0.98, 'plana': 0.97}; transmission_efficiency = transmission_efficiency_map.get(belt_type, 0.96); power_consumed_kw = power_kw / motor_efficiency if motor_efficiency > 0 else 0; power_lost_transmission_kw = power_kw * (1 - transmission_efficiency); annual_operating_hours = operating_hours_per_day * 365; annual_energy_consumption_kwh = power_consumed_kw * annual_operating_hours; annual_cost = annual_energy_consumption_kwh * cost_per_kwh
        self.resultados['financeiro_energetico'] = {'eficiencia_transmissao': f"{transmission_efficiency * 100:.1f}%", 'potencia_perdida_watts': round(power_lost_transmission_kw * 1000, 2), 'consumo_anual_kwh': round(annual_energy_consumption_kwh), 'custo_operacional_anual_brl': round(annual_cost)}
        if rolamentos:
            carga_radial_por_rolamento = tensao_total_na_correia / len(rolamentos) if rolamentos else 0
            for rolamento in rolamentos: self.resultados[rolamento['id']] = {'tipo': 'Rolamento', 'vida_util_l10h': round(self._calcular_vida_l10h(rolamento, carga_radial_por_rolamento, rpm_movida))}
        self.resultados['sistema'] = { 'relacao_transmissao': round(relacao_transmissao, 2), 'rpm_final': round(rpm_movida, 2) }; return self.resultados
    def _calcular_vida_l10h(self, r, cr, rpm):
        try: C = float(r['data']['dynamic_load_c']); P = cr; p = 3 if r['data']['bearing_type'] == 'esferas' else 10/3;
        except (KeyError, TypeError, ValueError): return 0
        if P <= 0 or rpm <= 0: return float('inf')
        return (10**6 / (60 * rpm)) * ((C / P)**p)
    def _find_component_by_type(self, t):
        for c in self.componentes:
            if c['type'] == t: return c
        return None
    def _find_components_by_type(self, t): return [c for c in self.componentes if c['type'] == t]

@app.route('/analyze_system', methods=['POST'])
def analyze_system_route():
    try: return jsonify(AnalisadorDeSistema(request.get_json()).analisar())
    except Exception as e: return jsonify({"error": str(e)}), 400

@app.route('/optimize_system', methods=['POST'])
def optimize_system_route():
    try:
        data = request.get_json(); base_system = data['system']; goal = data['goal']
        with open('database.json', 'r', encoding='utf-8') as f: db_file = json.load(f)
        p_opts = db_file['polias']['diametros_comerciais_mm']; b_opts = db_file['rolamentos']; solutions = []
        p_combos = list(itertools.product(p_opts, repeat=2)); b_combos = list(itertools.product(b_opts, repeat=2))
        total_combos = list(itertools.product(p_combos, b_combos))
        for p_combo, b_combo in total_combos[:1500]: # Limite para evitar timeouts
            cs = json.loads(json.dumps(base_system))
            # Garante que a estrutura do sistema seja a esperada antes de modificar
            if len(cs.get('components', [])) >= 5:
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

# --- INICIALIZAÇÃO DO SERVIDOR ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
