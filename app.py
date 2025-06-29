import math
import json # Importa a biblioteca para trabalhar com JSON
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')

# --- O CÉREBRO DA PLATAFORMA (classe AnalisadorDeSistema inalterada) ---
class AnalisadorDeSistema:
    def __init__(self, sistema_json):
        self.componentes = sistema_json['components']
        self.resultados = {}
    
    def analisar(self):
        # ... (todo o código da função analisar da versão anterior está aqui, sem nenhuma alteração)
        motor = self._find_component_by_type('motor')
        polia_motora = self._find_component_by_type('polia_motora')
        polia_movida = self._find_component_by_type('polia_movida')
        rolamentos = self._find_components_by_type('rolamento')

        if not all([motor, polia_motora, polia_movida]):
            raise ValueError("Sistema incompleto. Adicione no mínimo um motor e duas polias.")

        rpm_motor = float(motor['data']['rpm'])
        power_kw = float(motor['data']['power_kw'])
        motor_efficiency = float(motor['data'].get('efficiency', 95)) / 100
        cost_per_kwh = float(motor['data'].get('cost_per_kwh', 0.75))
        operating_hours_per_day = float(motor['data'].get('operating_hours', 8))
        belt_type = polia_motora['data'].get('belt_type', 'V')
        d_motora = float(polia_motora['data']['diameter'])
        d_movida = float(polia_movida['data']['diameter'])
        relacao_transmissao = d_movida / d_motora if d_motora > 0 else 0
        rpm_movida = rpm_motor / relacao_transmissao if relacao_transmissao > 0 else 0
        power_watts = power_kw * 1000
        torque_motor_nm = (power_watts * 60) / (2 * math.pi * rpm_motor) if rpm_motor > 0 else 0
        forca_transmissao = torque_motor_nm / (d_motora / 2000) if d_motora > 0 else 0
        tensao_total_na_correia = 2 * forca_transmissao
        transmission_efficiency_map = {'V': 0.96, 'sincronizadora': 0.98, 'plana': 0.97}
        transmission_efficiency = transmission_efficiency_map.get(belt_type, 0.96)
        power_consumed_kw = power_kw / motor_efficiency if motor_efficiency > 0 else 0
        power_lost_transmission_kw = power_kw * (1 - transmission_efficiency)
        annual_operating_hours = operating_hours_per_day * 365
        annual_energy_consumption_kwh = power_consumed_kw * annual_operating_hours
        annual_cost = annual_energy_consumption_kwh * cost_per_kwh

        self.resultados['financeiro_energetico'] = {
            'eficiencia_transmissao': f"{transmission_efficiency * 100:.1f}%",
            'potencia_perdida_watts': round(power_lost_transmission_kw * 1000, 2),
            'consumo_anual_kwh': round(annual_energy_consumption_kwh),
            'custo_operacional_anual_brl': round(annual_cost)
        }
        if rolamentos:
            carga_radial_por_rolamento = tensao_total_na_correia / len(rolamentos)
            for rolamento in rolamentos:
                vida_util_l10h = self._calcular_vida_l10h(rolamento, carga_radial_por_rolamento, rpm_movida)
                self.resultados[rolamento['id']] = {'tipo': 'Rolamento', 'vida_util_l10h': round(vida_util_l10h)}

        self.resultados['sistema'] = { 'relacao_transmissao': round(relacao_transmissao, 2), 'rpm_final': round(rpm_movida, 2) }
        return self.resultados

    def _calcular_vida_l10h(self, rolamento, carga_radial, rpm):
        # ... (código inalterado)
        try: C = float(rolamento['data']['dynamic_load_c']); P = carga_radial; p = 3 if rolamento['data']['bearing_type'] == 'esferas' else 10/3;
        except (KeyError, ValueError, ZeroDivisionError): return 0
        if P <= 0: return float('inf')
        return (10**6 / (60 * rpm)) * ((C / P)**p) if rpm > 0 else float('inf')

    def _find_component_by_type(self, tipo):
        for comp in self.componentes:
            if comp['type'] == tipo: return comp
        return None

    def _find_components_by_type(self, tipo):
        return [comp for comp in self.componentes if comp['type'] == tipo]

# --- NOVA ROTA PARA BUSCAR DADOS DO BANCO ---
@app.route('/get_component_database')
def get_database():
    try:
        with open('database.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "Arquivo de banco de dados não encontrado."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Rotas Anteriores (inalteradas) ---
@app.route('/analyze_system', methods=['POST'])
def analyze_system_route():
    try:
        analisador = AnalisadorDeSistema(request.get_json())
        return jsonify(analisador.analisar())
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)

