document.addEventListener('DOMContentLoaded', async () => {
    // Referências aos elementos principais do DOM
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

    // Armazenamento do estado do sistema e do banco de dados
    let systemState = { components: [], connections: [] };
    let componentCounter = 0;
    let currentEditingComponentId = null;
    let componentDatabase = {};

    // --- CARREGA O BANCO DE DADOS AO INICIAR A PÁGINA ---
    try {
        const response = await fetch('/get_component_database');
        if (!response.ok) throw new Error('Falha na resposta do servidor.');
        componentDatabase = await response.json();
    } catch (error) {
        console.error("Erro ao carregar o banco de dados de componentes:", error);
        alert("Não foi possível carregar o banco de dados de componentes. A lista de rolamentos não estará disponível.");
    }

    // --- LÓGICA DE ADIÇÃO POR BOTÃO ---
    library.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-btn')) {
            const type = e.target.dataset.type;
            const initialX = 50 + (systemState.components.length % 5) * 40;
            const initialY = 50 + (systemState.components.length % 5) * 40;
            createComponent(type, initialX, initialY);
        }
    });
    
    // --- FUNÇÕES DE CRIAÇÃO E RENDERIZAÇÃO ---
    function createComponent(type, x, y) {
        componentCounter++;
        const id = `comp_${componentCounter}`;
        const newComponent = { id, type, x, y, data: {} };
        systemState.components.push(newComponent);
        renderWorkbench();
        openModalForComponent(id);
    }

    function renderWorkbench() {
        workbench.querySelectorAll('.placed-component').forEach(el => el.remove());
        systemState.components.forEach(comp => {
            const el = document.createElement('div');
            el.className = `placed-component ${comp.type}`;
            el.id = comp.id;
            el.style.left = `${comp.x}px`;
            el.style.top = `${comp.y}px`;
            
            if (comp.type.includes('polia') && comp.data.diameter) {
                 const scaleFactor = 0.8;
                 el.style.width = `${Math.max(40, comp.data.diameter * scaleFactor)}px`;
                 el.style.height = `${Math.max(40, comp.data.diameter * scaleFactor)}px`;
            }

            const label = document.createElement('div');
            label.className = 'component-label';
            label.textContent = `${comp.type.replace(/_/g, ' ')} #${comp.id.split('_')[1]}`;
            el.appendChild(label);
            workbench.appendChild(el);
            
            el.addEventListener('click', (e) => { if (!el.classList.contains('dragging')) openModalForComponent(comp.id); });
            el.addEventListener('mousedown', startDrag);
            el.addEventListener('touchstart', startDrag, { passive: false });
        });
        drawConnections();
    }

    // --- FUNÇÃO PARA DESENHAR AS CONEXÕES (CORREIA) ---
    function drawConnections() {
        connectionCanvas.innerHTML = '';
        const p1 = systemState.components.find(c => c.type === 'polia_motora');
        const p2 = systemState.components.find(c => c.type === 'polia_movida');

        if (p1 && p2) {
            const p1Div = document.getElementById(p1.id);
            const p2Div = document.getElementById(p2.id);
            if (!p1Div || !p2Div) return;

            const r1 = p1Div.offsetWidth / 2;
            const c1x = p1.x + r1;
            const c1y = p1.y + r1;
            const r2 = p2Div.offsetWidth / 2;
            const c2x = p2.x + r2;
            const c2y = p2.y + r2;
            
            const dx = c2x - c1x;
            const dy = c2y - c1y;
            const d = Math.sqrt(dx * dx + dy * dy);
            
            if (d > r1 + r2) {
                const angle = Math.atan2(dy, dx);
                const alpha = Math.acos((r1 - r2) / d);
                const t1x_upper = c1x + r1 * Math.cos(angle - alpha);
                const t1y_upper = c1y + r1 * Math.sin(angle - alpha);
                const t1x_lower = c1x + r1 * Math.cos(angle + alpha);
                const t1y_lower = c1y + r1 * Math.sin(angle + alpha);
                const t2x_upper = c2x + r2 * Math.cos(angle - alpha);
                const t2y_upper = c2y + r2 * Math.sin(angle - alpha);
                const t2x_lower = c2x + r2 * Math.cos(angle + alpha);
                const t2y_lower = c2y + r2 * Math.sin(angle + alpha);

                const pathData = `M ${t1x_upper} ${t1y_upper} L ${t2x_upper} ${t2y_upper} M ${t1x_lower} ${t1y_lower} L ${t2x_lower} ${t2y_lower}`;
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathData);
                path.setAttribute('class', 'belt-line');
                connectionCanvas.appendChild(path);
            }
        }
    }

    // --- LÓGICA DE ARRASTAR COMPONENTES ---
    let activeComponent = null; let offsetX = 0; let offsetY = 0;
    function startDrag(e) { e.preventDefault(); activeComponent = e.currentTarget; activeComponent.classList.add('dragging'); const rect = activeComponent.getBoundingClientRect(); const touch = e.type === 'touchstart' ? e.touches[0] : e; offsetX = touch.clientX - rect.left; offsetY = touch.clientY - rect.top; document.addEventListener('mousemove', drag); document.addEventListener('mouseup', endDrag); document.addEventListener('touchmove', drag, { passive: false }); document.addEventListener('touchend', endDrag); }
    function drag(e) { if (activeComponent) { e.preventDefault(); const touch = e.type === 'touchmove' ? e.touches[0] : e; const workbenchRect = workbench.getBoundingClientRect(); let newX = touch.clientX - workbenchRect.left - offsetX; let newY = touch.clientY - workbenchRect.top - offsetY; newX = Math.max(0, Math.min(newX, workbenchRect.width - activeComponent.offsetWidth)); newY = Math.max(0, Math.min(newY, workbenchRect.height - activeComponent.offsetHeight)); activeComponent.style.left = `${newX}px`; activeComponent.style.top = `${newY}px`; drawConnections(); } }
    function endDrag() { if (activeComponent) { const componentState = systemState.components.find(c => c.id === activeComponent.id); if (componentState) { componentState.x = parseFloat(activeComponent.style.left); componentState.y = parseFloat(activeComponent.style.top); } activeComponent.classList.remove('dragging'); activeComponent = null; document.removeEventListener('mousemove', drag); document.removeEventListener('mouseup', endDrag); document.removeEventListener('touchmove', drag); document.removeEventListener('touchend', endDrag); setTimeout(() => renderWorkbench(), 0); } }

    // --- LÓGICA DO MODAL (COM A LISTA DE ROLAMENTOS RESTAURADA) ---
    function openModalForComponent(id) {
        currentEditingComponentId = id;
        const component = systemState.components.find(c => c.id === id);
        if (!component) return;

        modalTitle.textContent = `Configurar ${component.type.replace(/_/g, ' ')}`;
        let fieldsHtml = '';
        const data = component.data;

        switch (component.type) {
            case 'motor':
                fieldsHtml = `<div class="input-group"><label>Potência (kW)</label><input type="number" step="any" name="power_kw" required value="${data.power_kw || ''}"></div><div class="input-group"><label>Rotação (RPM)</label><input type="number" step="any" name="rpm" required value="${data.rpm || ''}"></div><hr><div class="input-group"><label>Eficiência do Motor (%)</label><input type="number" step="any" name="efficiency" value="${data.efficiency || '95'}"></div><div class="input-group"><label>Custo Energia (R$/kWh)</label><input type="number" step="any" name="cost_per_kwh" value="${data.cost_per_kwh || '0.75'}"></div><div class="input-group"><label>Horas de Operação/Dia</label><input type="number" step="any" name="operating_hours" value="${data.operating_hours || '8'}"></div>`;
                break;
            case 'polia_motora':
            case 'polia_movida':
                fieldsHtml = `<div class="input-group"><label>Diâmetro (mm)</label><input type="number" name="diameter" required value="${data.diameter || ''}"></div>`;
                if (component.type === 'polia_motora') {
                    fieldsHtml += `<div class="input-group"><label>Tipo de Correia</label><select name="belt_type"><option value="V" ${data.belt_type === 'V' ? 'selected' : ''}>Em V</option><option value="sincronizadora" ${data.belt_type === 'sincronizadora' ? 'selected' : ''}>Sincronizadora</option><option value="plana" ${data.belt_type === 'plana' ? 'selected' : ''}>Plana</option></select></div>`;
                }
                break;
            case 'rolamento': // <<<<----- CÓDIGO CORRIGIDO AQUI
                let options = (componentDatabase.rolamentos || []).map(r => 
                    `<option value="${r.modelo}" ${data.modelo === r.modelo ? 'selected' : ''}>${r.modelo}</option>`
                ).join('');
                
                fieldsHtml = `
                    <div class="input-group">
                        <label>Selecione o Modelo</label>
                        <select id="rolamento-modelo-select" name="modelo">
                            <option value="">-- Escolha um modelo --</option>
                            ${options}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Tipo de Rolamento</label>
                        <input type="text" id="rolamento-tipo-input" name="bearing_type" readonly value="${data.bearing_type || ''}">
                    </div>
                    <div class="input-group">
                        <label>Carga Dinâmica C (N)</label>
                        <input type="number" id="rolamento-carga-c-input" name="dynamic_load_c" required readonly value="${data.dynamic_load_c || ''}">
                    </div>`;
                break;
        }
        modalFields.innerHTML = fieldsHtml;

        const modeloSelect = document.getElementById('rolamento-modelo-select');
        if (modeloSelect) {
            modeloSelect.addEventListener('change', (e) => {
                const selectedModelo = e.target.value;
                const rolamentoData = (componentDatabase.rolamentos || []).find(r => r.modelo === selectedModelo);
                if (rolamentoData) {
                    document.getElementById('rolamento-tipo-input').value = rolamentoData.tipo;
                    document.getElementById('rolamento-carga-c-input').value = rolamentoData.carga_c;
                } else {
                    document.getElementById('rolamento-tipo-input').value = '';
                    document.getElementById('rolamento-carga-c-input').value = '';
                }
            });
        }
        modal.classList.remove('hidden');
    }

    modalForm.addEventListener('submit', (e) => { e.preventDefault(); const formData = new FormData(modalForm); const component = systemState.components.find(c => c.id === currentEditingComponentId); if (component) { for (let [key, value] of formData.entries()) { component.data[key] = value; } } modal.classList.add('hidden'); renderWorkbench(); });
    modalCloseBtn.addEventListener('click', () => { modal.classList.add('hidden'); });

    // --- LÓGICA DE ANÁLISE ---
    analyzeButton.addEventListener('click', async () => { if (systemState.components.length === 0) { alert("Bancada de trabalho vazia. Adicione componentes para analisar."); return; } const payload = { components: systemState.components, connections: [] }; try { const response = await fetch('/analyze_system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const results = await response.json(); if (results.error) { throw new Error(results.error); } displayResults(results); } catch (error) { resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro na análise:</strong> ${error.message}</div>`; resultsPanel.classList.remove('hidden'); } });
    function displayResults(results) { let html = ''; if (results.financeiro_energetico) { const fin = results.financeiro_energetico; html += `<h3>Análise Financeira e Energética</h3><ul><li>Eficiência da Transmissão: <strong>${fin.eficiencia_transmissao}</strong></li><li>Potência Perdida: <strong>${fin.potencia_perdida_watts} Watts</strong></li><li>Consumo Anual: <strong>${fin.consumo_anual_kwh.toLocaleString('pt-BR')} kWh</strong></li><li>Custo Anual (R$): <strong>${fin.custo_operacional_anual_brl.toLocaleString('pt-BR')}</strong></li></ul>`; } html += '<h3>Resultados Técnicos</h3><ul>'; for (const [key, value] of Object.entries(results.sistema)) { html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`; } html += '</ul>'; let componentLifespans = []; let componentHtml = '<h3>Análise de Vida Útil</h3><ul>'; let hasLifeData = false; for (const [id, data] of Object.entries(results)) { if (id.startsWith('comp_') && data.tipo === 'Rolamento') { hasLifeData = true; componentHtml += `<li>Vida Útil L10h (${id}): <strong>${data.vida_util_l10h.toLocaleString('pt-BR')} horas</strong></li>`; componentLifespans.push({ id, life: data.vida_util_l10h }); } } componentHtml += '</ul>'; if (hasLifeData) { html += componentHtml; componentLifespans.sort((a, b) => a.life - b.life); const weakestLink = componentLifespans[0]; html += `<h3 class="weakest-link">Elo Mais Fraco: ${weakestLink.id}</h3>`; } resultsContent.innerHTML = html; resultsPanel.classList.remove('hidden'); }
});
