import math
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')

# --- O CÉREBRO DA PLATAFORMA ---
class AnalisadorDeSistema:
    def __init__(self, sistema_json):
        self.componentes = sistema_json['components']
        self.conexoes = sistema_json['connections']
        self.resultados = {}

    def analisar(self):
        # 1. Encontrar componentes chave
        motor = self._find_component_by_type('motor')
        polia_motora = self._find_component_by_type('polia_motora')
        polia_movida = self._find_component_by_type('polia_movida')
        rolamentos = self._find_components_by_type('rolamento')

        if not all([motor, polia_motora, polia_movida, rolamentos]):
            raise ValueError("Sistema incompleto. Verifique se todos os componentes necessários foram adicionados.")

        # 2. Cálculos em Cascata
        rpm_motor = float(motor['data']['rpm'])
        power_kw = float(motor['data']['power_kw'])
        
        d_motora = float(polia_motora['data']['diameter'])
        d_movida = float(polia_movida['data']['diameter'])

        # Relação de transmissão e RPM final
        relacao_transmissao = d_movida / d_motora
        rpm_movida = rpm_motor / relacao_transmissao
        
        # Cálculo de Torque e Tensão na Correia
        power_watts = power_kw * 1000
        torque_motor_nm = (power_watts * 60) / (2 * math.pi * rpm_motor) if rpm_motor > 0 else 0
        
        # T = F1+F2, e F1-F2 = Torque/(d/2). Simplificando com fator de serviço (aprox. F1=1.5*F_trans, F2=0.5*F_trans)
        # Tensão total nos eixos ≈ 2 * Força de Transmissão * Fator de Serviço (aprox 1.5)
        forca_transmissao = torque_motor_nm / (d_motora / 2000) if d_motora > 0 else 0
        tensao_total_na_correia = 2 * forca_transmissao 
        
        # 3. Análise de Vida Útil dos Rolamentos
        # Simplificação: A carga da tensão é distribuída igualmente entre os rolamentos do eixo movido.
        carga_radial_por_rolamento = tensao_total_na_correia / len(rolamentos)

        for rolamento in rolamentos:
            vida_util_l10h = self._calcular_vida_l10h(rolamento, carga_radial_por_rolamento, rpm_movida)
            rol_id = rolamento['id']
            self.resultados[rol_id] = {'tipo': 'Rolamento', 'vida_util_l10h': round(vida_util_l10h)}

        # 4. Consolidar resultados gerais
        self.resultados['sistema'] = {
            'relacao_transmissao': round(relacao_transmissao, 2),
            'rpm_final': round(rpm_movida, 2),
            'torque_motor_nm': round(torque_motor_nm, 2),
            'tensao_total_correia_N': round(tensao_total_na_correia, 2),
            'carga_radial_por_rolamento_N': round(carga_radial_por_rolamento, 2)
        }
        
        return self.resultados

    def _calcular_vida_l10h(self, rolamento, carga_radial, rpm):
        """ Calcula a vida útil L10h usando a fórmula ISO 281. """
        try:
            C = float(rolamento['data']['dynamic_load_c'])
            P = carga_radial  # Para carga puramente radial, P = Fr
            
            # Expoente 'p': 3 para esferas, 10/3 para rolos
            p = 3 if rolamento['data']['bearing_type'] == 'esferas' else 10/3

            if P <= 0: return float('inf') # Vida infinita se não há carga

            l10h = (10**6 / (60 * rpm)) * ((C / P)**p) if rpm > 0 else float('inf')
            return l10h
        except (KeyError, ValueError, ZeroDivisionError):
            return 0

    def _find_component_by_type(self, tipo):
        for comp in self.componentes:
            if comp['type'] == tipo:
                return comp
        return None

    def _find_components_by_type(self, tipo):
        return [comp for comp in self.componentes if comp['type'] == tipo]

# --- Rota da API ---
@app.route('/analyze_system', methods=['POST'])
def analyze_system_route():
    try:
        sistema_data = request.get_json()
        analisador = AnalisadorDeSistema(sistema_data)
        resultados = analisador.analisar()
        return jsonify(resultados)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# --- Rota para servir a página principal ---
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
