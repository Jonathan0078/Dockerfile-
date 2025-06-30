const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. REFERÊNCIAS A TODOS OS ELEMENTOS DO DOM ---
    const library = document.getElementById('component-library');
    const workbench = document.getElementById('workbench-area');
    const connectionCanvas = document.getElementById('connection-canvas');
    const resultsPanel = document.getElementById('results-panel');
    const resultsContent = document.getElementById('results-content');
    
    // Botões de Ação
    const analyzeButtons = document.querySelectorAll('#analyze-button');
    const optimizeButtons = document.querySelectorAll('#optimize-button');
    const clearButtons = document.querySelectorAll('#clear-button');
    const saveButtons = document.querySelectorAll('#save-button');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    // Modal de Componentes
    const modal = document.getElementById('component-modal');
    const modalForm = document.getElementById('modal-form');
    const modalFields = document.getElementById('modal-fields');
    const modalTitle = document.getElementById('modal-title');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // Modal de Otimização
    const optimizeModal = document.getElementById('optimize-modal');
    const optimizeForm = document.getElementById('optimize-form');
    const optimizeModalCloseBtn = document.getElementById('optimize-modal-close-btn');

    // Modal para Salvar Projeto
    const saveProjectModal = document.getElementById('save-project-modal');
    const saveProjectForm = document.getElementById('save-project-form');
    const saveModalCloseBtn = document.getElementById('save-modal-close-btn');

    // Painel de Projetos
    const projectList = document.getElementById('project-list');
    const welcomeMessage = document.getElementById('welcome-message');

    // --- 2. ESTADO DA APLICAÇÃO ---
    let systemState = { components: [], connections: [] };
    let componentCounter = 0;
    let currentEditingComponentId = null;
    let componentDatabase = {};
    let lastResults = {};

    // --- 3. INICIALIZAÇÃO ---
    try {
        const response = await fetch('/get_component_database');
        if (!response.ok) throw new Error('Falha ao carregar banco de dados de componentes.');
        componentDatabase = await response.json();
    } catch (error) {
        console.error("Erro na inicialização:", error);
        alert(error.message);
    }
    await fetchAndDisplayProjects(); // Carrega os projetos do usuário ao iniciar

    // --- 4. LISTENERS DE EVENTOS ---
    library.addEventListener('click', handleLibraryClick);
    analyzeButtons.forEach(btn => btn.addEventListener('click', handleAnalyzeClick));
    optimizeButtons.forEach(btn => btn.addEventListener('click', () => optimizeModal.classList.remove('hidden')));
    clearButtons.forEach(btn => btn.addEventListener('click', handleClearWorkbench));
    saveButtons.forEach(btn => btn.addEventListener('click', () => {
        if (systemState.components.length === 0) {
            alert("Não há nada na bancada para salvar.");
            return;
        }
        saveProjectModal.classList.remove('hidden');
    }));

    generatePdfBtn.addEventListener('click', generatePDF);
    modalForm.addEventListener('submit', handleModalSubmit);
    modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
    optimizeModalCloseBtn.addEventListener('click', () => optimizeModal.classList.add('hidden'));
    optimizeForm.addEventListener('submit', handleOptimizeSubmit);
    saveProjectForm.addEventListener('submit', handleSaveProject);
    saveModalCloseBtn.addEventListener('click', () => saveProjectModal.classList.add('hidden'));

    // --- 5. FUNÇÕES DE PROJETO (SALVAR E LISTAR) ---
    async function handleSaveProject(e) {
        e.preventDefault();
        const projectNameInput = document.getElementById('project-name');
        const projectName = projectNameInput.value;
        if (!projectName) {
            alert('Por favor, dê um nome ao seu projeto.');
            return;
        }

        const payload = {
            project_name: projectName,
            system_state: systemState
        };

        try {
            const response = await fetch('/save_project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.success) {
                alert('Projeto salvo com sucesso!');
                saveProjectModal.classList.add('hidden');
                projectNameInput.value = ''; // Limpa o campo
                await fetchAndDisplayProjects(); // Atualiza a lista de projetos
            } else {
                throw new Error(result.error || 'Falha ao salvar o projeto.');
            }
        } catch (error) {
            alert(`Erro: ${error.message}`);
        }
    }

    async function fetchAndDisplayProjects() {
        try {
            const response = await fetch('/get_projects');
            const projects = await response.json();
            projectList.innerHTML = ''; // Limpa a lista antiga
            if (projects.length === 0) {
                projectList.innerHTML = '<li>Nenhum projeto salvo.</li>';
            } else {
                projects.forEach(project => {
                    const li = document.createElement('li');
                    li.textContent = project.name;
                    li.dataset.projectId = project.id;
                    // Futuramente, adicionaremos um listener aqui para carregar o projeto
                    projectList.appendChild(li);
                });
            }
        } catch (error) {
            projectList.innerHTML = '<li>Erro ao carregar projetos.</li>';
        }
    }

    // --- 6. FUNÇÕES DE INTERAÇÃO COM A INTERFACE ---
    function handleClearWorkbench() { const confirmation = confirm("Tem certeza que deseja limpar toda a bancada?"); if (confirmation) { systemState = { components: [], connections: [] }; componentCounter = 0; lastResults = {}; renderWorkbench(); resultsPanel.classList.add('hidden'); generatePdfBtn.classList.add('hidden'); resultsContent.innerHTML = ''; } }
    function handleLibraryClick(e) { const addBtn = e.target.closest('.add-btn'); if (addBtn) { const type = addBtn.dataset.type; const initialX = 50 + (systemState.components.length % 5) * 40; const initialY = 50 + (systemState.components.length % 5) * 40; createComponent(type, initialX, initialY); } }
    function createComponent(type, x, y) { componentCounter++; const id = `comp_${componentCounter}`; const newComponent = { id, type, x, y, data: {} }; systemState.components.push(newComponent); renderWorkbench(); openModalForComponent(id); }
    function renderWorkbench() { workbench.querySelectorAll('.placed-component').forEach(el => el.remove()); systemState.components.forEach(comp => { const el = document.createElement('div'); el.className = `placed-component ${comp.type}`; el.id = comp.id; el.style.left = `${comp.x}px`; el.style.top = `${comp.y}px`; if (comp.type.includes('polia') && comp.data.diameter) { const scaleFactor = 0.8; el.style.width = `${Math.max(40, parseFloat(comp.data.diameter) * scaleFactor)}px`; el.style.height = `${Math.max(40, parseFloat(comp.data.diameter) * scaleFactor)}px`; } const label = document.createElement('div'); label.className = 'component-label'; label.textContent = `${comp.type.replace(/_/g, ' ')} #${comp.id.split('_')[1]}`; el.appendChild(label); workbench.appendChild(el); el.addEventListener('click', () => { if (!el.classList.contains('dragging')) openModalForComponent(comp.id); }); el.addEventListener('mousedown', startDrag); el.addEventListener('touchstart', startDrag, { passive: false }); }); drawConnections(); }
    
    // --- 7. FUNÇÕES DE ARRASTAR (DRAG AND DROP) ---
    let activeComponent = null; let offsetX = 0; let offsetY = 0;
    function startDrag(e) { e.preventDefault(); activeComponent = e.currentTarget; activeComponent.classList.add('dragging'); const rect = activeComponent.getBoundingClientRect(); const touch = e.type === 'touchstart' ? e.touches[0] : e; offsetX = touch.clientX - rect.left; offsetY = touch.clientY - rect.top; document.addEventListener('mousemove', drag); document.addEventListener('mouseup', endDrag); document.addEventListener('touchmove', drag, { passive: false }); document.addEventListener('touchend', endDrag); }
    function drag(e) { if (activeComponent) { e.preventDefault(); const touch = e.type === 'touchmove' ? e.touches[0] : e; const workbenchRect = workbench.getBoundingClientRect(); let newX = touch.clientX - workbenchRect.left - offsetX; let newY = touch.clientY - workbenchRect.top - offsetY; newX = Math.max(0, Math.min(newX, workbenchRect.width - activeComponent.offsetWidth)); newY = Math.max(0, Math.min(newY, workbenchRect.height - activeComponent.offsetHeight)); activeComponent.style.left = `${newX}px`; activeComponent.style.top = `${newY}px`; drawConnections(); } }
    function endDrag() { if (activeComponent) { const componentState = systemState.components.find(c => c.id === activeComponent.id); if (componentState) { componentState.x = parseFloat(activeComponent.style.left); componentState.y = parseFloat(activeComponent.style.top); } activeComponent.classList.remove('dragging'); activeComponent = null; document.removeEventListener('mousemove', drag); document.removeEventListener('mouseup', endDrag); document.removeEventListener('touchmove', drag); document.removeEventListener('touchend', endDrag); setTimeout(renderWorkbench, 0); } }

    // --- 8. FUNÇÕES DO MODAL ---
    function openModalForComponent(id) { currentEditingComponentId = id; const component = systemState.components.find(c => c.id === id); if (!component) return; modalTitle.textContent = `Configurar ${component.type.replace(/_/g, ' ')}`; let fieldsHtml = ''; const data = component.data; switch (component.type) { case 'motor': fieldsHtml = `<div class="input-group"><label>Potência (kW)</label><input type="number" step="any" name="power_kw" required value="${data.power_kw || ''}"></div><div class="input-group"><label>Rotação (RPM)</label><input type="number" step="any" name="rpm" required value="${data.rpm || ''}"></div><hr><div class="input-group"><label>Eficiência do Motor (%)</label><input type="number" step="any" name="efficiency" value="${data.efficiency || '95'}"></div><div class="input-group"><label>Custo Energia (R$/kWh)</label><input type="number" step="any" name="cost_per_kwh" value="${data.cost_per_kwh || '0.75'}"></div><div class="input-group"><label>Horas de Operação/Dia</label><input type="number" step="any" name="operating_hours" value="${data.operating_hours || '8'}"></div>`; break; case 'polia_motora': case 'polia_movida': fieldsHtml = `<div class="input-group"><label>Diâmetro (mm)</label><input type="number" name="diameter" required value="${data.diameter || ''}"></div>`; if (component.type === 'polia_motora') { fieldsHtml += `<div class="input-group"><label>Tipo de Correia</label><select name="belt_type"><option value="V" ${data.belt_type === 'V' ? 'selected' : ''}>Em V</option><option value="sincronizadora" ${data.belt_type === 'sincronizadora' ? 'selected' : ''}>Sincronizadora</option><option value="plana" ${data.belt_type === 'plana' ? 'selected' : ''}>Plana</option></select></div>`; } break; case 'rolamento': let options = (componentDatabase.rolamentos || []).map(r => `<option value="${r.modelo}" ${data.modelo === r.modelo ? 'selected' : ''}>${r.modelo}</option>`).join(''); fieldsHtml = `<div class="input-group"><label>Selecione o Modelo</label><select id="rolamento-modelo-select" name="modelo"><option value="">-- Escolha um modelo --</option>${options}</select></div><div class="input-group"><label>Tipo de Rolamento</label><input type="text" id="rolamento-tipo-input" name="bearing_type" readonly value="${data.bearing_type || ''}"></div><div class="input-group"><label>Carga Dinâmica C (N)</label><input type="number" id="rolamento-carga-c-input" name="dynamic_load_c" required readonly value="${data.dynamic_load_c || ''}"></div>`; break; } modalFields.innerHTML = fieldsHtml; const modeloSelect = document.getElementById('rolamento-modelo-select'); if (modeloSelect) { modeloSelect.addEventListener('change', (e) => { const selectedModelo = e.target.value; const rolamentoData = (componentDatabase.rolamentos || []).find(r => r.modelo === selectedModelo); const tipoInput = document.getElementById('rolamento-tipo-input'); const cargaCInput = document.getElementById('rolamento-carga-c-input'); if (rolamentoData) { tipoInput.value = rolamentoData.tipo; cargaCInput.value = rolamentoData.carga_c; } else { tipoInput.value = ''; cargaCInput.value = ''; } }); } modal.classList.remove('hidden'); }
    function handleModalSubmit(e) { e.preventDefault(); const formData = new FormData(modalForm); const component = systemState.components.find(c => c.id === currentEditingComponentId); if (component) { for (let [key, value] of formData.entries()) { component.data[key] = value; } } modal.classList.add('hidden'); renderWorkbench(); }

    // --- 9. FUNÇÕES DE ANÁLISE E OTIMIZAÇÃO ---
    async function handleAnalyzeClick() { if (systemState.components.length === 0) { alert("Bancada de trabalho vazia."); return; } const payload = { components: systemState.components }; try { const response = await fetch('/analyze_system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const results = await response.json(); if (results.error) { throw new Error(results.error); } lastResults = results; displayAnalysisResults(results); generatePdfBtn.classList.remove('hidden'); } catch (error) { resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro:</strong> ${error.message}</div>`; resultsPanel.classList.remove('hidden'); } }
    async function handleOptimizeSubmit(e) { e.preventDefault(); optimizeModal.classList.add('hidden'); resultsContent.innerHTML = '<h3>Otimizando...</h3><p>Isso pode levar alguns segundos...</p>'; resultsPanel.classList.remove('hidden'); const goal = document.getElementById('optimization-goal').value; const payload = { system: { components: systemState.components }, goal: goal }; try { const response = await fetch('/optimize_system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const solutions = await response.json(); if (solutions.error) throw new Error(solutions.error); displayOptimizationResults(solutions, goal); } catch (error) { resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro:</strong> ${error.message}</div>`; } }
    function displayAnalysisResults(results) { /* ...código da versão anterior... */ }
    function displayOptimizationResults(solutions, goal) { /* ...código da versão anterior... */ }

    // --- 10. FUNÇÕES DE DESENHO E PDF ---
    function drawConnections() { /* ...código da versão anterior... */ }
    async function generatePDF() { /* ...código da versão anterior... */ }
});
