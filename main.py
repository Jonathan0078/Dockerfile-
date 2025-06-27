# Arquivo: main.py

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import json

# --- Importação das Ferramentas e Bibliotecas ---
import google.generativeai as genai
from tavily import TavilyClient # Cliente da API de pesquisa na web
from PIL import Image # Para processar imagens
import fitz # PyMuPDF para PDF
from docx import Document # para .docx
from pptx import Presentation # para .pptx

# --- CONFIGURAÇÃO INICIAL ---
app = Flask(__name__)
CORS(app)

# Pasta para salvar temporariamente os arquivos de upload
UPLOAD_FOLDER = 'temp_uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- CONFIGURAÇÃO DAS APIS ---
# Carrega as chaves das variáveis de ambiente para segurança
try:
    gemini_api_key = os.environ.get('GEMINI_API_KEY')
    genai.configure(api_key=gemini_api_key)

    tavily_api_key = os.environ.get('TAVILY_API_KEY')
    tavily_client = TavilyClient(api_key=tavily_api_key)

    if not gemini_api_key or not tavily_api_key:
        raise ValueError("Uma ou mais chaves de API (GEMINI ou TAVILY) não foram encontradas.")

except Exception as e:
    print(f"ERRO CRÍTICO DE CONFIGURAÇÃO DE API: {e}")
    # Em um ambiente de produção, você pode querer sair do aplicativo
    # exit(1)

# --- DEFINIÇÃO DA FERRAMENTA DE PESQUISA WEB ---
def search_web(query: str):
    """
    Pesquisa na internet usando a API Tavily para obter informações em tempo real.
    Use esta ferramenta para responder perguntas sobre eventos atuais, notícias,
    ou quando precisar de informações que não estão no seu conhecimento interno.

    Args:
        query: O tópico ou pergunta a ser pesquisado.
    
    Returns:
        Uma lista de resultados de pesquisa relevantes para a consulta.
    """
    try:
        response = tavily_client.search(query=query, search_depth="advanced", max_results=5)
        return response.get('results', [])
    except Exception as e:
        print(f"Erro na ferramenta de pesquisa web: {e}")
        # Retorna uma string de erro para o modelo lidar com ela
        return f"Ocorreu um erro ao tentar pesquisar: {e}"

# --- INICIALIZAÇÃO DO MODELO GEMINI COM A FERRAMENTA ---
# Informamos ao modelo sobre a nossa ferramenta de pesquisa
model = genai.GenerativeModel(
    model_name='gemini-1.5-flash',
    tools=[search_web]
)
chat_session = model.start_chat()

# --- FUNÇÕES DE PROCESSAMENTO DE ARQUIVOS ---
def analisar_imagem_com_gemini(arquivo_stream):
    """Envia uma imagem para a API do Gemini e pede uma descrição."""
    try:
        img = Image.open(arquivo_stream)
        prompt_text = "Descreva esta imagem em detalhes. Se for um componente industrial como um rolamento, motor ou peça, explique o que é, sua função principal e possíveis causas de falha. Se não for um componente, apenas descreva o que você vê."
        response = model.generate_content([prompt_text, img])
        return response.text
    except Exception as e:
        return f"Ocorreu um erro ao tentar analisar a imagem: {e}"

def extract_text_from_pdf(file_path):
    """Extrai texto de um arquivo PDF."""
    try:
        doc = fitz.open(file_path)
        text = "".join(page.get_text() for page in doc)
        doc.close()
        return text
    except Exception as e:
        return f"Erro ao processar PDF: {e}"

def extract_text_from_docx(file_path):
    """Extrai texto de um arquivo .docx."""
    try:
        doc = Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        return f"Erro ao processar DOCX: {e}"

def extract_text_from_pptx(file_path):
    """Extrai texto de um arquivo .pptx."""
    try:
        prs = Presentation(file_path)
        text = "\n".join(shape.text for slide in prs.slides for shape in slide.shapes if hasattr(shape, "text"))
        return text
    except Exception as e:
        return f"Erro ao processar PPTX: {e}"

# --- ROTAS DA API ---

@app.route('/chat', methods=['POST'])
def handle_chat():
    """
    Rota para conversas de texto, com capacidade de pesquisa na web.
    Agora trata chamadas de ferramenta do Gemini para pesquisa na web.
    """
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'erro': 'Mensagem não encontrada'}), 400
    
    user_message = data['message']
    
    try:
        # Envia a mensagem para a sessão de chat
        response = chat_session.send_message(user_message)
        
        # Verifica se o modelo quer usar a ferramenta de pesquisa
        if hasattr(response.candidates[0].content.parts[0], 'function_call'):
            function_call = response.candidates[0].content.parts[0].function_call
            
            if function_call.name == 'search_web':
                # Obtém os argumentos para a pesquisa (a consulta)
                query = function_call.args.get('query')
                
                # Executa a pesquisa usando a ferramenta
                search_results = search_web(query)
                
                # Envia os resultados da pesquisa de volta para o modelo para que ele gere a resposta
                # É importante enviar os resultados formatados corretamente
                tool_response_part = genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name='search_web',
                        response={'results': search_results}
                    )
                )
                
                # Envia a resposta da ferramenta de volta para o modelo
                tool_response = chat_session.send_message(tool_response_part)
                
                # A resposta final será baseada nos resultados da pesquisa
                return jsonify({'response': tool_response.text})

        # Se não houver chamada de ferramenta, apenas retorna a resposta do modelo
        return jsonify({'response': response.text})

    except Exception as e:
        print(f"Erro na rota /chat: {e}")
        # Retorna uma mensagem de erro genérica para o front-end
        return jsonify({'erro': f"Ocorreu um erro no servidor: {e}"}), 500

@app.route('/reconhecer', methods=['POST'])
def upload_e_reconhecer():
    """Rota para upload e análise de arquivos (imagens, PDF, DOCX, PPTX)."""
    if 'file' not in request.files:
        return jsonify({'erro': 'Nenhum arquivo enviado'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'erro': 'Nome de arquivo vazio'}), 400

    filename = secure_filename(file.filename)
    file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    conteudo_reconhecido = ""

    if file_extension in ['png', 'jpg', 'jpeg', 'webp']:
        conteudo_reconhecido = analisar_imagem_com_gemini(file.stream)
    elif file_extension in ['pdf', 'docx', 'pptx']:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        try:
            if file_extension == 'pdf':
                conteudo_reconhecido = extract_text_from_pdf(file_path)
            elif file_extension == 'docx':
                conteudo_reconhecido = extract_text_from_docx(file_path)
            elif file_extension == 'pptx':
                conteudo_reconhecido = extract_text_from_pptx(file_path)
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)
    else:
        conteudo_reconhecido = f"Tipo de arquivo ('{file_extension}') não suportado. Por favor, envie um dos seguintes: png, jpg, pdf, docx, pptx."
    
    return jsonify({'conteudo_extraido': conteudo_reconhecido})

@app.route('/')
def index():
    """Rota principal para verificar se a API está online."""
    return "API da AEMI v1.0 com análise de arquivos e pesquisa na web está no ar!"

# --- INICIALIZAÇÃO DO SERVIDOR ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
