document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. REFERÊNCIAS AOS ELEMENTOS DO DOM ---
    const optimizeButton = document.getElementById('optimize-button');
    const optimizeModal = document.getElementById('optimize-modal');
    const optimizeForm = document.getElementById('optimize-form');
    const optimizeModalCloseBtn = document.getElementById('optimize-modal-close-btn');
    // ... (resto das referências da versão anterior)
    const library = document.getElementById('component-library');
    const workbench = document.getElementById('workbench-area');
    const analyzeButton = document.getElementById('analyze-button');
    const connectionCanvas = document.getElementById('connection-canvas');
    const resultsPanel = document.getElementById('results-panel');
    const resultsContent = document.getElementById('results-content');
    const modal = document.getElementById('component-modal');
    const modalForm = document.getElementById('modal-form');
    const modalFields = document.getElementById('modal-fields');
    const modalTitle = document.getElementById('modal-title');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    // --- 2. ESTADO DA APLICAÇÃO ---
    let systemState = { components: [], connections: [] };
    let componentCounter = 0;
    let currentEditingComponentId = null;
    let componentDatabase = {};
    let lastResults = {};

    // --- 3. INICIALIZAÇÃO ---
    try {
        const response = await fetch('/get_component_database');
        if (!response.ok) throw new Error('Falha na resposta do servidor.');
        componentDatabase = await response.json();
    } catch (error) { console.error("Erro ao carregar o banco de dados:", error); alert("Não foi possível carregar o banco de dados de componentes."); }

    // --- 4. LISTENERS DE EVENTOS PRINCIPAIS ---
    library.addEventListener('click', handleLibraryClick);
    analyzeButton.addEventListener('click', handleAnalyzeClick);
    generatePdfBtn.addEventListener('click', generatePDF);
    modalForm.addEventListener('submit', handleModalSubmit);
    modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
    optimizeButton.addEventListener('click', () => optimizeModal.classList.remove('hidden'));
    optimizeModalCloseBtn.addEventListener('click', () => optimizeModal.classList.add('hidden'));
    optimizeForm.addEventListener('submit', handleOptimizeSubmit);
    
    // --- 5. FUNÇÕES DE INTERAÇÃO COM A INTERFACE ---
    // (Cole aqui as funções handleLibraryClick, createComponent, e renderWorkbench da versão anterior)
    function handleLibraryClick(e) { if (e.target.classList.contains('add-btn')) { const type = e.target.dataset.type; const initialX = 50 + (systemState.components.length % 5) * 40; const initialY = 50 + (systemState.components.length % 5) * 40; createComponent(type, initialX, initialY); } }
    function createComponent(type, x, y) { componentCounter++; const id = `comp_${componentCounter}`; const newComponent = { id, type, x, y, data: {} }; systemState.components.push(newComponent); renderWorkbench(); openModalForComponent(id); }
    function renderWorkbench() { workbench.querySelectorAll('.placed-component').forEach(el => el.remove()); systemState.components.forEach(comp => { const el = document.createElement('div'); el.className = `placed-component ${comp.type}`; el.id = comp.id; el.style.left = `${comp.x}px`; el.style.top = `${comp.y}px`; if (comp.type.includes('polia') && comp.data.diameter) { const scaleFactor = 0.8; el.style.width = `${Math.max(40, parseFloat(comp.data.diameter) * scaleFactor)}px`; el.style.height = `${Math.max(40, parseFloat(comp.data.diameter) * scaleFactor)}px`; } const label = document.createElement('div'); label.className = 'component-label'; label.textContent = `${comp.type.replace(/_/g, ' ')} #${comp.id.split('_')[1]}`; el.appendChild(label); workbench.appendChild(el); el.addEventListener('click', (e) => { if (!el.classList.contains('dragging')) openModalForComponent(comp.id); }); el.addEventListener('mousedown', startDrag); el.addEventListener('touchstart', startDrag, { passive: false }); }); drawConnections(); }

    // --- 6. FUNÇÕES DE ARRASTAR (DRAG AND DROP) ---
    // (Cole aqui as funções startDrag, drag, e endDrag da versão anterior)
    let activeComponent = null; let offsetX = 0; let offsetY = 0; function startDrag(e) { e.preventDefault(); activeComponent = e.currentTarget; activeComponent.classList.add('dragging'); const rect = activeComponent.getBoundingClientRect(); const touch = e.type === 'touchstart' ? e.touches[0] : e; offsetX = touch.clientX - rect.left; offsetY = touch.clientY - rect.top; document.addEventListener('mousemove', drag); document.addEventListener('mouseup', endDrag); document.addEventListener('touchmove', drag, { passive: false }); document.addEventListener('touchend', endDrag); } function drag(e) { if (activeComponent) { e.preventDefault(); const touch = e.type === 'touchmove' ? e.touches[0] : e; const workbenchRect = workbench.getBoundingClientRect(); let newX = touch.clientX - workbenchRect.left - offsetX; let newY = touch.clientY - workbenchRect.top - offsetY; newX = Math.max(0, Math.min(newX, workbenchRect.width - activeComponent.offsetWidth)); newY = Math.max(0, Math.min(newY, workbenchRect.height - activeComponent.offsetHeight)); activeComponent.style.left = `${newX}px`; activeComponent.style.top = `${newY}px`; drawConnections(); } } function endDrag() { if (activeComponent) { const componentState = systemState.components.find(c => c.id === activeComponent.id); if (componentState) { componentState.x = parseFloat(activeComponent.style.left); componentState.y = parseFloat(activeComponent.style.top); } activeComponent.classList.remove('dragging'); activeComponent = null; document.removeEventListener('mousemove', drag); document.removeEventListener('mouseup', endDrag); document.removeEventListener('touchmove', drag); document.removeEventListener('touchend', endDrag); setTimeout(() => renderWorkbench(), 0); } }

    // --- 7. FUNÇÕES DO MODAL ---
    // (Cole aqui a função openModalForComponent e handleModalSubmit da versão anterior)
    function openModalForComponent(id) { currentEditingComponentId = id; const component = systemState.components.find(c => c.id === id); if (!component) return; modalTitle.textContent = `Configurar ${component.type.replace(/_/g, ' ')}`; let fieldsHtml = ''; const data = component.data; switch (component.type) { case 'motor': fieldsHtml = `<div class="input-group"><label>Potência (kW)</label><input type="number" step="any" name="power_kw" required value="${data.power_kw || ''}"></div><div class="input-group"><label>Rotação (RPM)</label><input type="number" step="any" name="rpm" required value="${data.rpm || ''}"></div><hr><div class="input-group"><label>Eficiência do Motor (%)</label><input type="number" step="any" name="efficiency" value="${data.efficiency || '95'}"></div><div class="input-group"><label>Custo Energia (R$/kWh)</label><input type="number" step="any" name="cost_per_kwh" value="${data.cost_per_kwh || '0.75'}"></div><div class="input-group"><label>Horas de Operação/Dia</label><input type="number" step="any" name="operating_hours" value="${data.operating_hours || '8'}"></div>`; break; case 'polia_motora': case 'polia_movida': fieldsHtml = `<div class="input-group"><label>Diâmetro (mm)</label><input type="number" name="diameter" required value="${data.diameter || ''}"></div>`; if (component.type === 'polia_motora') { fieldsHtml += `<div class="input-group"><label>Tipo de Correia</label><select name="belt_type"><option value="V" ${data.belt_type === 'V' ? 'selected' : ''}>Em V</option><option value="sincronizadora" ${data.belt_type === 'sincronizadora' ? 'selected' : ''}>Sincronizadora</option><option value="plana" ${data.belt_type === 'plana' ? 'selected' : ''}>Plana</option></select></div>`; } break; case 'rolamento': let options = (componentDatabase.rolamentos || []).map(r => `<option value="${r.modelo}" ${data.modelo === r.modelo ? 'selected' : ''}>${r.modelo}</option>`).join(''); fieldsHtml = `<div class="input-group"><label>Selecione o Modelo</label><select id="rolamento-modelo-select" name="modelo"><option value="">-- Escolha um modelo --</option>${options}</select></div><div class="input-group"><label>Tipo de Rolamento</label><input type="text" id="rolamento-tipo-input" name="bearing_type" readonly value="${data.bearing_type || ''}"></div><div class="input-group"><label>Carga Dinâmica C (N)</label><input type="number" id="rolamento-carga-c-input" name="dynamic_load_c" required readonly value="${data.dynamic_load_c || ''}"></div>`; break; } modalFields.innerHTML = fieldsHtml; const modeloSelect = document.getElementById('rolamento-modelo-select'); if (modeloSelect) { modeloSelect.addEventListener('change', (e) => { const selectedModelo = e.target.value; const rolamentoData = (componentDatabase.rolamentos || []).find(r => r.modelo === selectedModelo); const tipoInput = document.getElementById('rolamento-tipo-input'); const cargaCInput = document.getElementById('rolamento-carga-c-input'); if (rolamentoData) { tipoInput.value = rolamentoData.tipo; cargaCInput.value = rolamentoData.carga_c; } else { tipoInput.value = ''; cargaCInput.value = ''; } }); } modal.classList.remove('hidden'); }
    function handleModalSubmit(e) { e.preventDefault(); const formData = new FormData(modalForm); const component = systemState.components.find(c => c.id === currentEditingComponentId); if (component) { for (let [key, value] of formData.entries()) { component.data[key] = value; } } modal.classList.add('hidden'); renderWorkbench(); }

    // --- 8. FUNÇÕES DE ANÁLISE, OTIMIZAÇÃO E RESULTADOS ---
    async function handleAnalyzeClick() { if (systemState.components.length === 0) { alert("Bancada de trabalho vazia. Adicione componentes para analisar."); return; } const payload = { components: systemState.components, connections: [] }; try { const response = await fetch('/analyze_system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const results = await response.json(); if (results.error) { throw new Error(results.error); } lastResults = results; displayAnalysisResults(results); generatePdfBtn.classList.remove('hidden'); } catch (error) { resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro na análise:</strong> ${error.message}</div>`; resultsPanel.classList.remove('hidden'); } }
    async function handleOptimizeSubmit(e) {
        e.preventDefault();
        optimizeModal.classList.add('hidden');
        resultsContent.innerHTML = '<h3>Otimizando...</h3><p>Isso pode levar alguns segundos. Estamos testando centenas de combinações para você.</p>';
        resultsPanel.classList.remove('hidden');
        const goal = document.getElementById('optimization-goal').value;
        const payload = { system: { components: systemState.components }, goal: goal };
        try {
            const response = await fetch('/optimize_system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const solutions = await response.json();
            if (solutions.error) throw new Error(solutions.error);
            displayOptimizationResults(solutions, goal);
        } catch (error) { resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro na otimização:</strong> ${error.message}</div>`; }
    }
    function displayAnalysisResults(results) { /* ...código da versão anterior... */ }
    function displayOptimizationResults(solutions, goal) {
        let goalTitle = { cost: 'Menor Custo Anual', life: 'Maior Vida Útil', efficiency: 'Maior Eficiência' }[goal];
        let html = `<h2>Top 5 Soluções para: ${goalTitle}</h2>`;
        html += '<table style="width:100%; text-align:left; border-collapse: collapse;"><thead><tr><th style="border: 1px solid #ddd; padding: 8px;">Configuração</th><th style="border: 1px solid #ddd; padding: 8px;">Custo/Ano (R$)</th><th style="border: 1px solid #ddd; padding: 8px;">Vida Útil (h)</th><th style="border: 1px solid #ddd; padding: 8px;">Eficiência (%)</th></tr></thead><tbody>';
        solutions.forEach(sol => {
            html += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${sol.config}</td><td style="border: 1px solid #ddd; padding: 8px;">${sol.cost.toLocaleString('pt-BR')}</td><td style="border: 1px solid #ddd; padding: 8px;">${sol.min_life.toLocaleString('pt-BR')}</td><td style="border: 1px solid #ddd; padding: 8px;">${sol.efficiency.toFixed(1)}</td></tr>`;
        });
        html += '</tbody></table>';
        resultsContent.innerHTML = html;
        generatePdfBtn.classList.add('hidden');
    }

    // --- 9. FUNÇÕES DE DESENHO E PDF ---
    // (Cole aqui as funções drawConnections e generatePDF da versão anterior)
    function drawConnections() { /* ...código da versão anterior... */ }
    async function generatePDF() { /* ...código da versão anterior... */ }
});
