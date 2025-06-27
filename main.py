# Importa as bibliotecas necessárias
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import pytesseract
import fitz  # PyMuPDF
import docx
import io

# Inicializa a aplicação Flask
app = Flask(__name__)

# Habilita o CORS para permitir que seu site no github.io acesse esta API
CORS(app)

# --- FUNÇÕES DE PROCESSAMENTO DE ARQUIVOS ---

def processar_imagem_e_extrair_texto(arquivo_imagem_stream):
    try:
        imagem = Image.open(arquivo_imagem_stream)
        texto_extraido = pytesseract.image_to_string(imagem, lang='por')
        return texto_extraido if texto_extraido.strip() else "Não foi possível encontrar texto na imagem."
    except Exception as e:
        return f"Erro ao processar imagem: {e}"

def extrair_texto_de_pdf(arquivo_pdf):
    try:
        texto_completo = ""
        # Abre o PDF a partir do stream de bytes do arquivo
        with fitz.open(stream=arquivo_pdf.read(), filetype="pdf") as doc:
            for pagina in doc:
                texto_completo += pagina.get_text()
        return texto_completo if texto_completo.strip() else "Documento PDF vazio ou sem texto selecionável."
    except Exception as e:
        return f"Erro ao processar PDF: {e}"

def extrair_texto_de_docx(arquivo_docx):
    try:
        documento = docx.Document(io.BytesIO(arquivo_docx.read()))
        texto_completo = "\n".join([p.text for p in documento.paragraphs])
        return texto_completo if texto_completo.strip() else "Documento DOCX vazio."
    except Exception as e:
        return f"Erro ao processar DOCX: {e}"

def ler_arquivo_txt(arquivo_txt_stream):
    try:
        # Envolve o stream de bytes em um leitor de texto
        wrapper = io.TextIOWrapper(arquivo_txt_stream, encoding='utf-8')
        return wrapper.read()
    except Exception as e:
        return f"Erro ao ler arquivo TXT: {e}"

# --- ROTAS DA API ---

# Rota principal para verificar se o servidor está no ar
@app.route('/')
def index():
    return "API de Reconhecimento de Arquivos está no ar!"

# Rota de reconhecimento que o seu JavaScript vai chamar
@app.route('/reconhecer', methods=['POST'])
def upload_e_reconhecer():
    if 'file' not in request.files:
        return jsonify({'erro': 'Nenhum arquivo enviado'}), 400

    file = request.files['file']
    filename = file.filename.lower()
    
    conteudo_reconhecido = ""

    try:
        if filename.endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp')):
            conteudo_reconhecido = processar_imagem_e_extrair_texto(file.stream)
        elif filename.endswith('.pdf'):
            conteudo_reconhecido = extrair_texto_de_pdf(file)
        elif filename.endswith('.docx'):
            conteudo_reconhecido = extrair_texto_de_docx(file)
        elif filename.endswith('.txt'):
            conteudo_reconhecido = ler_arquivo_txt(file.stream)
        else:
            return jsonify({'erro': f"Tipo de arquivo '{filename.split('.')[-1]}' não suportado."}), 415
        
        return jsonify({'conteudo_extraido': conteudo_reconhecido})

    except Exception as e:
        return jsonify({'erro': f'Ocorreu um erro geral no servidor: {e}'}), 500

# Esta parte não é necessária no Render com Gunicorn, mas não atrapalha
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
