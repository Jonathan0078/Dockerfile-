document.addEventListener('DOMContentLoaded', () => {
  // Referências principais
  const saveBtn = document.getElementById('desktop-save-btn');
  const saveModal = document.getElementById('save-project-modal');
  const closeSaveModal = document.getElementById('save-modal-close-btn');

  const optimizeBtn = document.getElementById('desktop-settings-btn');
  const optimizeModal = document.getElementById('optimize-modal');
  const closeOptimizeModal = document.getElementById('optimize-modal-close-btn');

  const analyzeBtn = document.getElementById('desktop-analyze-btn');
  const resultsPanel = document.getElementById('results-panel');
  const generatePdfBtn = document.getElementById('generate-pdf-btn');

  const clearBtn = document.getElementById('desktop-clear-btn');

  const workbenchArea = document.getElementById('workbench-area');
  const resultsContent = document.getElementById('results-content');

  // ---------- MODAIS ----------

  saveBtn.addEventListener('click', () => {
    saveModal.classList.remove('hidden');
  });

  closeSaveModal.addEventListener('click', () => {
    saveModal.classList.add('hidden');
  });

  optimizeBtn.addEventListener('click', () => {
    optimizeModal.classList.remove('hidden');
  });

  closeOptimizeModal.addEventListener('click', () => {
    optimizeModal.classList.add('hidden');
  });

  // Fechar modais clicando fora da área modal
  [saveModal, optimizeModal].forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // ---------- FORMULÁRIOS ----------

  document.getElementById('save-project-form').addEventListener('submit', e => {
    e.preventDefault();
    const projectName = document.getElementById('project-name').value.trim();
    if (!projectName) {
      alert('Informe um nome para o projeto.');
      return;
    }
    // Simulação de salvar (pode ser adaptado para enviar ao backend)
    alert(`Projeto "${projectName}" salvo com sucesso!`);
    saveModal.classList.add('hidden');
  });

  document.getElementById('optimize-form').addEventListener('submit', e => {
    e.preventDefault();
    const goal = document.querySelector('input[name="goal"]:checked').value;
    alert(`Sistema otimizado para: ${goal}`);
    optimizeModal.classList.add('hidden');
  });

  // ---------- AÇÕES DOS BOTÕES ----------

  clearBtn.addEventListener('click', () => {
    // Remove todos os componentes colocados e limpa conexões
    workbenchArea.querySelectorAll('.placed-component').forEach(el => el.remove());
    resultsPanel.classList.add('hidden');
    resultsContent.innerHTML = '';
    generatePdfBtn.classList.add('hidden');
  });

  analyzeBtn.addEventListener('click', () => {
    // Simulação de análise
    if (workbenchArea.querySelectorAll('.placed-component').length === 0) {
      alert('Adicione componentes para analisar.');
      return;
    }

    resultsPanel.classList.remove('hidden');
    resultsContent.innerHTML = `
      <p>Componentes no sistema: ${workbenchArea.querySelectorAll('.placed-component').length}</p>
      <p>Análise básica realizada com sucesso.</p>
    `;
    generatePdfBtn.classList.remove('hidden');
  });

  // ---------- ADICIONAR COMPONENTES ----------

  document.querySelectorAll('.add-btn').forEach(button => {
    button.addEventListener('click', () => {
      const type = button.getAttribute('data-type');
      const el = document.createElement('div');
      el.className = `placed-component ${type}`;
      el.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      el.style.left = '50px';
      el.style.top = '50px';
      el.style.position = 'absolute';
      workbenchArea.appendChild(el);

      makeDraggable(el);
    });
  });

  // ---------- FUNÇÃO PARA DRAG & DROP ----------

  function makeDraggable(element) {
    let posX = 0, posY = 0, mouseX = 0, mouseY = 0;

    element.style.cursor = 'grab';

    element.addEventListener('mousedown', dragMouseDown);
    element.addEventListener('touchstart', dragTouchStart, {passive: false});

    function dragMouseDown(e) {
      e.preventDefault();
      mouseX = e.clientX;
      mouseY = e.clientY;

      document.addEventListener('mouseup', closeDragElement);
      document.addEventListener('mousemove', elementDrag);
      element.style.cursor = 'grabbing';
      element.style.zIndex = 1000;
    }

    function dragTouchStart(e) {
      e.preventDefault();
      const touch = e.touches[0];
      mouseX = touch.clientX;
      mouseY = touch.clientY;

      document.addEventListener('touchend', closeDragElement);
      document.addEventListener('touchmove', elementTouchDrag, {passive: false});
      element.style.cursor = 'grabbing';
      element.style.zIndex = 1000;
    }

    function elementDrag(e) {
      e.preventDefault();
      posX = mouseX - e.clientX;
      posY = mouseY - e.clientY;
      mouseX = e.clientX;
      mouseY = e.clientY;

      const left = element.offsetLeft - posX;
      const top = element.offsetTop - posY;

      element.style.left = left + "px";
      element.style.top = top + "px";
    }

    function elementTouchDrag(e) {
      e.preventDefault();
      const touch = e.touches[0];

      posX = mouseX - touch.clientX;
      posY = mouseY - touch.clientY;
      mouseX = touch.clientX;
      mouseY = touch.clientY;

      const left = element.offsetLeft - posX;
      const top = element.offsetTop - posY;

      element.style.left = left + "px";
      element.style.top = top + "px";
    }

    function closeDragElement() {
      document.removeEventListener('mouseup', closeDragElement);
      document.removeEventListener('mousemove', elementDrag);
      document.removeEventListener('touchend', closeDragElement);
      document.removeEventListener('touchmove', elementTouchDrag);
      element.style.cursor = 'grab';
      element.style.zIndex = '';
    }
  }

  // ---------- GERAR PDF ----------

  generatePdfBtn.addEventListener('click', () => {
    // Usa html2canvas e jsPDF para gerar PDF da área de resultados
    const content = resultsPanel;

    html2canvas(content).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('analise_sistema.pdf');
    });
  });
});
