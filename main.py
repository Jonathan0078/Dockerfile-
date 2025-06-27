# Arquivo: main.py

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import google.generativeai as genai

# --- CONFIGURAÇÃO INICIAL ---

# Inicializa a aplicação Flask
app = Flask(__name__)
# Habilita o CORS
CORS(app)

# --- CONFIGURAÇÃO DA API DO GEMINI ---
# Pega a chave da API a partir das variáveis de ambiente do Render.
# É mais seguro do que colocar a chave diretamente no código.
try:
    gemini_api_key = os.environ.get('GEMINI_API_KEY')
    if not gemini_api_key:
        raise ValueError("A chave da API do Gemini não foi encontrada nas variáveis de ambiente.")
    genai.configure(api_key=gemini_api_key)
except Exception as e:
    print(f"ERRO DE CONFIGURAÇÃO: {e}")


# --- FUNÇÃO PRINCIPAL DE ANÁLISE DE IMAGEM ---
def analisar_imagem_com_gemini(arquivo_stream):
    """
    Envia uma imagem para a API do Gemini e pede uma descrição.
    """
    try:
        # Carrega a imagem usando a biblioteca Pillow
        img = Image.open(arquivo_stream)

        # Seleciona o modelo do Gemini. 'gemini-1.5-flash' é rápido e ótimo para isso.
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Cria o "prompt": uma instrução e a imagem.
        # Estamos enviando uma lista com o texto e o objeto da imagem.
        prompt_text = "Descreva esta imagem em detalhes. Se for um componente industrial como um rolamento, motor ou peça, explique o que é, sua função principal e possíveis causas de falha. Se não for um componente, apenas descreva o que você vê."
        
        # Gera o conteúdo
        response = model.generate_content([prompt_text, img])

        # Retorna o texto da resposta do Gemini
        return response.text

    except Exception as e:
        print(f"ERRO AO CHAMAR A API DO GEMINI: {e}")
        # Retorna uma mensagem de erro clara para o frontend
        return f"Ocorreu um erro ao tentar analisar a imagem com o Gemini: {str(e)}"

# --- ROTA DA API ---
# Esta rota agora usa o Gemini para tudo que for imagem.
@app.route('/reconhecer', methods=['POST'])
def upload_e_reconhecer():
    if 'file' not in request.files:
        return jsonify({'erro': 'Nenhum arquivo enviado'}), 400

    file = request.files['file']
    filename = file.filename.lower()
    
    conteudo_reconhecido = ""

    # Verifica se é uma imagem
    if filename.endswith(('.png', '.jpg', '.jpeg')):
        conteudo_reconhecido = analisar_imagem_com_gemini(file.stream)
    else:
        # Resposta para outros tipos de arquivo
        conteudo_reconhecido = f"Este sistema está configurado para analisar imagens, não arquivos do tipo '{filename.split('.')[-1]}'."
    
    # Retorna a resposta do Gemini para o seu frontend
    return jsonify({'conteudo_extraido': conteudo_reconhecido})

# Rota principal para verificar se o servidor está no ar
@app.route('/')
def index():
    return "API da AEMI com análise de imagem via Gemini está no ar!"

# --- INICIALIZAÇÃO DO APP ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
