import os
import json
import math
import itertools
from flask import Flask, jsonify, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS # Importante para CORS se o frontend estiver em outro domínio


# --- CONFIGURAÇÃO E CRIAÇÃO DA APP ---
app = Flask(__name__)

# Pega a URL do banco de dados do ambiente do Render
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("FATAL: A variável de ambiente DATABASE_URL não foi encontrada. Certifique-se de configurá-la no Render.")
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///platform.db' # Fallback para SQLite local
else:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'uma-chave-secreta-muito-segura')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

CORS(app) # Habilita CORS para sua aplicação. Ajuste 'origins' se precisar de mais segurança.


# --- MODELOS DO BANCO DE DADOS (NOVOS E EXISTENTES) ---

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

# NOVO MODELO: Tabela para Rolamentos (substitui parte do database.json)
class Rolamento(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    modelo = db.Column(db.String(100), unique=True, nullable=False)
    tipo = db.Column(db.String(100), nullable=False)
    carga_c = db.Column(db.Float, nullable=False) # Carga dinâmica em Float

    def to_dict(self):
        # Método para converter o objeto Rolamento em um dicionário, útil para jsonify
        return {
            "modelo": self.modelo,
            "tipo": self.tipo,
            "carga_c": self.carga_c
        }

# NOVO MODELO: Tabela para Diâmetros Comerciais de Polias (substitui parte do database.json)
class PoliaDiametro(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    diametro_mm = db.Column(db.Float, unique=True, nullable=False)

    def to_dict(self):
        return {"diametro_mm": self.diametro_mm}


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# --- LÓGICA DE CÁLCULO E ANÁLISE ---
class AnalisadorDeSistema:
    def __init__(self, system_data):
        self.system = system_data
        self.motor = self._get_component('motor')
        self.polia_motora = self._get_component('polia_motora')
        self.polia_movida = self._get_component('polia_movida')
        self.rolamentos = self._get_components('rolamento')

    def _get_component(self, comp_type):
        return next((c['data'] for c in self.system['components'] if c['type'] == comp_type), None)

    def _get_components(self, comp_type):
        return [c['data'] for c in self.system['components'] if c['type'] == comp_type]

    def _calcular_carga_radial(self, potencia_kw, rpm_motor, diametro_polia_mm, tipo_correia):
        potencia_w = potencia_kw * 1000
        velocidade_linear_ms = (math.pi * diametro_polia_mm / 1000) * (rpm_motor / 60)
        
        if velocidade_linear_ms == 0:
            return 0
            
        forca_tangencial_n = potencia_w / velocidade_linear_ms
        
        if tipo_correia == 'V':
            fator_correia = 1.5
        elif tipo_correia == 'sincronizadora':
            fator_correia = 1.1
        else:
            fator_correia = 2.0
            
        carga_radial_n = forca_tangencial_n * fator_correia
        return carga_radial_n

    def _calcular_vida_util_rolamento(self, carga_dinamica_c, carga_equivalente_p, rpm, tipo):
        if carga_equivalente_p == 0:
            return float('inf')

        fator_vida_l = 10**6
        
        if tipo.lower() == 'esferas':
            a = 3
        else:
            a = 10/3
        
        vida_milhoes_rev = (carga_dinamica_c / carga_equivalente_p)**a
        vida_horas = (vida_milhoes_rev * fator_vida_l) / (rpm * 60)
        return vida_horas

    def analisar(self):
        if not self.motor or not self.polia_motora or not self.polia_movida or not self.rolamentos:
            raise ValueError("Dados de componentes incompletos para análise. Certifique-se de adicionar Motor, Polias e Rolamentos.")

        rpm_motor = float(self.motor.get('rpm', 0))
        diametro_polia_motora = float(self.polia_motora.get('diameter', 1))
        diametro_polia_movida = float(self.polia_movida.get('diameter', 1))

        if diametro_polia_movida == 0: raise ValueError("Diâmetro da polia movida não pode ser zero.")
        rpm_saida = (rpm_motor * diametro_polia_motora) / diametro_polia_movida
        
        potencia_kw = float(self.motor.get('power_kw', 0))
        tipo_correia = self.polia_motora.get('belt_type', 'V')
        
        carga_radial_n = self._calcular_carga_radial(potencia_kw, rpm_motor, diametro_polia_motora, tipo_correia)
        
        resultados_componentes = {}
        for i, rolamento in enumerate(self.rolamentos):
            carga_equivalente_p = carga_radial_n / 2
            vida_util_l10h = self._calcular_vida_util_rolamento(
                float(rolamento.get('dynamic_load_c', 1)), 
                carga_equivalente_p, 
                rpm_saida, 
                rolamento.get('bearing_type', 'esferas')
            )
            resultados_componentes[f'comp_{i+1}'] = {
                'tipo': rolamento.get('tipo', rolamento.get('bearing_type', 'N/A')), # Prioriza 'tipo' do DB, fallback 'bearing_type' do input
                'modelo': rolamento.get('modelo', 'N/A'),
                'carga_radial_n': round(carga_radial_n, 2),
                'vida_util_l10h': round(vida_util_l10h, 2)
            }
            
        eficiencia_transmissao = 0.95 if tipo_correia == 'V' else 0.98
        potencia_saida_kw = potencia_kw * eficiencia_transmissao
        potencia_perdida_watts = potencia_kw * 1000 * (1 - eficiencia_transmissao)
        
        horas_operacao_dia = float(self.motor.get('operating_hours', 8))
        dias_operacao_ano = 260
        
        consumo_anual_kwh = (potencia_kw * horas_operacao_dia * dias_operacao_ano)
        custo_energia_kwh = float(self.motor.get('cost_per_kwh', 0.75))
        custo_operacional_anual_brl = consumo_anual_kwh * custo_energia_kwh
            
        return {
            'sistema': {
                'Relacao de Transmissao': round(diametro_polia_movida / diametro_polia_motora, 2),
                'RPM da Polia Movida': round(rpm_saida, 2),
                'Carga Radial no Eixo (N)': round(carga_radial_n, 2),
                'Potencia de Saida (kW)': round(potencia_saida_kw, 2),
                'Componentes no Sistema': len(self.system['components'])
            },
            'financeiro_energetico': {
                'eficiencia_transmissao': f'{eficiencia_transmissao * 100}%',
                'potencia_perdida_watts': round(potencia_perdida_watts, 2),
                'consumo_anual_kwh': round(consumo_anual_kwh, 2),
                'custo_operacional_anual_brl': round(custo_operacional_anual_brl, 2)
            },
            **resultados_componentes
        }

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
    
@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('platform.html')

# --- ROTAS DA API (AGORA CONSULTANDO O BANCO DE DADOS) ---

# ROTA PARA CARREGAR O BANCO DE DADOS DE COMPONENTES (MODIFICADA)
@app.route('/get_component_database')
def get_component_database():
    try:
        # Busca rolamentos do DB
        rolamentos_db = Rolamento.query.all()
        rolamentos_list = [r.to_dict() for r in rolamentos_db]

        # Busca diâmetros de polia do DB
        polias_diametros_db = PoliaDiametro.query.order_by(PoliaDiametro.diametro_mm).all()
        polias_diametros_list = [p.diametro_mm for p in polias_diametros_db]
        
        return jsonify({
            "rolamentos": rolamentos_list,
            "polias": {"diametros_comerciais_mm": polias_diametros_list}
        })
    except Exception as e:
        print(f"ERRO ao carregar o banco de dados de componentes do DB: {e}")
        return jsonify({"error": str(e)}), 500

# ROTA PARA SALVAR PROJETOS
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

# ROTA PARA LISTAR PROJETOS
@app.route('/get_projects', methods=['GET'])
@login_required
def get_projects():
    projects = Project.query.filter_by(user_id=current_user.id).all()
    project_list = [{"id": p.id, "name": p.project_name} for p in projects]
    return jsonify(project_list)

# ROTA DE ANÁLISE
@app.route('/analyze_system', methods=['POST'])
def analyze_system_route():
    try:
        return jsonify(AnalisadorDeSistema(request.get_json()).analisar())
    except Exception as e:
        print(f"Erro na rota de análise: {e}")
        return jsonify({"error": str(e)}), 400

# ROTA DE OTIMIZAÇÃO (MODIFICADA)
@app.route('/optimize_system', methods=['POST'])
def optimize_system_route():
    try:
        data = request.get_json(); base_system = data['system']; goal = data['goal']
        
        # Agora busca rolamentos e diâmetros de polias do DB
        p_opts_db = PoliaDiametro.query.order_by(PoliaDiametro.diametro_mm).all()
        p_opts = [p.diametro_mm for p in p_opts_db] # Lista de diâmetros de polia do DB

        b_opts_db = Rolamento.query.all()
        b_opts = [b.to_dict() for b in b_opts_db] # Lista de rolamentos do DB

        solutions = []
        p_combos = list(itertools.product(p_opts, repeat=2)); 
        b_combos = list(itertools.product(b_opts, repeat=2))
        total_combos = list(itertools.product(p_combos, b_combos))
        
        # Limita o número de combinações para performance, especialmente com um DB grande
        for p_combo, b_combo in total_combos[:1500]: 
            cs = json.loads(json.dumps(base_system))
            if len(cs['components']) >= 5: # Assume motor (0), polia1 (1), polia2 (2), rolamento1 (3), rolamento2 (4)
                cs['components'][1]['data']['diameter'] = p_combo[0]
                cs['components'][2]['data']['diameter'] = p_combo[1]
                cs['components'][3]['data'] = {'modelo': b_combo[0]['modelo'], 'tipo': b_combo[0]['tipo'], 'carga_c': b_combo[0]['carga_c']} # Usar 'tipo' do DB
                cs['components'][4]['data'] = {'modelo': b_combo[1]['modelo'], 'tipo': b_combo[1]['tipo'], 'carga_c': b_combo[1]['carga_c']} # Usar 'tipo' do DB
            else: continue
            
            try:
                r = AnalisadorDeSistema(cs).analisar()
                cost = r.get('financeiro_energetico', {}).get('custo_operacional_anual_brl', 0)
                eff = float(r.get('financeiro_energetico', {}).get('eficiencia_transmissao', '0%').replace('%',''))
                lifespans = [v['vida_util_l10h'] for k,v in r.items() if k.startswith('comp_')]; min_life = min(lifespans) if lifespans else 0
                solutions.append({"config": f"P:{p_combo[0]}/{p_combo[1]} R:{b_combo[0]['modelo']}/{b_combo[1]['modelo']}", "cost": cost, "efficiency": eff, "min_life": min_life})
            except ValueError as ve:
                print(f"Erro de validação na simulação de otimização: {ve}")
                continue 
            except Exception as e:
                print(f"Erro inesperado na simulação de otimização: {e}")
                continue

        if goal == 'cost': solutions.sort(key=lambda x: x['cost'])
        elif goal == 'life': solutions.sort(key=lambda x: x['min_life'], reverse=True)
        elif goal == 'efficiency': solutions.sort(key=lambda x: x['efficiency'], reverse=True)
        return jsonify(solutions[:5])
    except Exception as e: 
        print(f"ERRO na rota de otimização: {e}")
        return jsonify({"error": str(e)}), 400


# --- FASE 2: COMANDO PARA POPULAR O BANCO DE DADOS (PARA EXECUTAR UMA VEZ) ---
# Você vai executar este comando APÓS implantar o app.py no Render pela primeira vez
# e após o Render ter criado as tabelas no PostgreSQL.
@app.cli.command("populate-db")
def populate_db_command():
    """Popula o banco de dados com dados iniciais do database.json."""
    with app.app_context():
        print("Iniciando população do banco de dados com rolamentos e polias...")
        
        # Verifica se já existem rolamentos para evitar duplicatas em execuções futuras
        if Rolamento.query.first():
            print("Rolamentos já existem no banco de dados. Pulando população para evitar duplicatas.")
            # Você pode adicionar um prompt para confirmar se quer limpar e repopular
            # response = input("Rolamentos já existem. Deseja limpar e repopular? (sim/nao): ")
            # if response.lower() == 'sim':
            #     db.session.query(Rolamento).delete()
            #     db.session.query(PoliaDiametro).delete()
            #     db.session.commit()
            #     print("Tabelas limpas. Repopulando...")
            # else:
            #     return

        if PoliaDiametro.query.first():
            print("Diâmetros de polias já existem. Pulando população para evitar duplicatas.")
            return # Sai se os dados já estão lá

        try:
            # Caminho para o seu database.json
            database_path = os.path.join(app.root_path, 'database.json')
            with open(database_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Popula Rolamentos
            rolamentos_data = data.get('rolamentos', [])
            for r_data in rolamentos_data:
                # Verifica se o modelo já existe antes de adicionar
                existing_rolamento = Rolamento.query.filter_by(modelo=r_data['modelo']).first()
                if not existing_rolamento:
                    rolamento = Rolamento(
                        modelo=r_data['modelo'],
                        tipo=r_data['tipo'],
                        carga_c=r_data['carga_c']
                    )
                    db.session.add(rolamento)
            print(f"Adicionados {len(rolamentos_data)} rolamentos (ou ignorados existentes).")

            # Popula Diâmetros de Polias
            polias_diametros = data.get('polias', {}).get('diametros_comerciais_mm', [])
            for d_mm in polias_diametros:
                # Verifica se o diâmetro já existe antes de adicionar
                existing_diametro = PoliaDiametro.query.filter_by(diametro_mm=d_mm).first()
                if not existing_diametro:
                    polia_diam = PoliaDiametro(diametro_mm=d_mm)
                    db.session.add(polia_diam)
            print(f"Adicionados {len(polias_diametros)} diâmetros de polia (ou ignorados existentes).")

            db.session.commit()
            print("População do banco de dados concluída com sucesso.")

        except FileNotFoundError:
            print(f"ERRO: database.json não encontrado em {database_path}. Não foi possível popular o DB.")
        except json.JSONDecodeError as e:
            print(f"ERRO: Formato inválido no database.json: {e}. Verifique a sintaxe JSON.")
        except Exception as e:
            db.session.rollback()
            print(f"ERRO inesperado durante a população do DB: {e}")


# --- INICIALIZAÇÃO DO SERVIDOR ---
if __name__ == '__main__':
    with app.app_context():
        inspector = inspect(db.engine)
        # Verifica se a tabela 'user' (ou qualquer outra de seus modelos) já existe
        if not inspector.has_table("user"): # Verifica uma tabela existente para decidir se cria todas
            print("Tabelas não encontradas, criando esquema do banco de dados (User, Project, Rolamento, PoliaDiametro)...")
            db.create_all()
            print("Banco de dados e tabelas criados com sucesso.")
        else:
            print("Tabelas já existem, pulando a criação.")
    
    app.run(debug=True)
