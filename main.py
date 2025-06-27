# Arquivo: main.py

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

# --- IMPORTAÇÃO DAS FERRAMENTAS ---
from tavily import TavilyClient # (NOVO) Cliente da API de pesquisa

# (Suas outras importações para arquivos continuam aqui)
from PIL import Image
import io
import fitz, from docx import Document, from pptx import Presentation
from werkzeug.utils import secure_filename


# --- CONFIGURAÇÃO INICIAL ---
app = Flask(__name__)
CORS(app)
# (Sua configuração de pasta de upload continua aqui)
UPLOAD_FOLDER = 'temp_uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- CONFIGURAÇÃO DAS APIS ---
try:
    # Chave da API do Gemini
    gemini_api_key = os.environ.get('GEMINI_API_KEY')
    genai.configure(api_key=gemini_api_key)

    # (NOVO) Chave da API do Tavily para a ferramenta de pesquisa
    tavily_api_key = os.environ.get('TAVILY_API_KEY')
    tavily_client = TavilyClient(api_key=tavily_api_key)

except Exception as e:
    print(f"ERRO DE CONFIGURAÇÃO DE API: {e}")

# --- DEFINIÇÃO DA FERRAMENTA DE PESQUISA ---
# Descrevemos a nossa função de pesquisa para que o Gemini saiba como usá-la.
def search_web(query: str):
    """
    Pesquisa na internet usando a API Tavily para obter informações em tempo real,
    notícias e fontes.

    Args:
        query: O tópico ou pergunta a ser pesquisado.
    
    Returns:
        Uma lista de resultados de pesquisa relevantes para a consulta.
    """
    try:
        response = tavily_client.search(query=query, search_depth="advanced")
        # Retorna os resultados de forma limpa para a IA
        return response['results']
    except Exception as e:
        print(f"Erro na pesquisa web: {e}")
        return f"Ocorreu um erro ao tentar pesquisar: {e}"

# --- MODELO GEMINI COM A FERRAMENTA ---
# Criamos o modelo e informamos a ele sobre a nossa ferramenta de pesquisa
model = genai.GenerativeModel(
    model_name='gemini-1.5-flash',
    tools=[search_web] # <-- AQUI ESTÁ A MÁGICA
)

# (Suas funções de extração de texto de PDF, DOCX, PPTX e Imagem continuam aqui, sem alterações)
def analisar_imagem_com_gemini(arquivo_stream):
    # ... seu código ...
def extract_text_from_pdf(file_path):
    # ... seu código ...
def extract_text_from_docx(file_path):
    # ... seu código ...
def extract_text_from_pptx(file_path):
    # ... seu código ...

# --- ROTA PARA CONVERSA DE TEXTO (NOVA/ATUALIZADA) ---
@app.route('/chat', methods=['POST'])
def handle_chat():
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'erro': 'Mensagem não encontrada no corpo da requisição'}), 400
    
    user_message = data['message']
    
    try:
        # Inicia a conversa com o histórico e a mensagem do usuário
        chat_session = model.start_chat()
        response = chat_session.send_message(user_message)

        # O Gemini pode responder diretamente ou pedir para usar a ferramenta.
        # Se ele usar a ferramenta, o próprio SDK do Google lida com a chamada
        # da função `search_web` e envia o resultado de volta para o modelo.
        # O resultado final em `response.text` já é a resposta completa.
        
        return jsonify({'response': response.text})

    except Exception as e:
        print(f"Erro na rota /chat: {e}")
        return jsonify({'erro': f"Ocorreu um erro no servidor: {e}"}), 500

# (Sua rota /reconhecer para upload de arquivos continua aqui, sem alterações)
@app.route('/reconhecer', methods=['POST'])
def upload_e_reconhecer():
    # ... todo o seu código da rota de reconhecimento ...
    # ... ele continuará funcionando da mesma forma ...
    return jsonify({'conteudo_extraido': conteudo_reconhecido})

# Rota principal para verificar se o servidor está no ar
@app.route('/')
def index():
    return "API da AEMI com análise de imagem, documentos e pesquisa na web está no ar!"

# --- INICIALIZAÇÃO DO APP ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
