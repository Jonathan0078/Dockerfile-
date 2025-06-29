document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos principais do DOM
    const library = document.getElementById('component-library');
    const workbench = document.getElementById('workbench-area');
    const analyzeButton = document.getElementById('analyze-button');
    const resultsPanel = document.getElementById('results-panel');
    const resultsContent = document.getElementById('results-content');
    const modal = document.getElementById('component-modal');
    const modalForm = document.getElementById('modal-form');
    const modalFields = document.getElementById('modal-fields');
    const modalTitle = document.getElementById('modal-title');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // Armazenamento do estado do sistema
    let systemState = { components: [], connections: [] };
    let componentCounter = 0;
    let currentEditingComponentId = null;

    // --- VARIÁVEIS PARA CONTROLAR O ARRASTO ---
    let activeComponent = null; // O componente que está sendo arrastado
    let offsetX = 0;
    let offsetY = 0;

    // --- LÓGICA DE ADIÇÃO POR BOTÃO ---
    library.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-btn')) {
            const type = e.target.dataset.type;
            // MELHORIA: Adiciona em cascata para não sobrepor
            const initialX = 50 + (systemState.components.length % 5) * 40;
            const initialY = 50 + (systemState.components.length % 5) * 40;
            createComponent(type, initialX, initialY);
        }
    });
    
    // --- FUNÇÕES DE CRIAÇÃO E GERENCIAMENTO DE COMPONENTES ---
    function createComponent(type, x, y) {
        componentCounter++;
        const id = `comp_${componentCounter}`;
        const newComponent = { id, type, x, y, data: {} };
        systemState.components.push(newComponent);
        renderWorkbench();
        openModalForComponent(id);
    }

    function renderWorkbench() {
        workbench.innerHTML = '';
        systemState.components.forEach(comp => {
            const el = document.createElement('div');
            el.className = `placed-component ${comp.type}`;
            el.id = comp.id;
            el.style.left = `${comp.x}px`;
            el.style.top = `${comp.y}px`;

            const label = document.createElement('div');
            label.className = 'component-label';
            label.textContent = `${comp.type.replace(/_/g, ' ')} #${comp.id.split('_')[1]}`;
            
            const dataDisplay = document.createElement('div');
            dataDisplay.className = 'component-data-display';
            dataDisplay.innerHTML = Object.entries(comp.data)
                .map(([key, val]) => `<span>${key.replace(/_/g, ' ')}: ${val}</span>`)
                .join('<br>');
            
            el.appendChild(label);
            el.appendChild(dataDisplay);
            workbench.appendChild(el);

            // Adiciona evento para abrir o modal ao clicar (sem arrastar)
            el.addEventListener('click', (e) => {
                if (!el.classList.contains('dragging')) {
                    openModalForComponent(comp.id);
                }
            });
            
            // --- NOVA LÓGICA PARA INICIAR O ARRASTO ---
            el.addEventListener('mousedown', startDrag);
            el.addEventListener('touchstart', startDrag, { passive: false });
        });
    }

    // --- FUNÇÕES PARA CONTROLAR O ARRASTO ---
    function startDrag(e) {
        e.preventDefault(); // Previne comportamentos padrão como selecionar texto
        activeComponent = e.currentTarget; // O div que foi clicado/tocado
        activeComponent.classList.add('dragging');

        // Calcula o offset: a diferença entre o clique e o canto superior esquerdo do elemento
        const rect = activeComponent.getBoundingClientRect();
        const touch = e.type === 'touchstart' ? e.touches[0] : e;
        
        offsetX = touch.clientX - rect.left;
        offsetY = touch.clientY - rect.top;

        // Adiciona os listeners para mover e soltar no documento inteiro
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    function drag(e) {
        if (activeComponent) {
            e.preventDefault();
            const touch = e.type === 'touchmove' ? e.touches[0] : e;
            const workbenchRect = workbench.getBoundingClientRect();

            // Calcula a nova posição do componente
            let newX = touch.clientX - workbenchRect.left - offsetX;
            let newY = touch.clientY - workbenchRect.top - offsetY;

            // Impede que o componente saia da bancada
            newX = Math.max(0, Math.min(newX, workbenchRect.width - activeComponent.offsetWidth));
            newY = Math.max(0, Math.min(newY, workbenchRect.height - activeComponent.offsetHeight));

            activeComponent.style.left = `${newX}px`;
            activeComponent.style.top = `${newY}px`;
        }
    }

    function endDrag() {
        if (activeComponent) {
            // Atualiza a posição no nosso objeto de estado
            const componentState = systemState.components.find(c => c.id === activeComponent.id);
            if (componentState) {
                componentState.x = parseFloat(activeComponent.style.left);
                componentState.y = parseFloat(activeComponent.style.top);
            }

            // Limpa tudo
            activeComponent.classList.remove('dragging');
            activeComponent = null;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('touchend', endDrag);

            // Re-renderiza para garantir que o estado de 'dragging' seja removido do clique
            setTimeout(() => renderWorkbench(), 0);
        }
    }

    // --- LÓGICA DO MODAL DE DADOS (sem alterações significativas) ---
    function openModalForComponent(id) {
        // ... (código da função openModalForComponent da versão anterior)
    }
    // ... (cole aqui as funções modalForm.addEventListener, modalCloseBtn.addEventListener)

    // --- LÓGICA DE ANÁLISE (sem alterações) ---
    analyzeButton.addEventListener('click', async () => {
        // ... (código da função analyzeButton.addEventListener da versão anterior)
    });
    
    function displayResults(results) {
        // ... (código da função displayResults da versão anterior)
    }

    // --- COLE AQUI AS FUNÇÕES COMPLETAS QUE FORAM RESUMIDAS ACIMA ---
    function openModalForComponent(id) { currentEditingComponentId = id; const component = systemState.components.find(c => c.id === id); if (!component) return; modalTitle.textContent = `Configurar ${component.type.replace(/_/g, ' ')}`; let fieldsHtml = ''; const data = component.data; switch (component.type) { case 'motor': fieldsHtml = `<div class="input-group"><label>Potência (kW)</label><input type="number" step="any" name="power_kw" required value="${data.power_kw || ''}"></div><div class="input-group"><label>Rotação (RPM)</label><input type="number" step="any" name="rpm" required value="${data.rpm || ''}"></div><hr><div class="input-group"><label>Eficiência do Motor (%)</label><input type="number" step="any" name="efficiency" value="${data.efficiency || '95'}"></div><div class="input-group"><label>Custo Energia (R$/kWh)</label><input type="number" step="any" name="cost_per_kwh" value="${data.cost_per_kwh || '0.75'}"></div><div class="input-group"><label>Horas de Operação/Dia</label><input type="number" step="any" name="operating_hours" value="${data.operating_hours || '8'}"></div>`; break; case 'polia_motora': case 'polia_movida': fieldsHtml = `<div class="input-group"><label>Diâmetro (mm)</label><input type="number" name="diameter" required value="${data.diameter || ''}"></div>`; if (component.type === 'polia_motora') { fieldsHtml += `<div class="input-group"><label>Tipo de Correia</label><select name="belt_type"><option value="V" ${data.belt_type === 'V' ? 'selected' : ''}>Em V</option><option value="sincronizadora" ${data.belt_type === 'sincronizadora' ? 'selected' : ''}>Sincronizadora</option><option value="plana" ${data.belt_type === 'plana' ? 'selected' : ''}>Plana</option></select></div>`; } break; case 'rolamento': fieldsHtml = `<div class="input-group"><label>Tipo de Rolamento</label><select name="bearing_type"><option value="esferas" ${data.bearing_type === 'esferas' ? 'selected' : ''}>Esferas</option><option value="rolos" ${data.bearing_type === 'rolos' ? 'selected' : ''}>Rolos</option></select></div><div class="input-group"><label>Carga Dinâmica C (N)</label><input type="number" name="dynamic_load_c" required value="${data.dynamic_load_c || ''}"></div>`; break; } modalFields.innerHTML = fieldsHtml; modal.classList.remove('hidden'); }
    modalForm.addEventListener('submit', (e) => { e.preventDefault(); const formData = new FormData(modalForm); const component = systemState.components.find(c => c.id === currentEditingComponentId); if (component) { for (let [key, value] of formData.entries()) { component.data[key] = value; } } modal.classList.add('hidden'); renderWorkbench(); });
    modalCloseBtn.addEventListener('click', () => { modal.classList.add('hidden'); });
    analyzeButton.addEventListener('click', async () => { if (systemState.components.length === 0) { alert("Bancada de trabalho vazia. Adicione componentes para analisar."); return; } const payload = { components: systemState.components, connections: [] }; try { const response = await fetch('/analyze_system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const results = await response.json(); if (results.error) { throw new Error(results.error); } displayResults(results); } catch (error) { resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro na análise:</strong> ${error.message}</div>`; resultsPanel.classList.remove('hidden'); } });
    function displayResults(results) { let html = ''; if (results.financeiro_energetico) { const fin = results.financeiro_energetico; html += `<h3>Análise Financeira e Energética</h3><ul><li>Eficiência da Transmissão: <strong>${fin.eficiencia_transmissao}</strong></li><li>Potência Perdida: <strong>${fin.potencia_perdida_watts} Watts</strong></li><li>Consumo Anual: <strong>${fin.consumo_anual_kwh.toLocaleString('pt-BR')} kWh</strong></li><li>Custo Anual (R$): <strong>${fin.custo_operacional_anual_brl.toLocaleString('pt-BR')}</strong></li></ul>`; } html += '<h3>Resultados Técnicos</h3><ul>'; for (const [key, value] of Object.entries(results.sistema)) { html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`; } html += '</ul>'; let componentLifespans = []; let componentHtml = '<h3>Análise de Vida Útil</h3><ul>'; let hasLifeData = false; for (const [id, data] of Object.entries(results)) { if (id.startsWith('comp_') && data.tipo === 'Rolamento') { hasLifeData = true; componentHtml += `<li>Vida Útil L10h (${id}): <strong>${data.vida_util_l10h.toLocaleString('pt-BR')} horas</strong></li>`; componentLifespans.push({ id, life: data.vida_util_l10h }); } } componentHtml += '</ul>'; if (hasLifeData) { html += componentHtml; componentLifespans.sort((a, b) => a.life - b.life); const weakestLink = componentLifespans[0]; html += `<h3 class="weakest-link">Elo Mais Fraco: ${weakestLink.id}</h3>`; } resultsContent.innerHTML = html; resultsPanel.classList.remove('hidden'); }
});
