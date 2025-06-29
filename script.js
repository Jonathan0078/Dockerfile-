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

    // --- LÓGICA DE DRAG & DROP ---
    library.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('component-item')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.type);
        }
    });

    workbench.addEventListener('dragover', (e) => e.preventDefault());

    workbench.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        const x = e.clientX - workbench.getBoundingClientRect().left;
        const y = e.clientY - workbench.getBoundingClientRect().top;
        createComponent(type, x, y);
    });

    // --- FUNÇÕES DE CRIAÇÃO E GERENCIAMENTO ---
    function createComponent(type, x, y) {
        componentCounter++;
        const id = `comp_${componentCounter}`;
        const newComponent = { id, type, x, y, data: {} };
        systemState.components.push(newComponent);
        renderWorkbench();
        openModalForComponent(id);
    }

    function renderWorkbench() {
        workbench.innerHTML = ''; // Limpa e redesenha tudo
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
            
            // Adicionar evento de clique para re-editar
            el.addEventListener('click', () => openModalForComponent(comp.id));
        });
    }

    // --- LÓGICA DO MODAL DE DADOS ---
    function openModalForComponent(id) {
        currentEditingComponentId = id;
        const component = systemState.components.find(c => c.id === id);
        modalTitle.textContent = `Configurar ${component.type.replace('_', ' ')}`;
        
        let fieldsHtml = '';
        // Define os campos necessários para cada tipo de componente
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

    // --- LÓGICA DE ANÁLISE ---
    analyzeButton.addEventListener('click', async () => {
        if (systemState.components.length === 0) {
            alert("Bancada de trabalho vazia. Adicione componentes para analisar.");
            return;
        }

        // Simplificação: Conexões implícitas pela ordem e tipo. Poderia ser expandido com linhas visuais.
        const payload = { components: systemState.components, connections: [] };

        try {
            const response = await fetch('/analyze_system', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const results = await response.json();
            
            if (results.error) {
                throw new Error(results.error);
            }

            displayResults(results);
        } catch (error) {
            resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro na análise:</strong> ${error.message}</div>`;
            resultsPanel.classList.remove('hidden');
        }
    });
    
    function displayResults(results) {
        let html = '<h3>Resultados Gerais</h3><ul>';
        for (const [key, value] of Object.entries(results.sistema)) {
            html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`;
        }
        html += '</ul><h3>Análise de Componentes</h3><ul>';

        let componentLifespans = [];
        for (const [id, data] of Object.entries(results)) {
            if (id !== 'sistema') {
                html += `<li>Vida Útil L10h (${id}): <strong>${data.vida_util_l10h.toLocaleString('pt-BR')} horas</strong></li>`;
                componentLifespans.push({ id, life: data.vida_util_l10h });
            }
        }
        
        // Encontra o elo mais fraco
        if (componentLifespans.length > 0) {
            componentLifespans.sort((a, b) => a.life - b.life);
            const weakestLink = componentLifespans[0];
            html += `</ul><h3 class="weakest-link">Elo Mais Fraco: ${weakestLink.id}</h3>`;
        }

        resultsContent.innerHTML = html;
        resultsPanel.classList.remove('hidden');
    }
});
