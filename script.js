document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos principais
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
    
    // --- MELHORIA: Variável para o modo "tocar para colocar" ---
    let selectedComponentType = null;

    // --- LÓGICA DE TOQUE PARA SELECIONAR E COLOCAR ---
    library.addEventListener('click', (e) => {
        // Verifica se o clique foi em um item da biblioteca
        const componentItem = e.target.closest('.component-item');
        if (componentItem) {
            // Remove a seleção de qualquer outro item
            document.querySelectorAll('.component-item').forEach(item => item.classList.remove('selected'));
            
            // Adiciona a classe 'selected' ao item clicado
            componentItem.classList.add('selected');
            selectedComponentType = componentItem.dataset.type;
        }
    });

    workbench.addEventListener('click', (e) => {
        // Se um componente estiver selecionado na biblioteca...
        if (selectedComponentType) {
            const x = e.clientX - workbench.getBoundingClientRect().left;
            const y = e.clientY - workbench.getBoundingClientRect().top;
            
            // Cria o componente na posição do clique
            createComponent(selectedComponentType, x, y);

            // Limpa a seleção para que o usuário possa interagir normalmente
            document.querySelectorAll('.component-item').forEach(item => item.classList.remove('selected'));
            selectedComponentType = null;
        }
    });

    // --- FUNÇÕES DE CRIAÇÃO E GERENCIAMENTO (sem alterações) ---
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
            label.textContent = `${comp.type.replace('_', ' ')} #${comp.id.split('_')[1]}`;
            
            const dataDisplay = document.createElement('div');
            dataDisplay.className = 'component-data-display';
            dataDisplay.innerHTML = Object.entries(comp.data).map(([key, val]) => `<span>${key}: ${val}</span>`).join('<br>');
            
            el.appendChild(label);
            el.appendChild(dataDisplay);
            workbench.appendChild(el);
            
            el.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede que o clique no componente tente colocar outro item
                openModalForComponent(comp.id);
            });
        });
    }

    // --- LÓGICA DO MODAL DE DADOS (sem alterações) ---
    function openModalForComponent(id) {
        currentEditingComponentId = id;
        const component = systemState.components.find(c => c.id === id);
        modalTitle.textContent = `Configurar ${component.type.replace('_', ' ')}`;
        
        let fieldsHtml = '';
        switch (component.type) {
            case 'motor':
                fieldsHtml = `
                    <div class="input-group"><label>Potência (kW)</label><input type="number" name="power_kw" required value="${component.data.power_kw || ''}"></div>
                    <div class="input-group"><label>Rotação (RPM)</label><input type="number" name="rpm" required value="${component.data.rpm || ''}"></div>`;
                break;
            case 'polia_motora':
            case 'polia_movida':
                fieldsHtml = `<div class="input-group"><label>Diâmetro (mm)</label><input type="number" name="diameter" required value="${component.data.diameter || ''}"></div>`;
                break;
            case 'rolamento':
                fieldsHtml = `
                    <div class="input-group"><label>Tipo de Rolamento</label>
                        <select name="bearing_type">
                            <option value="esferas" ${component.data.bearing_type === 'esferas' ? 'selected' : ''}>Esferas</option>
                            <option value="rolos" ${component.data.bearing_type === 'rolos' ? 'selected' : ''}>Rolos</option>
                        </select>
                    </div>
                    <div class="input-group"><label>Carga Dinâmica C (N)</label><input type="number" name="dynamic_load_c" required value="${component.data.dynamic_load_c || ''}"></div>`;
                break;
        }
        modalFields.innerHTML = fieldsHtml;
        modal.classList.remove('hidden');
    }

    modalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(modalForm);
        const component = systemState.components.find(c => c.id === currentEditingComponentId);
        
        for (let [key, value] of formData.entries()) {
            component.data[key] = value;
        }
        
        modal.classList.add('hidden');
        renderWorkbench();
    });

    modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));

    // --- LÓGICA DE ANÁLISE (sem alterações) ---
    analyzeButton.addEventListener('click', async () => {
        if (systemState.components.length === 0) {
            alert("Bancada de trabalho vazia. Adicione componentes para analisar.");
            return;
        }
        const payload = { components: systemState.components, connections: [] };
        try {
            const response = await fetch('/analyze_system', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const results = await response.json();
            if (results.error) { throw new Error(results.error); }
            displayResults(results);
document.addEventListener('DOMContentLoaded', () => {
    // Referências (código inalterado)
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

    let systemState = { components: [], connections: [] };
    let componentCounter = 0;
    let currentEditingComponentId = null;
    let selectedComponentType = null;

    // Lógica de Toque (código inalterado)
    library.addEventListener('click', (e) => {
        const componentItem = e.target.closest('.component-item');
        if (componentItem) {
            document.querySelectorAll('.component-item').forEach(item => item.classList.remove('selected'));
            componentItem.classList.add('selected');
            selectedComponentType = componentItem.dataset.type;
        }
    });

    workbench.addEventListener('click', (e) => {
        if (selectedComponentType) {
            const x = e.clientX - workbench.getBoundingClientRect().left;
            const y = e.clientY - workbench.getBoundingClientRect().top;
            createComponent(selectedComponentType, x, y);
            document.querySelectorAll('.component-item').forEach(item => item.classList.remove('selected'));
            selectedComponentType = null;
        }
    });
    
    // Funções de Criação e Renderização (código inalterado)
    function createComponent(type, x, y) { /* ...código anterior... */ }
    function renderWorkbench() { /* ...código anterior... */ }

    // --- MELHORIA: Modal de Dados com Campos Adicionais ---
    function openModalForComponent(id) {
        currentEditingComponentId = id;
        const component = systemState.components.find(c => c.id === id);
        modalTitle.textContent = `Configurar ${component.type.replace('_', ' ')}`;
        
        let fieldsHtml = '';
        switch (component.type) {
            case 'motor':
                fieldsHtml = `
                    <div class="input-group"><label>Potência (kW)</label><input type="number" step="any" name="power_kw" required value="${component.data.power_kw || ''}"></div>
                    <div class="input-group"><label>Rotação (RPM)</label><input type="number" step="any" name="rpm" required value="${component.data.rpm || ''}"></div>
                    <hr>
                    <div class="input-group"><label>Eficiência do Motor (%)</label><input type="number" step="any" name="efficiency" value="${component.data.efficiency || '95'}"></div>
                    <div class="input-group"><label>Custo Energia (R$/kWh)</label><input type="number" step="any" name="cost_per_kwh" value="${component.data.cost_per_kwh || '0.75'}"></div>
                    <div class="input-group"><label>Horas de Operação/Dia</label><input type="number" step="any" name="operating_hours" value="${component.data.operating_hours || '8'}"></div>
                `;
                break;
            case 'polia_motora': // Polia motora agora tem tipo de correia
            case 'polia_movida':
                fieldsHtml = `<div class="input-group"><label>Diâmetro (mm)</label><input type="number" name="diameter" required value="${component.data.diameter || ''}"></div>`;
                if (component.type === 'polia_motora') {
                    fieldsHtml += `
                        <div class="input-group"><label>Tipo de Correia</label>
                            <select name="belt_type">
                                <option value="V" ${component.data.belt_type === 'V' ? 'selected' : ''}>Em V</option>
                                <option value="sincronizadora" ${component.data.belt_type === 'sincronizadora' ? 'selected' : ''}>Sincronizadora</option>
                                <option value="plana" ${component.data.belt_type === 'plana' ? 'selected' : ''}>Plana</option>
                            </select>
                        </div>`;
                }
                break;
            case 'rolamento':
                // (código inalterado)
                fieldsHtml = `...`; 
                break;
        }
        modalFields.innerHTML = fieldsHtml;
        modal.classList.remove('hidden');
    }
    
    // Lógica do Modal (código inalterado)
    modalForm.addEventListener('submit', (e) => { /* ...código anterior... */ });
    modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));

    // Lógica de Análise (código inalterado)
    analyzeButton.addEventListener('click', async () => { /* ...código anterior... */ });
    
    // --- MELHORIA: Exibição dos Novos Resultados ---
    function displayResults(results) {
        let html = '';
        
        // Seção Financeira e Energética
        if (results.financeiro_energetico) {
            const fin = results.financeiro_energetico;
            html += `<h3>Análise Financeira e Energética</h3><ul>
                <li>Eficiência da Transmissão: <strong>${fin.eficiencia_transmissao}</strong></li>
                <li>Potência Perdida: <strong>${fin.potencia_perdida_watts} Watts</strong></li>
                <li>Consumo Anual: <strong>${fin.consumo_anual_kwh.toLocaleString('pt-BR')} kWh</strong></li>
                <li>Custo Anual (R$): <strong>${fin.custo_operacional_anual_brl.toLocaleString('pt-BR')}</strong></li>
            </ul>`;
        }

        // Seção de Resultados do Sistema
        html += '<h3>Resultados Técnicos</h3><ul>';
        for (const [key, value] of Object.entries(results.sistema)) {
            html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`;
        }
        html += '</ul>';
        
        // Seção de Análise de Componentes
        let componentLifespans = [];
        let componentHtml = '<h3>Análise de Vida Útil</h3><ul>';
        let hasLifeData = false;
        for (const [id, data] of Object.entries(results)) {
            if (id.startsWith('comp_') && data.tipo === 'Rolamento') {
                hasLifeData = true;
                componentHtml += `<li>Vida Útil L10h (${id}): <strong>${data.vida_util_l10h.toLocaleString('pt-BR')} horas</strong></li>`;
                componentLifespans.push({ id, life: data.vida_util_l10h });
            }
        }
        componentHtml += '</ul>';

        if (hasLifeData) {
            html += componentHtml;
            // Encontra o elo mais fraco
            componentLifespans.sort((a, b) => a.life - b.life);
            const weakestLink = componentLifespans[0];
            html += `<h3 class="weakest-link">Elo Mais Fraco: ${weakestLink.id}</h3>`;
        }

        resultsContent.innerHTML = html;
        resultsPanel.classList.remove('hidden');
    }

    // Cole aqui as funções que não foram alteradas
    function createComponent(type, x, y) { componentCounter++; const id = `comp_${componentCounter}`; const newComponent = { id, type, x, y, data: {} }; systemState.components.push(newComponent); renderWorkbench(); openModalForComponent(id); }
    function renderWorkbench() { workbench.innerHTML = ''; systemState.components.forEach(comp => { const el = document.createElement('div'); el.className = `placed-component ${comp.type}`; el.id = comp.id; el.style.left = `${comp.x}px`; el.style.top = `${comp.y}px`; const label = document.createElement('div'); label.className = 'component-label'; label.textContent = `${comp.type.replace('_', ' ')} #${comp.id.split('_')[1]}`; const dataDisplay = document.createElement('div'); dataDisplay.className = 'component-data-display'; dataDisplay.innerHTML = Object.entries(comp.data).map(([key, val]) => `<span>${key}: ${val}</span>`).join('<br>'); el.appendChild(label); el.appendChild(dataDisplay); workbench.appendChild(el); el.addEventListener('click', (e) => { e.stopPropagation(); openModalForComponent(comp.id); }); }); }
    modalForm.addEventListener('submit', (e) => { e.preventDefault(); const formData = new FormData(modalForm); const component = systemState.components.find(c => c.id === currentEditingComponentId); for (let [key, value] of formData.entries()) { component.data[key] = value; } modal.classList.add('hidden'); renderWorkbench(); });
    analyzeButton.addEventListener('click', async () => { if (systemState.components.length === 0) { alert("Bancada de trabalho vazia. Adicione componentes para analisar."); return; } const payload = { components: systemState.components, connections: [] }; try { const response = await fetch('/analyze_system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const results = await response.json(); if (results.error) { throw new Error(results.error); } displayResults(results); } catch (error) { resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro na análise:</strong> ${error.message}</div>`; resultsPanel.classList.remove('hidden'); } });
});

