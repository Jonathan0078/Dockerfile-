# Arquivo: main.py

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import google.generativeai as genai
from werkzeug.utils import secure_filename

# --- IMPORTAÇÃO DAS NOVAS BIBLIOTECAS PARA DOCUMENTOS ---
import fitz  # PyMuPDF para PDF
from docx import Document # para .docx
from pptx import Presentation # para .pptx

# --- CONFIGURAÇÃO INICIAL ---
app = Flask(__name__)
CORS(app)

# Pasta para salvar temporariamente os arquivos recebidos
UPLOAD_FOLDER = 'temp_uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- CONFIGURAÇÃO DA API DO GEMINI ---
try:
    gemini_api_key = os.environ.get('GEMINI_API_KEY')
    if not gemini_api_key:
        raise ValueError("A chave da API do Gemini não foi encontrada nas variáveis de ambiente.")
    genai.configure(api_key=gemini_api_key)
except Exception as e:
    print(f"ERRO DE CONFIGURAÇÃO: {e}")

# --- FUNÇÕES DE EXTRAÇÃO DE TEXTO E ANÁLISE DE IMAGEM ---

def analisar_imagem_com_gemini(arquivo_stream):
    """(SUA FUNÇÃO ATUAL) Envia uma imagem para a API do Gemini e pede uma descrição."""
    try:
        img = Image.open(arquivo_stream)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt_text = "Descreva esta imagem em detalhes. Se for um componente industrial como um rolamento, motor ou peça, explique o que é, sua função principal e possíveis causas de falha. Se não for um componente, apenas descreva o que você vê."
        response = model.generate_content([prompt_text, img])
        return response.text
    except Exception as e:
        print(f"ERRO AO CHAMAR A API DO GEMINI: {e}")
        return f"Ocorreu um erro ao tentar analisar a imagem com o Gemini: {str(e)}"

def extract_text_from_pdf(file_path):
    """(NOVO) Extrai texto de um arquivo PDF."""
    try:
        doc = fitz.open(file_path)
        text = "".join(page.get_text() for page in doc)
        doc.close()
        return text
    except Exception as e:
        return f"Erro ao processar PDF: {e}"

def extract_text_from_docx(file_path):
    """(NOVO) Extrai texto de um arquivo .docx."""
    try:
        doc = Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        return f"Erro ao processar DOCX: {e}"

def extract_text_from_pptx(file_path):
    """(NOVO) Extrai texto de um arquivo .pptx."""
    try:
        prs = Presentation(file_path)
        text = ""
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text += shape.text + "\n"
        return text
    except Exception as e:
        return f"Erro ao processar PPTX: {e}"

# --- ROTA DA API ATUALIZADA ---
# Esta rota agora é o "roteador" principal que decide qual função chamar.
@app.route('/reconhecer', methods=['POST'])
def upload_e_reconhecer():
    if 'file' not in request.files:
        return jsonify({'erro': 'Nenhum arquivo enviado'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'erro': 'Nome de arquivo vazio'}), 400

    filename = secure_filename(file.filename)
    file_extension = filename.rsplit('.', 1)[1].lower()
    
    conteudo_reconhecido = ""

    # --- LÓGICA DE ROTEAMENTO ---
    # Se for imagem, usa o Gemini
    if file_extension in ['png', 'jpg', 'jpeg']:
        conteudo_reconhecido = analisar_imagem_com_gemini(file.stream)
    
    # Se for um documento, salva temporariamente e usa a biblioteca local apropriada
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
            # Garante que o arquivo temporário seja sempre removido
            if os.path.exists(file_path):
                os.remove(file_path)
    else:
        # Resposta para outros tipos de arquivo
        conteudo_reconhecido = f"Este sistema está configurado para analisar imagens, PDFs, DOCX e PPTX, mas não arquivos do tipo '{file_extension}'."
    
    # Retorna o conteúdo extraído para o seu frontend
    return jsonify({'conteudo_extraido': conteudo_reconhecido})

# Rota principal para verificar se o servidor está no ar
@app.route('/')
def index():
    return "API da AEMI com análise de imagem e documentos está no ar!"

# --- INICIALIZAÇÃO DO APP ---
if __name__ == '__main__':
    # A porta é geralmente definida pelo ambiente de produção como o Render
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)

