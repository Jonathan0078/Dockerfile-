document.addEventListener('DOMContentLoaded', async () => {
    // Referências aos elementos principais
    const library = document.getElementById('component-library');
    const workbench = document.getElementById('workbench-area');
    const analyzeButton = document.getElementById('analyze-button');
    const connectionCanvas = document.getElementById('connection-canvas');
    // ... (resto das referências inalteradas)
    const resultsPanel = document.getElementById('results-panel');
    const resultsContent = document.getElementById('results-content');
    const modal = document.getElementById('component-modal');
    const modalForm = document.getElementById('modal-form');
    const modalFields = document.getElementById('modal-fields');
    const modalTitle = document.getElementById('modal-title');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    let systemState = { components: [], connections: [] };
    let componentCounter = 0;
    let currentEditingComponentId = null;

    // Lógica de Adição por Botão (inalterada)
    library.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-btn')) {
            const type = e.target.dataset.type;
            const initialX = 50 + (systemState.components.length % 5) * 40;
            const initialY = 50 + (systemState.components.length % 5) * 40;
            createComponent(type, initialX, initialY);
        }
    });
    
    // Funções de Criação e Renderização
    function createComponent(type, x, y) {
        componentCounter++;
        const id = `comp_${componentCounter}`;
        // Adiciona um tamanho padrão para visualização
        const defaultSize = (type.includes('polia')) ? 100 : 80;
        const newComponent = { id, type, x, y, width: defaultSize, height: defaultSize, data: {} };
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
            // Atualiza tamanho se for polia e tiver diâmetro
            if (comp.type.includes('polia') && comp.data.diameter) {
                 const scaleFactor = 0.8; // Fator para não ficar gigante
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
        drawConnections(); // <<<<----- A MÁGICA ACONTECE AQUI
    }

    // --- NOVA FUNÇÃO PARA DESENHAR AS CONEXÕES ---
    function drawConnections() {
        connectionCanvas.innerHTML = ''; // Limpa o canvas

        const p1 = systemState.components.find(c => c.type === 'polia_motora');
        const p2 = systemState.components.find(c => c.type === 'polia_movida');

        if (p1 && p2) {
            const p1Div = document.getElementById(p1.id);
            const p2Div = document.getElementById(p2.id);

            // Calcula o centro e o raio de cada polia
            const r1 = p1Div.offsetWidth / 2;
            const c1x = p1.x + r1;
            const c1y = p1.y + r1;

            const r2 = p2Div.offsetWidth / 2;
            const c2x = p2.x + r2;
            const c2y = p2.y + r2;
            
            // Desenha a correia (cálculo de tangentes)
            const dx = c2x - c1x;
            const dy = c2y - c1y;
            const d = Math.sqrt(dx * dx + dy * dy);
            
            if (d > r1 + r2) {
                const angle = Math.atan2(dy, dx);
                const alpha = Math.acos((r1 - r2) / d);

                // Pontos de tangência na polia 1
                const t1x_upper = c1x + r1 * Math.cos(angle - alpha);
                const t1y_upper = c1y + r1 * Math.sin(angle - alpha);
                const t1x_lower = c1x + r1 * Math.cos(angle + alpha);
                const t1y_lower = c1y + r1 * Math.sin(angle + alpha);

                // Pontos de tangência na polia 2
                const t2x_upper = c2x + r2 * Math.cos(angle - alpha);
                const t2y_upper = c2y + r2 * Math.sin(angle - alpha);
                const t2x_lower = c2x + r2 * Math.cos(angle + alpha);
                const t2y_lower = c2y + r2 * Math.sin(angle + alpha);

                // Cria as linhas SVG
                const pathData = `M ${t1x_upper} ${t1y_upper} L ${t2x_upper} ${t2y_upper} M ${t1x_lower} ${t1y_lower} L ${t2x_lower} ${t2y_lower}`;
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathData);
                path.setAttribute('class', 'belt-line');
                connectionCanvas.appendChild(path);
            }
        }
    }

    // Lógica de arrastar (atualizada para redesenhar as conexões)
    function drag(e) {
        if (activeComponent) {
            // ... (código da função drag da versão anterior)
            drawConnections(); // Redesenha as linhas enquanto arrasta
        }
    }
    
    // Lógica do Modal (atualizada para redesenhar após salvar)
    modalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // ... (código da função submit da versão anterior)
        renderWorkbench(); // Substitui a chamada a `renderWorkbench` para redesenhar tudo
    });
    
    // --- COLE AQUI O RESTANTE DO CÓDIGO JS QUE NÃO FOI MODIFICADO ---
    // (startDrag, endDrag, openModalForComponent, modalCloseBtn click, analyzeButton click, displayResults)
    // Código completo para garantir:
    let activeComponent = null; let offsetX = 0; let offsetY = 0; function startDrag(e) { e.preventDefault(); activeComponent = e.currentTarget; activeComponent.classList.add('dragging'); const rect = activeComponent.getBoundingClientRect(); const touch = e.type === 'touchstart' ? e.touches[0] : e; offsetX = touch.clientX - rect.left; offsetY = touch.clientY - rect.top; document.addEventListener('mousemove', drag); document.addEventListener('mouseup', endDrag); document.addEventListener('touchmove', drag, { passive: false }); document.addEventListener('touchend', endDrag); } function drag(e) { if (activeComponent) { e.preventDefault(); const touch = e.type === 'touchmove' ? e.touches[0] : e; const workbenchRect = workbench.getBoundingClientRect(); let newX = touch.clientX - workbenchRect.left - offsetX; let newY = touch.clientY - workbenchRect.top - offsetY; newX = Math.max(0, Math.min(newX, workbenchRect.width - activeComponent.offsetWidth)); newY = Math.max(0, Math.min(newY, workbenchRect.height - activeComponent.offsetHeight)); activeComponent.style.left = `${newX}px`; activeComponent.style.top = `${newY}px`; drawConnections(); } } function endDrag() { if (activeComponent) { const componentState = systemState.components.find(c => c.id === activeComponent.id); if (componentState) { componentState.x = parseFloat(activeComponent.style.left); componentState.y = parseFloat(activeComponent.style.top); } activeComponent.classList.remove('dragging'); activeComponent = null; document.removeEventListener('mousemove', drag); document.removeEventListener('mouseup', endDrag); document.removeEventListener('touchmove', drag); document.removeEventListener('touchend', endDrag); setTimeout(() => renderWorkbench(), 0); } }
    function openModalForComponent(id) { currentEditingComponentId = id; const component = systemState.components.find(c => c.id === id); if (!component) return; modalTitle.textContent = `Configurar ${component.type.replace(/_/g, ' ')}`; let fieldsHtml = ''; const data = component.data; switch (component.type) { case 'motor': fieldsHtml = `<div class="input-group"><label>Potência (kW)</label><input type="number" step="any" name="power_kw" required value="${data.power_kw || ''}"></div><div class="input-group"><label>Rotação (RPM)</label><input type="number" step="any" name="rpm" required value="${data.rpm || ''}"></div><hr><div class="input-group"><label>Eficiência do Motor (%)</label><input type="number" step="any" name="efficiency" value="${data.efficiency || '95'}"></div><div class="input-group"><label>Custo Energia (R$/kWh)</label><input type="number" step="any" name="cost_per_kwh" value="${data.cost_per_kwh || '0.75'}"></div><div class="input-group"><label>Horas de Operação/Dia</label><input type="number" step="any" name="operating_hours" value="${data.operating_hours || '8'}"></div>`; break; case 'polia_motora': case 'polia_movida': fieldsHtml = `<div class="input-group"><label>Diâmetro (mm)</label><input type="number" name="diameter" required value="${data.diameter || ''}"></div>`; if (component.type === 'polia_motora') { fieldsHtml += `<div class="input-group"><label>Tipo de Correia</label><select name="belt_type"><option value="V" ${data.belt_type === 'V' ? 'selected' : ''}>Em V</option><option value="sincronizadora" ${data.belt_type === 'sincronizadora' ? 'selected' : ''}>Sincronizadora</option><option value="plana" ${data.belt_type === 'plana' ? 'selected' : ''}>Plana</option></select></div>`; } break; case 'rolamento': fieldsHtml = `<div class="input-group"><label>Tipo de Rolamento</label><select name="bearing_type"><option value="esferas" ${data.bearing_type === 'esferas' ? 'selected' : ''}>Esferas</option><option value="rolos" ${data.bearing_type === 'rolos' ? 'selected' : ''}>Rolos</option></select></div><div class="input-group"><label>Carga Dinâmica C (N)</label><input type="number" name="dynamic_load_c" required value="${data.dynamic_load_c || ''}"></div>`; break; } modalFields.innerHTML = fieldsHtml; modal.classList.remove('hidden'); }
    modalForm.addEventListener('submit', (e) => { e.preventDefault(); const formData = new FormData(modalForm); const component = systemState.components.find(c => c.id === currentEditingComponentId); if (component) { for (let [key, value] of formData.entries()) { component.data[key] = value; } } modal.classList.add('hidden'); renderWorkbench(); });
    modalCloseBtn.addEventListener('click', () => { modal.classList.add('hidden'); });
    analyzeButton.addEventListener('click', async () => { if (systemState.components.length === 0) { alert("Bancada de trabalho vazia. Adicione componentes para analisar."); return; } const payload = { components: systemState.components, connections: [] }; try { const response = await fetch('/analyze_system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const results = await response.json(); if (results.error) { throw new Error(results.error); } displayResults(results); } catch (error) { resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro na análise:</strong> ${error.message}</div>`; resultsPanel.classList.remove('hidden'); } });
    function displayResults(results) { let html = ''; if (results.financeiro_energetico) { const fin = results.financeiro_energetico; html += `<h3>Análise Financeira e Energética</h3><ul><li>Eficiência da Transmissão: <strong>${fin.eficiencia_transmissao}</strong></li><li>Potência Perdida: <strong>${fin.potencia_perdida_watts} Watts</strong></li><li>Consumo Anual: <strong>${fin.consumo_anual_kwh.toLocaleString('pt-BR')} kWh</strong></li><li>Custo Anual (R$): <strong>${fin.custo_operacional_anual_brl.toLocaleString('pt-BR')}</strong></li></ul>`; } html += '<h3>Resultados Técnicos</h3><ul>'; for (const [key, value] of Object.entries(results.sistema)) { html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`; } html += '</ul>'; let componentLifespans = []; let componentHtml = '<h3>Análise de Vida Útil</h3><ul>'; let hasLifeData = false; for (const [id, data] of Object.entries(results)) { if (id.startsWith('comp_') && data.tipo === 'Rolamento') { hasLifeData = true; componentHtml += `<li>Vida Útil L10h (${id}): <strong>${data.vida_util_l10h.toLocaleString('pt-BR')} horas</strong></li>`; componentLifespans.push({ id, life: data.vida_util_l10h }); } } componentHtml += '</ul>'; if (hasLifeData) { html += componentHtml; componentLifespans.sort((a, b) => a.life - b.life); const weakestLink = componentLifespans[0]; html += `<h3 class="weakest-link">Elo Mais Fraco: ${weakestLink.id}</h3>`; } resultsContent.innerHTML = html; resultsPanel.classList.remove('hidden'); }
});
