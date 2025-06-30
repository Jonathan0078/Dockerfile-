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
                rolamento.get('tipo', rolamento.get('bearing_type', 'esferas')) # Usa 'tipo' vindo do DB/input
            )
            resultados_componentes[f'comp_{i+1}'] = {
                'tipo': rolamento.get('tipo', rolamento.get('bearing_type', 'N/A')),
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
        print(f"ERRO ao carregar o banco de dados de componentes do DB: {e
