import math
import json
import itertools
from flask import Flask, jsonify, render_template, request

# Esta linha configura o Flask para usar as pastas 'templates' e 'static' por padrão
app = Flask(__name__)

class AnalisadorDeSistema:
    # --- A CLASSE COMPLETA ---
    def __init__(self, sistema_json): self.componentes = sistema_json['components']; self.resultados = {}
    def analisar(self):
        motor = self._find_component_by_type('motor'); polia_motora = self._find_component_by_type('polia_motora'); polia_movida = self._find_component_by_type('polia_movida'); rolamentos = self._find_components_by_type('rolamento')
        if not all([motor, polia_motora, polia_movida]): raise ValueError("Sistema incompleto.")
        rpm_motor = float(motor['data'].get('rpm', 0)); power_kw = float(motor['data'].get('power_kw', 0)); motor_efficiency = float(motor['data'].get('efficiency', 95)) / 100; cost_per_kwh = float(motor['data'].get('cost_per_kwh', 0.75)); operating_hours_per_day = float(motor['data'].get('operating_hours', 8)); belt_type = polia_motora['data'].get('belt_type', 'V'); d_motora = float(polia_motora['data'].get('diameter', 0)); d_movida = float(polia_movida['data'].get('diameter', 0))
        relacao_transmissao = d_movida / d_motora if d_motora > 0 else 0; rpm_movida = rpm_motor / relacao_transmissao if relacao_transmissao > 0 else 0; power_watts = power_kw * 1000; torque_motor_nm = (power_watts * 60) / (2 * math.pi * rpm_motor) if rpm_motor > 0 else 0; forca_transmissao = torque_motor_nm / (d_motora / 2000) if d_motora > 0 else 0; tensao_total_na_correia = 2 * forca_transmissao
        transmission_efficiency_map = {'V': 0.96, 'sincronizadora': 0.98, 'plana': 0.97}; transmission_efficiency = transmission_efficiency_map.get(belt_type, 0.96); power_consumed_kw = power_kw / motor_efficiency if motor_efficiency > 0 else 0; power_lost_transmission_kw = power_kw * (1 - transmission_efficiency); annual_operating_hours = operating_hours_per_day * 365; annual_energy_consumption_kwh = power_consumed_kw * annual_operating_hours; annual_cost = annual_energy_consumption_kwh * cost_per_kwh
        self.resultados['financeiro_energetico'] = {'eficiencia_transmissao': f"{transmission_efficiency * 100:.1f}%", 'potencia_perdida_watts': round(power_lost_transmission_kw * 1000, 2), 'consumo_anual_kwh': round(annual_energy_consumption_kwh), 'custo_operacional_anual_brl': round(annual_cost)}
        if rolamentos:
            carga_radial_por_rolamento = tensao_total_na_correia / len(rolamentos) if rolamentos else 0
            for rolamento in rolamentos: self.resultados[rolamento['id']] = {'tipo': 'Rolamento', 'vida_util_l10h': round(self._calcular_vida_l10h(rolamento, carga_radial_por_rolamento, rpm_movida))}
        self.resultados['sistema'] = { 'relacao_transmissao': round(relacao_transmissao, 2), 'rpm_final': round(rpm_movida, 2) }; return self.resultados
    def _calcular_vida_l10h(self, rolamento, carga_radial, rpm):
        try: C = float(rolamento['data']['dynamic_load_c']); P = carga_radial; p = 3 if rolamento['data']['bearing_type'] == 'esferas' else 10/3;
        except (KeyError, ValueError, ZeroDivisionError): return 0
        if P <= 0: return float('inf')
        return (10**6 / (60 * rpm)) * ((C / P)**p) if rpm > 0 else float('inf')
    def _find_component_by_type(self, tipo):
        for comp in self.componentes:
            if comp['type'] == tipo: return comp
        return None
    def _find_components_by_type(self, tipo): return [comp for comp in self.componentes if comp['type'] == tipo]

# Rota principal que renderiza o HTML da pasta /templates
@app.route('/')
def index():
    return render_template('index.html')

# Rotas da API que respondem ao JavaScript
@app.route('/get_component_database')
def get_database():
    try:
        with open('database.json', 'r', encoding='utf-8') as f: data = json.load(f)
        return jsonify(data)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/analyze_system', methods=['POST'])
def analyze_system_route():
    try:
        analisador = AnalisadorDeSistema(request.get_json())
        return jsonify(analisador.analisar())
    except Exception as e: return jsonify({"error": str(e)}), 400

@app.route('/optimize_system', methods=['POST'])
def optimize_system_route():
    try:
        data = request.get_json(); base_system = data['system']; goal = data['goal']
        with open('database.json', 'r', encoding='utf-8') as f: db = json.load(f)
        possible_pulleys = db['polias']['diametros_comerciais_mm']; possible_bearings = db['rolamentos']; solutions = []
        pulley_combinations = list(itertools.product(possible_pulleys, repeat=2)); bearing_combinations = list(itertools.product(possible_bearings, repeat=2))
        total_combinations = list(itertools.product(pulley_combinations, bearing_combinations))
        for p_combo, b_combo in total_combinations[:2000]: # Limite de iterações
            current_system = json.loads(json.dumps(base_system))
            if len(current_system['components']) >= 5:
                current_system['components'][1]['data']['diameter'] = p_combo[0]; current_system['components'][2]['data']['diameter'] = p_combo[1]
                current_system['components'][3]['data'] = {'modelo': b_combo[0]['modelo'], 'bearing_type': b_combo[0]['tipo'], 'dynamic_load_c': b_combo[0]['carga_c']}
                current_system['components'][4]['data'] = {'modelo': b_combo[1]['modelo'], 'bearing_type': b_combo[1]['tipo'], 'dynamic_load_c': b_combo[1]['carga_c']}
            else: continue
            analisador = AnalisadorDeSistema(current_system); results = analisador.analisar()
            cost = results.get('financeiro_energetico', {}).get('custo_operacional_anual_brl', 0)
            efficiency = float(results.get('financeiro_energetico', {}).get('eficiencia_transmissao', '0%').replace('%',''))
            lifespans = [v['vida_util_l10h'] for k,v in results.items() if k.startswith('comp_')]; min_life = min(lifespans) if lifespans else 0
            solutions.append({ "config": f"Polias {p_combo[0]}/{p_combo[1]} | Rolamentos {b_combo[0]['modelo']}/{b_combo[1]['modelo']}", "cost": cost, "efficiency": efficiency, "min_life": min_life })
        if goal == 'cost': solutions.sort(key=lambda x: x['cost'])
        elif goal == 'life': solutions.sort(key=lambda x: x['min_life'], reverse=True)
        elif goal == 'efficiency': solutions.sort(key=lambda x: x['efficiency'], reverse=True)
        return jsonify(solutions[:5])
    except Exception as e: return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)

