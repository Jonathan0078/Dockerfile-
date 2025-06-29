import math
from flask import Flask, request, jsonify, send_from_directory

# Inicializa o servidor web Flask
# A configuração 'static_folder' e 'static_url_path' garante que o Flask
# encontre os arquivos HTML, CSS e JS na mesma pasta.
app = Flask(__name__, static_folder='.', static_url_path='')

# --- A classe de cálculo de transmissão ---
class SistemaTransmissao:
    """
    Calcula parâmetros de um sistema de transmissão por polias e correias.
    """
    def __init__(self, d_motora: float, d_movida: float, rpm_motor: float, dist_centros: float, tipo_correia: str = 'V'):
        self.d_motora = d_motora
        self.d_movida = d_movida
        self.rpm_motor = rpm_motor
        self.dist_centros = dist_centros
        self.tipo_correia = tipo_correia
        
        if not all(isinstance(val, (int, float)) and val > 0 for val in [d_motora, d_movida, rpm_motor, dist_centros]):
            raise ValueError("Todos os valores numéricos devem ser positivos.")
        if dist_centros <= (d_motora + d_movida) / 2:
            raise ValueError("Distância entre centros muito pequena, as polias estão se sobrepondo.")

        self.relacao_transmissao = self.calcular_relacao_transmissao()
        self.rpm_movida = self.calcular_rotacao_transmitida()
        self.comprimento_correia = self.calcular_comprimento_correia()
        self.velocidade_correia_mps = self.calcular_velocidade_correia()
        self.arco_contato_graus = self.calcular_arco_contato()

    def calcular_relacao_transmissao(self):
        return self.d_movida / self.d_motora

    def calcular_rotacao_transmitida(self):
        relacao = self.relacao_transmissao
        rpm_teorico = self.rpm_motor / relacao
        
        if self.tipo_correia.upper() == 'V':
            escorregamento = 0.015
            return rpm_teorico * (1 - escorregamento)
        else:
            return rpm_teorico

    def calcular_comprimento_correia(self):
        termo1 = 2 * self.dist_centros
        termo2 = math.pi * (self.d_movida + self.d_motora) / 2
        termo3 = (self.d_movida - self.d_motora)**2 / (4 * self.dist_centros)
        return termo1 + termo2 + termo3
        
    def calcular_velocidade_correia(self):
        return (math.pi * self.d_motora * self.rpm_motor) / 60000

    def calcular_arco_contato(self):
        try:
            ratio = (self.d_movida - self.d_motora) / (2 * self.dist_centros)
            if not -1 <= ratio <= 1:
                return 0
            radianos = math.pi - 2 * math.asin(ratio)
            return math.degrees(radianos)
        except (ValueError, TypeError):
            return 0

    def to_dict(self):
        """Converte os resultados da classe em um dicionário para ser enviado como JSON."""
        return {
            'relacao_transmissao': self.relacao_transmissao,
            'rpm_movida': self.rpm_movida,
            'comprimento_correia': self.comprimento_correia,
            'velocidade_correia_mps': self.velocidade_correia_mps,
            'arco_contato_graus': self.arco_contato_graus
        }

# --- Rota da API que o JavaScript vai chamar ---
@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        data = request.get_json()
        required_keys = ['d_motora', 'd_movida', 'rpm_motor', 'dist_centros', 'tipo_correia']
        if not all(key in data for key in required_keys):
            return jsonify({'error': 'Dados de entrada incompletos'}), 400

        sistema = SistemaTransmissao(
            d_motora=float(data['d_motora']),
            d_movida=float(data['d_movida']),
            rpm_motor=float(data['rpm_motor']),
            dist_centros=float(data['dist_centros']),
            tipo_correia=data['tipo_correia']
        )
        
        return jsonify(sistema.to_dict())
    except (ValueError, TypeError) as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Ocorreu um erro interno no servidor: {e}'}), 500

# --- Rota para servir a página principal (index.html) ---
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
