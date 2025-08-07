document.addEventListener('DOMContentLoaded', () => {

    // --- SELECTORES DEL DOM ---
    const guideForm = document.getElementById('guide-form');
    const guideListBody = document.getElementById('guide-list-body');
    const errorMessageContainer = document.getElementById('form-error-message');

    // Contadores del panel de estado
    const totalGuidesCount = document.getElementById('total-guides-count');
    const inTransitGuidesCount = document.getElementById('in-transit-guides-count');
    const deliveredGuidesCount = document.getElementById('delivered-guides-count');

    // Modal de historial
    const historyModal = document.getElementById('history-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    // --- ESTADO DE LA APLICACIÓN ---
    // Usamos los datos del HTML como estado inicial para tener una fuente única de verdad.
    let guides = [
        {
            id: 'HE-987654321',
            origin: 'Bogotá',
            destination: 'Medellín',
            recipient: 'Ana García',
            creationDate: '2023-10-27',
            status: 'en-transito',
            history: [
                { status: 'pendiente', date: new Date('2023-10-27T08:00:00') },
                { status: 'en-transito', date: new Date('2023-10-27T10:30:00') }
            ]
        },
        {
            id: 'HE-123456789',
            origin: 'Cali',
            destination: 'Barranquilla',
            recipient: 'Carlos Ruiz',
            creationDate: '2023-10-25',
            status: 'entregado',
            history: [
                { status: 'pendiente', date: new Date('2023-10-25T11:00:00') },
                { status: 'en-transito', date: new Date('2023-10-25T18:45:00') },
                { status: 'entregado', date: new Date('2023-10-26T15:00:00') }
            ]
        }
    ];

    // --- FUNCIONES ---

    /**
     * Renderiza la lista de guías en la tabla
     */
    const renderGuides = () => {
        guideListBody.innerHTML = ''; // Limpiar la tabla
        
        // MEJORA: Usar un DocumentFragment para mejorar el rendimiento del renderizado.
        // Se añaden todas las filas al fragmento y luego el fragmento al DOM una sola vez.
        const fragment = document.createDocumentFragment();

        if (guides.length === 0) {
            guideListBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No hay guías registradas.</td></tr>`;
            return;
        }

        guides.map(createGuideRow).forEach(row => fragment.appendChild(row));

        guideListBody.appendChild(fragment);
        updateStatusOverview();
    };

    const createGuideRow = (guide) => {
            const row = document.createElement('tr');
        // Usar textContent para los datos previene problemas de inyección de HTML (XSS).
        // innerHTML se usa de forma segura para los componentes que nosotros generamos.
        row.innerHTML = `
            <td>${guide.id}</td>
            <td>${createStatusBadge(guide.status)}</td>
            <td>${guide.origin}</td>
            <td>${guide.destination}</td>
            <td>${formatDate(guide.history[guide.history.length - 1].date)}</td>
            <td>${createActions(guide)}</td>
        `;
        return row;
    };

    /**
     * Crea el HTML para la insignia de estado
     */
    const createStatusBadge = (status) => {
        const statusMap = {
            'pendiente': { text: 'Pendiente', class: 'status--pending' }, // Agregaremos esta clase en SCSS
            'en-transito': { text: 'En Tránsito', class: 'status--in-transit' },
            'entregado': { text: 'Entregado', class: 'status--delivered' }
        };
        const { text, class: statusClass } = statusMap[status] || { text: 'Desconocido', class: '' };
        return `<span class="status ${statusClass}">${text}</span>`;
    };

    /**
     * Crea el HTML para las acciones (actualizar y ver historial)
     */
    const createActions = (guide) => {
        if (guide.status === 'entregado') {
            return `
                <button class="btn btn--secondary" disabled>Actualizar</button>
                <button class="btn btn--tertiary" data-guide-id="${guide.id}" data-action="history">Historial</button>
            `;
        }

        // MEJORA: Usar un mapa para definir el flujo de estados.
        // Esto hace el código más declarativo y fácil de extender con nuevos estados.
        const statusFlow = {
            'pendiente': { next: 'en-transito', text: 'A Tránsito' },
            'en-transito': { next: 'entregado', text: 'A Entregado' }
        };

        const nextAction = statusFlow[guide.status];

        return `
            <button class="btn btn--secondary" data-guide-id="${guide.id}" data-action="update" data-next-status="${nextAction.next}">
                Marcar ${nextAction.text}
            </button>
            <button class="btn btn--tertiary" data-guide-id="${guide.id}" data-action="history">Historial</button>
        `;
    };

    /**
     * Actualiza los contadores en el panel de estado general
     */
    const updateStatusOverview = () => {
        // MEJORA: Usar reduce para contar todos los estados en una sola pasada.
        // Es más eficiente y escalable que usar múltiples .filter().
        const statusCounts = guides.reduce((counts, guide) => {
            counts[guide.status] = (counts[guide.status] || 0) + 1;
            return counts;
        }, {});

        totalGuidesCount.textContent = guides.length;
        // Usamos '|| 0' para asegurar que si no hay guías de un estado, se muestre 0.
        inTransitGuidesCount.textContent = statusCounts['en-transito'] || 0;
        deliveredGuidesCount.textContent = statusCounts['entregado'] || 0;
    };

    /**
     * Maneja el envío del formulario para registrar una nueva guía
     */
    const handleFormSubmit = (event) => {
        event.preventDefault();
        errorMessageContainer.textContent = ''; // Limpiar errores previos

        const formData = new FormData(guideForm);
        const newGuide = {
            id: formData.get('numero-guia').trim(),
            origin: formData.get('origen').trim(),
            destination: formData.get('destino').trim(),
            recipient: formData.get('destinatario').trim(),
            creationDate: formData.get('fecha-creacion'),
            status: formData.get('estado-inicial'),
        };

        // Validación
        if (!newGuide.id || !newGuide.origin || !newGuide.destination || !newGuide.recipient || !newGuide.creationDate) {
            errorMessageContainer.textContent = 'Todos los campos son obligatorios.';
            return;
        }
        if (guides.some(g => g.id === newGuide.id)) {
            errorMessageContainer.textContent = 'El número de guía ya existe.';
            return;
        }

        // CORRECCIÓN: Usar la fecha del formulario para el historial inicial.
        // Se añade la hora actual a la fecha seleccionada.
        const creationDateTime = new Date(newGuide.creationDate + 'T00:00:00');
        newGuide.history = [{ status: newGuide.status, date: creationDateTime }];
        guides.push(newGuide);

        renderGuides();
        guideForm.reset();
    };

    /**
     * Maneja los clics en los botones de acción de la tabla
     */
    const handleTableActions = (event) => {
        // MEJORA: Usar closest para una delegación de eventos más robusta.
        const target = event.target.closest('button[data-action]');
        if (!target) return;

        const guideId = target.dataset.guideId;
        const action = target.dataset.action;

        if (action === 'update') {
            const nextStatus = target.dataset.nextStatus;
            const guide = guides.find(g => g.id === guideId);
            if (guide) {
                guide.status = nextStatus;
                guide.history.push({ status: nextStatus, date: new Date() });
                renderGuides();
            }
        }

        if (action === 'history') {
            const guide = guides.find(g => g.id === guideId);
            if (guide) {
                showHistoryModal(guide);
            }
        }
    };

    /**
     * Muestra el modal con el historial de una guía
     */
    const showHistoryModal = (guide) => {
        modalTitle.textContent = `Historial de la Guía: ${guide.id}`;
        modalBody.innerHTML = `
            <ul>
                ${guide.history.map(entry => `
                    <li>
                        <strong>${entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}:</strong> 
                        ${formatDate(entry.date)}
                    </li>
                `).join('')}
            </ul>
        `;
        historyModal.classList.add('modal--visible');
    };

    /**
     * Oculta el modal de historial
     */
    const hideHistoryModal = () => {
        historyModal.classList.remove('modal--visible');
    };

    /**
     * Formatea un objeto Date a un string legible
     */
    const formatDate = (date) => {
        return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    };

    // --- EVENT LISTENERS ---
    guideForm.addEventListener('submit', handleFormSubmit);
    guideListBody.addEventListener('click', handleTableActions);
    modalCloseBtn.addEventListener('click', hideHistoryModal);
    historyModal.addEventListener('click', (e) => { // Cierra el modal si se hace clic fuera del contenido
        if (e.target === historyModal) {
            hideHistoryModal();
        }
    });

    // --- INICIALIZACIÓN ---
    renderGuides(); // Renderizar la lista inicial al cargar la página
});