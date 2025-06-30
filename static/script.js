// Versão Definitiva - Corrigido o seletor de botões para usar classes
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. SELETORES DE ELEMENTOS ---
    const library = document.getElementById('component-library');
    const workbench = document.getElementById('workbench-area');
    const connectionCanvas = document.getElementById('connection-canvas');
    const resultsPanel = document.getElementById('results-panel');
    const resultsContent = document.getElementById('results-content');
    const projectList = document.getElementById('project-list');
    
    // Botões de Ação (usando classes)
    const analyzeButtons = document.querySelectorAll('.analyze-button');
    const optimizeButtons = document.querySelectorAll('.optimize-button');
    const clearButtons = document.querySelectorAll('.clear-button');
    const saveButtons = document.querySelectorAll('.save-button');
    const generatePdfBtn = document.querySelector('.generate-pdf-btn');

    // Modais
    const componentModal = document.getElementById('component-modal');
    const componentForm = document.getElementById('modal-form');
    const componentFields = document.getElementById('modal-fields');
    const componentTitle = document.getElementById('modal-title');
    const optimizeModal = document.getElementById('optimize-modal');
    const optimizeForm = document.getElementById('optimize-form');
    const saveProjectModal = document.getElementById('save-project-modal');
    const saveProjectForm = document.getElementById('save-project-form');
    const closeModalButtons = document.querySelectorAll('.btn-close-modal');

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
    } catch (error) { console.error("Erro na inicialização:", error); }
    await fetchAndDisplayProjects();

    // --- 4. LISTENERS DE EVENTOS ---
    library.addEventListener('click', handleLibraryClick);
    projectList.addEventListener('click', handleProjectListClick);
    
    analyzeButtons.forEach(btn => btn.addEventListener('click', handleAnalyzeClick));
    optimizeButtons.forEach(btn => btn.addEventListener('click', () => optimizeModal.classList.remove('hidden')));
    clearButtons.forEach(btn => btn.addEventListener('click', handleClearWorkbench));
    saveButtons.forEach(btn => btn.addEventListener('click', () => {
        if (systemState.components.length === 0) { alert("Bancada de trabalho vazia."); return; }
        saveProjectModal.classList.remove('hidden');
    }));

    if(generatePdfBtn) generatePdfBtn.addEventListener('click', generatePDF);
    componentForm.addEventListener('submit', handleModalSubmit);
    optimizeForm.addEventListener('submit', handleOptimizeSubmit);
    saveProjectForm.addEventListener('submit', handleSaveProject);
    closeModalButtons.forEach(btn => btn.addEventListener('click', (e) => {
        e.target.closest('.modal-backdrop').classList.add('hidden');
    }));

    // --- 5. FUNÇÕES DE PROJETO (SALVAR E CARREGAR) ---
    async function handleProjectListClick(e) {
        const projectItem = e.target.closest('li[data-project-id]');
        if (projectItem) {
            const projectId = projectItem.dataset.projectId;
            const projectName = projectItem.textContent;
            const confirmation = confirm(`Deseja carregar o projeto "${projectName}"?\nAVISO: O trabalho atual na bancada será perdido.`);
            if (confirmation) await loadProject(projectId);
        }
    }

    async function handleSaveProject(e) {
        e.preventDefault();
        const projectNameInput = document.getElementById('project-name');
        const payload = { project_name: projectNameInput.value, system_state: systemState };
        try {
            const response = await fetch('/save_project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Falha desconhecida.');
            alert('Projeto salvo com sucesso!');
            saveProjectModal.classList.add('hidden');
            projectNameInput.value = '';
            await fetchAndDisplayProjects();
        } catch (error) { alert(`Erro ao salvar: ${error.message}`); }
    }

    async function loadProject(projectId) {
        try {
            const response = await fetch(`/load_project/${projectId}`);
            if (!response.ok) throw new Error((await response.json()).error || "Projeto não encontrado.");
            systemState = await response.json();
            const ids = systemState.components.map(c => parseInt(c.id.split('_')[1]));
            componentCounter = ids.length > 0 ? Math.max(...ids) : 0;
            resultsContent.innerHTML = '';
            resultsPanel.classList.add('hidden');
            renderWorkbench();
            alert("Projeto carregado!");
        } catch (error) { alert(`Erro ao carregar: ${error.message}`); }
    }

    async function fetchAndDisplayProjects() {
        try {
            const response = await fetch('/get_projects');
            const projects = await response.json();
            projectList.innerHTML = projects.length === 0 ? '<li>Nenhum projeto salvo.</li>' : 
                projects.map(p => `<li data-project-id="${p.id}">${p.name}</li>`).join('');
        } catch (error) { projectList.innerHTML = '<li>Erro ao carregar projetos.</li>'; }
    }

    // --- (O restante das funções permanece o mesmo) ---
    function handleClearWorkbench() { if (confirm("Limpar toda a bancada?")) { systemState = { components: [], connections: [] }; componentCounter = 0; lastResults = {}; renderWorkbench(); resultsPanel.classList.add('hidden'); if(generatePdfBtn) generatePdfBtn.classList.add('hidden'); resultsContent.innerHTML = ''; } }
    function handleLibraryClick(e) { const addBtn = e.target.closest('.add-btn'); if (addBtn) { createComponent(addBtn.dataset.type, 50 + (systemState.components.length % 5) * 40, 50 + (systemState.components.length % 5) * 40); } }
    function createComponent(type, x, y) { componentCounter++; const newComponent = { id: `comp_${componentCounter}`, type, x, y, data: {} }; systemState.components.push(newComponent); renderWorkbench(); openModalForComponent(newComponent.id); }
    function renderWorkbench() { workbench.querySelectorAll('.placed-component').forEach(el => el.remove()); systemState.components.forEach(comp => { const el = document.createElement('div'); el.className = `placed-component ${comp.type}`; el.id = comp.id; el.style.left = `${comp.x}px`; el.style.top = `${comp.y}px`; if (comp.type.includes('polia') && comp.data.diameter) { const scaleFactor = 0.8; el.style.width = `${Math.max(40, parseFloat(comp.data.diameter) * scaleFactor)}px`; el.style.height = `${Math.max(40, parseFloat(comp.data.diameter) * scaleFactor)}px`; } const label = document.createElement('div'); label.className = 'component-label'; label.textContent = `${comp.type.replace(/_/g, ' ')} #${comp.id.split('_')[1]}`; el.appendChild(label); workbench.appendChild(el); el.addEventListener('click', () => { if (!el.classList.contains('dragging')) openModalForComponent(comp.id); }); el.addEventListener('mousedown', startDrag); el.addEventListener('touchstart', startDrag, { passive: false }); }); drawConnections(); }
    let activeComponent = null; let offsetX = 0; let offsetY = 0;
    function startDrag(e) { e.preventDefault(); activeComponent = e.currentTarget; activeComponent.classList.add('dragging'); const rect = activeComponent.getBoundingClientRect(); const touch = e.type === 'touchstart' ? e.touches[0] : e; offsetX = touch.clientX - rect.left; offsetY = touch.clientY - rect.top; document.addEventListener('mousemove', drag); document.addEventListener('mouseup', endDrag); document.addEventListener('touchmove', drag, { passive: false }); document.addEventListener('touchend', endDrag); }
    function drag(e) { if (activeComponent) { e.preventDefault(); const touch = e.type === 'touchmove' ? e.touches[0] : e; const workbenchRect = workbench.getBoundingClientRect(); let newX = touch.clientX - workbenchRect.left - offsetX; let newY = touch.clientY - workbenchRect.top - offsetY; newX = Math.max(0, Math.min(newX, workbenchRect.width - activeComponent.offsetWidth)); newY = Math.max(0, Math.min(newY, workbenchRect.height - activeComponent.offsetHeight)); activeComponent.style.left = `${newX}px`; activeComponent.style.top = `${newY}px`; drawConnections(); } }
    function endDrag() { if (activeComponent) { const componentState = systemState.components.find(c => c.id === activeComponent.id); if (componentState) { componentState.x = parseFloat(activeComponent.style.left); componentState.y = parseFloat(activeComponent.style.top); } activeComponent.classList.remove('dragging'); activeComponent = null; document.removeEventListener('mousemove', drag); document.removeEventListener('mouseup', endDrag); document.removeEventListener('touchmove', drag); document.removeEventListener('touchend', endDrag); setTimeout(renderWorkbench, 0); } }
    function openModalForComponent(id) { currentEditingComponentId = id; const component = systemState.components.find(c => c.id === id); if (!component) return; componentTitle.textContent = `Configurar ${component.type.replace(/_/g, ' ')}`; let fieldsHtml = ''; const data = component.data; switch (component.type) { case 'motor': fieldsHtml = `<div class="input-group"><label>Potência (kW)</label><input type="number" step="any" name="power_kw" required value="${data.power_kw || ''}"></div><div class="input-group"><label>Rotação (RPM)</label><input type="number" step="any" name="rpm" required value="${data.rpm || ''}"></div><hr><div class="input-group"><label>Eficiência (%)</label><input type="number" step="any" name="efficiency" value="${data.efficiency || '95'}"></div><div class="input-group"><label>Custo Energia (R$/kWh)</label><input type="number" step="any" name="cost_per_kwh" value="${data.cost_per_kwh || '0.75'}"></div><div class="input-group"><label>Horas/Dia</label><input type="number" step="any" name="operating_hours" value="${data.operating_hours || '8'}"></div>`; break; case 'polia_motora': case 'polia_movida': fieldsHtml = `<div class="input-group"><label>Diâmetro (mm)</label><input type="number" name="diameter" required value="${data.diameter || ''}"></div>`; if (component.type === 'polia_motora') { fieldsHtml += `<div class="input-group"><label>Tipo Correia</label><select name="belt_type"><option value="V" ${data.belt_type === 'V' ? 'selected' : ''}>Em V</option><option value="sincronizadora" ${data.belt_type === 'sincronizadora' ? 'selected' : ''}>Sincronizadora</option><option value="plana" ${data.belt_type === 'plana' ? 'selected' : ''}>Plana</option></select></div>`; } break; case 'rolamento': let options = (componentDatabase.rolamentos || []).map(r => `<option value="${r.modelo}" ${data.modelo === r.modelo ? 'selected' : ''}>${r.modelo}</option>`).join(''); fieldsHtml = `<div class="input-group"><label>Modelo</label><select name="modelo" class="rolamento-modelo-select"><option value="">-- Escolha --</option>${options}</select></div><div class="input-group"><label>Tipo</label><input type="text" name="bearing_type" readonly value="${data.bearing_type || ''}"></div><div class="input-group"><label>Carga C (N)</label><input type="number" name="dynamic_load_c" required readonly value="${data.dynamic_load_c || ''}"></div>`; break; } componentFields.innerHTML = fieldsHtml; const modeloSelect = componentFields.querySelector('.rolamento-modelo-select'); if (modeloSelect) { modeloSelect.addEventListener('change', (e) => { const rolamentoData = (componentDatabase.rolamentos || []).find(r => r.modelo === e.target.value); componentFields.querySelector('input[name="bearing_type"]').value = rolamentoData ? rolamentoData.tipo : ''; componentFields.querySelector('input[name="dynamic_load_c"]').value = rolamentoData ? rolamentoData.carga_c : ''; }); } componentModal.classList.remove('hidden'); }
    function handleModalSubmit(e) { e.preventDefault(); const formData = new FormData(componentForm); const component = systemState.components.find(c => c.id === currentEditingComponentId); if (component) { for (let [key, value] of formData.entries()) { component.data[key] = value; } } componentModal.classList.add('hidden'); renderWorkbench(); }
    async function handleAnalyzeClick() { if (systemState.components.length === 0) { alert("Bancada de trabalho vazia."); return; } const payload = { components: systemState.components }; try { const response = await fetch('/analyze_system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const results = await response.json(); if (results.error) { throw new Error(results.error); } lastResults = results; displayAnalysisResults(results); if(generatePdfBtn) generatePdfBtn.classList.remove('hidden'); } catch (error) { resultsContent.innerHTML = `<div class="error-message"><strong>Erro:</strong> ${error.message}</div>`; resultsPanel.classList.remove('hidden'); } }
    async function handleOptimizeSubmit(e) { e.preventDefault(); optimizeModal.classList.add('hidden'); resultsContent.innerHTML = '<h3>Otimizando...</h3><p>Isso pode levar alguns segundos...</p>'; resultsPanel.classList.remove('hidden'); const goal = document.getElementById('optimization-goal').value; const payload = { system: { components: systemState.components }, goal: goal }; try { const response = await fetch('/optimize_system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const solutions = await response.json(); if (solutions.error) throw new Error(solutions.error); displayOptimizationResults(solutions, goal); } catch (error) { resultsContent.innerHTML = `<div class="error-message"><strong>Erro:</strong> ${error.message}</div>`; } }
    function displayAnalysisResults(results) { let html = ''; if (results.financeiro_energetico) { const fin = results.financeiro_energetico; html += `<h3>Análise Financeira</h3><ul><li>Eficiência: <strong>${fin.eficiencia_transmissao}</strong></li><li>Potência Perdida: <strong>${fin.potencia_perdida_watts} W</strong></li><li>Custo Anual: <strong>R$ ${fin.custo_operacional_anual_brl.toLocaleString('pt-BR')}</strong></li></ul>`; } html += '<h3>Resultados Técnicos</h3><ul>'; for (const [key, value] of Object.entries(results.sistema)) { html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`; } html += '</ul>'; let componentLifespans = []; let componentHtml = '<h3>Análise de Vida Útil</h3><ul>'; let hasLifeData = false; for (const [id, data] of Object.entries(results)) { if (id.startsWith('comp_') && data.tipo === 'Rolamento') { hasLifeData = true; componentHtml += `<li>Vida L10h (${id}): <strong>${data.vida_util_l10h.toLocaleString('pt-BR')} h</strong></li>`; componentLifespans.push({ id, life: data.vida_util_l10h }); } } componentHtml += '</ul>'; if (hasLifeData) { html += componentHtml; componentLifespans.sort((a, b) => a.life - b.life); const weakestLink = componentLifespans[0]; html += `<h3 class="weakest-link">Elo Mais Fraco: ${weakestLink.id}</h3>`; } resultsContent.innerHTML = html; resultsPanel.classList.remove('hidden'); }
    function displayOptimizationResults(solutions, goal) { let goalTitle = { cost: 'Menor Custo', life: 'Maior Vida Útil', efficiency: 'Maior Eficiência' }[goal]; let html = `<h2>Top 5 Soluções: ${goalTitle}</h2>`; html += '<table><thead><tr><th>Config.</th><th>Custo/Ano</th><th>Vida Útil (h)</th><th>Efic. (%)</th></tr></thead><tbody>'; solutions.forEach(sol => { html += `<tr><td>${sol.config}</td><td>${sol.cost.toLocaleString('pt-BR')}</td><td>${sol.min_life.toLocaleString('pt-BR')}</td><td>${sol.efficiency.toFixed(1)}</td></tr>`; }); html += '</tbody></table>'; resultsContent.innerHTML = html; if(generatePdfBtn) generatePdfBtn.classList.add('hidden'); }
    function drawConnections() { connectionCanvas.innerHTML = ''; const p1 = systemState.components.find(c => c.type === 'polia_motora'); const p2 = systemState.components.find(c => c.type === 'polia_movida'); if (p1 && p2) { const p1Div = document.getElementById(p1.id); const p2Div = document.getElementById(p2.id); if (!p1Div || !p2Div) return; const r1 = p1Div.offsetWidth / 2; const c1x = p1.x + r1; const c1y = p1.y + r1; const r2 = p2Div.offsetWidth / 2; const c2x = p2.x + r2; const c2y = p2.y + r2; const dx = c2x - c1x; const dy = c2y - c1y; const d = Math.sqrt(dx * dx + dy * dy); if (d > r1 + r2) { const angle = Math.atan2(dy, dx); const alpha = Math.acos((r1 - r2) / d); const t1x_upper = c1x + r1 * Math.cos(angle - alpha); const t1y_upper = c1y + r1 * Math.sin(angle - alpha); const t1x_lower = c1x + r1 * Math.cos(angle + alpha); const t1y_lower = c1y + r1 * Math.sin(angle + alpha); const t2x_upper = c2x + r2 * Math.cos(angle - alpha); const t2y_upper = c2y + r2 * Math.sin(angle - alpha); const t2x_lower = c2x + r2 * Math.cos(angle + alpha); const t2y_lower = c2y + r2 * Math.sin(angle + alpha); const pathData = `M ${t1x_upper} ${t1y_upper} L ${t2x_upper} ${t2y_upper} M ${t1x_lower} ${t1y_lower} L ${t2x_lower} ${t2y_lower}`; const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', pathData); path.setAttribute('class', 'belt-line'); connectionCanvas.appendChild(path); } } }
    async function generatePDF() { const { jsPDF } = window.jspdf; const doc = new jsPDF(); const workbenchImage = await html2canvas(workbench, { backgroundColor: "#ffffff", scale: 2 }); const imgData = workbenchImage.toDataURL('image/png'); doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text('Relatório de Análise de Sistema', 105, 20, { align: 'center' }); doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 30, { align: 'center' }); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('Layout do Sistema', 14, 50); doc.addImage(imgData, 'PNG', 14, 60, 180, 120); doc.addPage(); doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.text('Análise Detalhada', 14, 20); let currentY = 30; function addSection(title, data) { if (!data || Object.keys(data).length === 0) return; doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text(title, 14, currentY); currentY += 8; doc.setFontSize(11); doc.setFont('helvetica', 'normal'); for (const [key, value] of Object.entries(data)) { let label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); doc.text(`${label}:`, 16, currentY); doc.text(String(value), 100, currentY); currentY += 7; if (currentY > 280) { doc.addPage(); currentY = 20; } } currentY += 5; } addSection('Resultados Técnicos', lastResults.sistema); addSection('Análise Financeira', lastResults.financeiro_energetico); const lifeData = {}; for (const [id, data] of Object.entries(lastResults)) { if (id.startsWith('comp_') && data.tipo === 'Rolamento') { lifeData[`Vida Util L10h (${id})`] = `${data.vida_util_l10h.toLocaleString('pt-BR')} horas`; } } addSection('Análise de Vida Útil', lifeData); doc.save(`relatorio-sistema-${Date.now()}.pdf`); }
});

