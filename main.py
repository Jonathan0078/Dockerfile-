# Arquivo: main.py

from flask import Flask, request, jsonify
from PIL import Image
import pytesseract
import fitz  # PyMuPDF
import docx
import io

app = Flask(__name__)

# ... (cole aqui todas as funções de processamento de arquivos) ...
# processar_imagem_e_extrair_texto(stream)
# extrair_texto_de_pdf(arquivo)
# extrair_texto_de_docx(arquivo)
# ler_arquivo_txt(stream)

@app.route('/reconhecer', methods=['POST'])
def upload_e_reconhecer():
    if 'file' not in request.files:
        return jsonify({'erro': 'Nenhum arquivo enviado'}), 400

    file = request.files['file']
    filename = file.filename.lower()
    conteudo_reconhecido = ""

    try:
        if filename.endswith(('.png', '.jpg', '.jpeg')):
            conteudo_reconhecido = processar_imagem_e_extrair_texto(file.stream)
        elif filename.endswith('.pdf'):
            conteudo_reconhecido = extrair_texto_de_pdf(file)
        elif filename.endswith('.docx'):
            conteudo_reconhecido = extrair_texto_de_docx(file)
        elif filename.endswith('.txt'):
            conteudo_reconhecido = ler_arquivo_txt(file.stream)
        else:
            return jsonify({'erro': f"Tipo de arquivo '{filename.split('.')[-1]}' não suportado."}), 415
        
        # Aqui você passa o texto extraído para a sua IA (AIME)
        return jsonify({'conteudo_extraido': conteudo_reconhecido})

    except Exception as e:
        return jsonify({'erro': f'Ocorreu um erro geral no servidor: {e}'}), 500

@app.route('/')
def index():
    return "API da AIME com reconhecimento de arquivos está no ar!"

# A linha abaixo não é estritamente necessária quando se usa gunicorn,
# mas não atrapalha e permite testes locais.
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
  
