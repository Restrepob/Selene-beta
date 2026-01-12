const searchOverlay = document.getElementById('search-overlay');
const modalInput = document.querySelector('.modal-search-bar');

let tempSelectedCourses = [];
let activeSearchTrigger = null;

function openSearchModal(trigger) {
    activeSearchTrigger = trigger;

    // 1. Medir posición inicial (First)
    const startRect = trigger.getBoundingClientRect();

    // 2. Mostrar modal para medir posición final (Last)
    searchOverlay.classList.add('active');

    const endRect = modalInput.getBoundingClientRect();

    // 3. Calcular diferencias (Invert)
    const scaleX = startRect.width / endRect.width;
    const scaleY = startRect.height / endRect.height;
    const translateX = startRect.left - endRect.left;
    const translateY = startRect.top - endRect.top;

    // 4. Aplicar transformación inicial sin animación
    modalInput.style.transition = 'none';
    modalInput.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

    // Ocultar la barra original para evitar duplicados visuales
    trigger.style.opacity = '0';

    // 5. Forzar reflow y animar (Play)
    requestAnimationFrame(() => {
        modalInput.style.transition = 'transform 0.3s cubic-bezier(0.1, 0, 0.2, 0.2)';
        modalInput.style.transform = 'none';
        modalInput.focus();
    });

    // Inicializar estado temporal con las materias ya seleccionadas
    tempSelectedCourses = JSON.parse(JSON.stringify(selectedCourses));
    renderStagedCourses();
    applyFilters(); // Para ocultar las ya seleccionadas de la búsqueda
}

searchOverlay.addEventListener('click', (e) => {
    // Cierra si se hace clic en el fondo oscuro (fuera del modal)
    if (e.target === searchOverlay) {
        closeSearchModal();
    }
});

const closeModalBtn = document.querySelector('.close-modal-btn');
const acceptModalBtn = document.querySelector('.accept-modal-btn');

function closeSearchModal() {
    searchOverlay.classList.remove('active');
    if (activeSearchTrigger) {
        activeSearchTrigger.style.opacity = '1';
        activeSearchTrigger = null;
    }
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeSearchModal);

if (acceptModalBtn) {
    acceptModalBtn.addEventListener('click', () => {
        selectedCourses = JSON.parse(JSON.stringify(tempSelectedCourses));
        saveSelectedCourses();
        renderCards();
        renderSchedule();
        closeSearchModal();
    });
}

// Lógica para añadir y eliminar tags opcionales
const addTagBtn = document.querySelector('.add-tag');
const opcionalesContainer = document.querySelector('.opcionales');
const tagsContainer = document.querySelector('.tags');

// Crear el menú desplegable dinámicamente
const menu = document.createElement('div');
menu.className = 'options-menu';
document.body.appendChild(menu);

addTagBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    // Obtener tags disponibles (los que están ocultos en opcionales)
    const hiddenTags = Array.from(opcionalesContainer.children);

    if (hiddenTags.length === 0) {
        return; // No hay más opciones
    }

    // Limpiar y llenar el menú
    menu.innerHTML = '';
    hiddenTags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'options-menu-item';
        // Usamos el texto de la pregunta como etiqueta del menú
        item.textContent = tag.querySelector('.quest').textContent;

        item.addEventListener('click', () => {
            moveTagToVisible(tag);
            menu.classList.remove('active');
        });
        menu.appendChild(item);
    });

    // Posicionar el menú cerca del botón +
    const rect = addTagBtn.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;

    menu.classList.add('active');
});

function moveTagToVisible(tag) {
    // Añadir botón de eliminar si no existe
    if (!tag.querySelector('.remove-tag')) {
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-tag';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Devolver al contenedor oculto
            opcionalesContainer.appendChild(tag);
            applyFilters();
        });
        tag.appendChild(removeBtn);
    }
    // Mover visualmente antes del botón +
    tagsContainer.insertBefore(tag, addTagBtn);
    applyFilters();
}

// Editor de valores para los tags
const valueEditor = document.createElement('div');
valueEditor.className = 'value-editor';
document.body.appendChild(valueEditor);

let currentEditingTag = null;

tagsContainer.addEventListener('click', (e) => {
    // Si el click fue en el botón de eliminar o en el botón de añadir, ignorar
    if (e.target.classList.contains('remove-tag') || e.target.closest('.add-tag')) return;

    const tag = e.target.closest('.tag');
    if (!tag) return;

    const opDiv = tag.querySelector('.op');
    const questDiv = tag.querySelector('.quest');

    // Solo editar si tiene estructura de pregunta/opción
    if (opDiv && questDiv) {
        e.stopPropagation();
        currentEditingTag = tag;
        showEditor(tag, questDiv.textContent, opDiv.textContent);
    }
});

function getUniqueValues(key) {
    if (!allCourses) return [];
    const values = new Set();
    allCourses.forEach(course => {
        if (course[key]) {
            values.add(course[key]);
        }
    });
    return Array.from(values).sort();
}

function getProgramsByFaculty(facultyName) {
    if (!allCourses) return [];
    const programs = new Set();
    const targetFaculty = normalizeText(facultyName);

    allCourses.forEach(course => {
        if (course.faculty && course.program) {
            if (normalizeText(course.faculty) === targetFaculty) {
                programs.add(course.program);
            }
        }
    });
    return Array.from(programs).sort();
}

const planOptions = [
    "5904 ADMINISTRACIÓN DE EMPRESAS",
    "241 ADMINISTRACIÓN DE EMPRESAS",
    "2520 ADMINISTRACIÓN DE EMPRESAS",
    "4026 ADMINISTRACIÓN DE EMPRESAS (DI)",
    "4027 ADMINISTRACIÓN DE EMPRESAS (IN)",
    "4029 ADMINISTRACIÓN DE SISTEMAS INFORMÁTICOS",
    "4035 ADMINISTRACIÓN DE SISTEMAS INFORMÁTICOS",
    "2523 ANTROPOLOGÍA",
    "2529 ANTROPOLOGÍA – PROGRAMA ESPECIAL DE ADMISIÓN POR ÁREAS DEL CONOCIMIENTO",
    "2506 ARQUITECTURA",
    "3501 ARQUITECTURA",
    "4025 ARQUITECTURA",
    "2507 ARTES PLÁSTICAS",
    "3502 ARTES PLÁSTICAS",
    "8PEL ASIGNATURAS DE LIBRE ELECCIÓN",
    "L001 BIOLOGÍA",
    "2513 BIOLOGÍA",
    "2538 CIENCIA POLÍTICA",
    "3512 CIENCIA POLÍTICA",
    "2933 CIENCIAS DE LA COMPUTACIÓN",
    "3647 CIENCIAS DE LA COMPUTACIÓN",
    "4034 CIENCIAS DE LA COMPUTACIÓN",
    "2508 CINE Y TELEVISIÓN",
    "2CLE COMPONENTE DE LIBRE ELECCIÓN",
    "4CLE COMPONENTE DE LIBRE ELECCIÓN",
    "0CLE COMPONENTE DE LIBRE ELECCIÓN SEDE LA PAZ",
    "3CLE COMPONENTE ELECTIVO PREGRADO",
    "4031 CONSTRUCCIÓN",
    "3503 CONSTRUCCIÓN",
    "2521 CONTADURÍA PÚBLICA",
    "2539 DERECHO",
    "2509 DISEÑO GRÁFICO",
    "2510 DISEÑO INDUSTRIAL",
    "5932 DISEÑO INDUSTRIAL",
    "2522 ECONOMÍA",
    "3513 ECONOMÍA",
    "2540 ENFERMERÍA",
    "2526 ESPAÑOL Y FILOLOGÍA CLÁSICA",
    "L002 ESTADÍSTICA",
    "2514 ESTADÍSTICA",
    "3504 ESTADÍSTICA",
    "4036 ESTADÍSTICA",
    "PVIS ESTUDIANTES QUE VIENEN DE OTRAS UNIVERSIDADES O INSTITUCIONES",
    "AVIS ESTUDIANTES VISITANTES",
    "CVIS ESTUDIANTES VISITANTES",
    "OVIS ESTUDIANTES VISITANTES",
    "ZVIS ESTUDIANTES VISITANTES",
    "2534 ESTUDIOS LITERARIOS",
    "2515 FARMACIA",
    "2524 FILOLOGÍA E IDIOMAS ALEMÁN",
    "2525 FILOLOGÍA E IDIOMAS FRANCÉS",
    "2527 FILOLOGÍA E IDIOMAS INGLÉS",
    "2530 FILOSOFÍA",
    "2977 FILOSOFÍA",
    "2516 FÍSICA",
    "2550 FISIOTERAPIA",
    "2551 FONOAUDIOLOGÍA",
    "L003 GEOGRAFÍA",
    "2531 GEOGRAFÍA",
    "2757 GEOGRAFÍA – PROGRAMA ESPECIAL DE ADMISIÓN POR ÁREAS DEL CONOCIMIENTO",
    "2517 GEOLOGÍA",
    "4033 GESTIÓN CULTURAL Y COMUNICATIVA",
    "L004 GESTIÓN CULTURAL Y COMUNICATIVA",
    "2523 HISTORIA",
    "3514 HISTORIA",
    "3515 INGENIERÍA ADMINISTRATIVA",
    "3528 INGENIERÍA ADMINISTRATIVA",
    "5925 INGENIERÍA AGRÍCOLA",
    "2541 INGENIERÍA AGRÍCOLA",
    "3508 INGENIERÍA AGRÍCOLA",
    "5964 INGENIERÍA AGROINDUSTRIAL",
    "5970 INGENIERÍA AGRONÓMICA",
    "2505 INGENIERÍA AGRONÓMICA",
    "3509 INGENIERÍA AGRONÓMICA",
    "2364 INGENIERÍA AGRONÓMICA – PROGRAMA ESPECIAL DE ADMISIÓN POR ÁREAS DEL CONOCIMIENTO",
    "5948 INGENIERÍA AMBIENTAL",
    "3527 INGENIERÍA AMBIENTAL",
    "3529 INGENIERÍA AMBIENTAL",
    "L005 INGENIERÍA BIOLÓGICA",
    "3505 INGENIERÍA BIOLÓGICA",
    "4037 INGENIERÍA BIOLÓGICA",
    "4021 INGENIERÍA CIVIL",
    "2542 INGENIERÍA CIVIL",
    "3516 INGENIERÍA CIVIL",
    "3530 INGENIERÍA CIVIL",
    "3517 INGENIERÍA DE CONTROL",
    "3531 INGENIERÍA DE CONTROL",
    "3518 INGENIERÍA DE MINAS Y METALURGIA",
    "3532 INGENIERÍA DE MINAS Y METALURGIA",
    "3519 INGENIERÍA DE PETRÓLEOS",
    "3533 INGENIERÍA DE PETRÓLEOS",
    "2543 INGENIERÍA DE SISTEMAS",
    "3520 INGENIERÍA DE SISTEMAS E INFORMÁTICA",
    "3534 INGENIERÍA DE SISTEMAS E INFORMÁTICA",
    "2474 INGENIERÍA DE SISTEMAS Y COMPUTACIÓN",
    "2879 INGENIERÍA DE SISTEMAS Y COMPUTACIÓN",
    "4022 INGENIERÍA ELÉCTRICA",
    "2544 INGENIERÍA ELÉCTRICA",
    "2983 INGENIERÍA ELÉCTRICA",
    "3521 INGENIERÍA ELÉCTRICA",
    "3535 INGENIERÍA ELÉCTRICA",
    "4028 INGENIERÍA ELECTRÓNICA",
    "2545 INGENIERÍA ELECTRÓNICA",
    "4099 INGENIERÍA ELECTRÓNICA",
    "4030 INGENIERÍA FÍSICA",
    "3506 INGENIERÍA FÍSICA",
    "3510 INGENIERÍA FORESTAL",
    "M364 INGENIERÍA FORESTAL – ADMISIÓN POR ÁREAS – SEDE MEDELLÍN",
    "3522 INGENIERÍA GEOLÓGICA",
    "3536 INGENIERÍA GEOLÓGICA",
    "4024 INGENIERÍA INDUSTRIAL",
    "2546 INGENIERÍA INDUSTRIAL",
    "3523 INGENIERÍA INDUSTRIAL",
    "3537 INGENIERÍA INDUSTRIAL",
    "2547 INGENIERÍA MECÁNICA",
    "3524 INGENIERÍA MECÁNICA",
    "3538 INGENIERÍA MECÁNICA",
    "L006 INGENIERÍA MECATRÓNICA",
    "2548 INGENIERÍA MECATRÓNICA",
    "4023 INGENIERÍA QUÍMICA",
    "2549 INGENIERÍA QUÍMICA",
    "3525 INGENIERÍA QUÍMICA",
    "3539 INGENIERÍA QUÍMICA",
    "2837 LINGÜÍSTICA",
    "4032 MATEMÁTICAS",
    "2518 MATEMÁTICAS",
    "3507 MATEMÁTICAS",
    "2552 MEDICINA",
    "9PEL PROGRAMA DE ASIGNATURAS DE LIBRE ELECCIÓN",
    "GEPL PROGRAMA DEL COMPONENTE DE LIBRE ELECCIÓN",
    "ZEMZ PROGRAMA ELECTIVAS SEDE MANIZALES",
    "MVIS PROGRAMA ESPECIAL VISITANTE",
    "2535 PSICOLOGÍA",
    "2977 PSICOLOGÍA",
    "2519 QUÍMICA",
    "3705 QUÍMICA",
    "2536 SOCIOLOGÍA",
    "3526 TECNOLOGÍA FORESTAL",
    "2554 TERAPIA OCUPACIONAL",
    "2952 TERAPIA OCUPACIONAL",
    "2537 TRABAJO SOCIAL",
    "2556 ZOOTECNIA",
    "2990 ZOOTECNIA",
    "3511 ZOOTECNIA",
    "5982 ZOOTECNIA"
];

function showEditor(tag, label, currentValue) {
    valueEditor.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'editor-title';
    title.textContent = label;
    valueEditor.appendChild(title);

    const lowerLabel = label.toLowerCase();
    let options = null;

    // Definir listas de opciones según la etiqueta
    if (lowerLabel.includes('nivel')) {
        options = ['Pregrado', 'Doctorado', 'Postgrados y másteres'];
    } else if (lowerLabel.includes('sede')) {
        options = [
            '1125 SEDE AMAZONIA', '1101 SEDE BOGOTÁ', '1126 SEDE CARIBE', '9933 SEDE DE LA PAZ',
            '1103 SEDE MANIZALES', '1102 SEDE MEDELLÍN', '1124 SEDE ORINOQUIA', '1104 SEDE PALMIRA',
            '9920 SEDE TUMACO'
        ];
    } else if (lowerLabel.includes('facultad')) {
        options = [
            '3064 FACULTAD DE ARQUITECTURA', '3065 FACULTAD DE CIENCIAS', '3050 FACULTAD DE CIENCIAS (Admisión PAET)',
            '3442 FACULTAD DE CIENCIAS AGRARIAS', '3066 FACULTAD DE CIENCIAS AGROPECUARIAS',
            '3067 FACULTAD DE CIENCIAS HUMANAS Y ECONÓMICAS', '3054 FACULTAD DE ENFERMERÍA (Admisión PAET)',
            '3068 FACULTAD DE MINAS', '3 SEDE MEDELLÍN'
        ];
        options = getUniqueValues('faculty');
    } else if (lowerLabel.includes('programa')) {
        options = [
            '3515 INGENIERÍA ADMINISTRATIVA', '3528 INGENIERÍA ADMINISTRATIVA',
            '3527 INGENIERÍA AMBIENTAL', '3529 INGENIERÍA AMBIENTAL',
            '3516 INGENIERÍA CIVIL', '3530 INGENIERÍA CIVIL',
            '3517 INGENIERÍA DE CONTROL', '3531 INGENIERÍA DE CONTROL',
            '3518 INGENIERÍA DE MINAS Y METALURGIA', '3532 INGENIERÍA DE MINAS Y METALURGIA',
            '3519 INGENIERÍA DE PETRÓLEOS', '3533 INGENIERÍA DE PETRÓLEOS',
            '3520 INGENIERÍA DE SISTEMAS E INFORMÁTICA', '3534 INGENIERÍA DE SISTEMAS E INFORMÁTICA',
            '3521 INGENIERÍA ELÉCTRICA', '3535 INGENIERÍA ELÉCTRICA',
            '3522 INGENIERÍA GEOLÓGICA', '3536 INGENIERÍA GEOLÓGICA',
            '3523 INGENIERÍA INDUSTRIAL', '3537 INGENIERÍA INDUSTRIAL',
            '3524 INGENIERÍA MECÁNICA', '3538 INGENIERÍA MECÁNICA',
            '3525 INGENIERÍA QUÍMICA', '3539 INGENIERÍA QUÍMICA'
        ];
        const tags = Array.from(document.querySelectorAll('.tags .tag'));
        const facultyTag = tags.find(t => {
            const q = t.querySelector('.quest');
            return q && normalizeText(q.textContent).includes('facultad');
        });

        if (facultyTag) {
            const selectedFaculty = facultyTag.querySelector('.op').textContent;
            if (selectedFaculty && selectedFaculty.trim() !== '') {
                options = getProgramsByFaculty(selectedFaculty);
            } else {
                options = getUniqueValues('program');
            }
        } else {
            options = getUniqueValues('program');
        }
    } else if (lowerLabel.includes('tipología') || lowerLabel.includes('tipologia')) {
        options = [
            'TODAS MENOS LIBRE ELECCIÓN', 'DISCIPLINAR OBLIGATORIA', 'NIVELACIÓN',
            'TRABAJO DE GRADO', 'FUND. OBLIGATORIA', 'DISCIPLINAR OPTATIVA',
            'FUND. OPTATIVA', 'LIBRE ELECCIÓN'
        ];
    } else if (lowerLabel.includes('dias')) {
        options = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    } else if (lowerLabel.includes('por que deseas buscar') || lowerLabel.includes('por qué deseas buscar')) {
        options = ['Por facultad y plan', 'Por plan de estudios'];
    } else if (lowerLabel.includes('por que plan') || lowerLabel.includes('por qué plan')) {
        options = planOptions;
    }

    if (options) {
        // Renderizar lista de opciones (sin botón guardar)
        const listContainer = document.createElement('div');
        listContainer.style.display = 'flex';
        listContainer.style.flexDirection = 'column';
        listContainer.style.gap = '2px';

        options.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'editor-option-item';
            item.textContent = opt;

            let allowed = true;
            if (lowerLabel.includes('sede') && !normalizeText(opt).includes('medellin')) allowed = false;
            if (lowerLabel.includes('nivel') && normalizeText(opt) !== 'pregrado') allowed = false;

            if (allowed) {
                // Guardar inmediatamente al hacer clic
                item.onclick = () => saveValue(opt);
            } else {
                item.style.opacity = '0.5';
                item.style.cursor = 'not-allowed';
                item.title = 'Opción no disponible';
            }
            listContainer.appendChild(item);
        });
        valueEditor.appendChild(listContainer);
    } else {
        // Caso por defecto (ej: Créditos) mantiene input y botón
        const input = document.createElement('input');
        input.className = 'editor-input';
        input.type = 'number';
        input.placeholder = 'Ej: 3';
        input.value = currentValue.match(/\d+/) ? currentValue : '';

        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveValue(input.value); });
        const saveBtn = document.createElement('button');
        saveBtn.className = 'editor-save-btn';
        saveBtn.textContent = 'Guardar';
        saveBtn.onclick = () => saveValue(input.value);

        valueEditor.appendChild(input);
        valueEditor.appendChild(saveBtn);
        setTimeout(() => input.focus(), 0);
    }

    // Posicionar
    const rect = tag.getBoundingClientRect();
    valueEditor.style.top = `${rect.bottom + window.scrollY + 8}px`;
    valueEditor.style.left = `${rect.left + window.scrollX}px`;

    valueEditor.classList.add('active');
}

function saveValue(val) {
    if (currentEditingTag && val) {
        currentEditingTag.querySelector('.op').textContent = val;

        const quest = currentEditingTag.querySelector('.quest');
        if (quest) {
            const questText = normalizeText(quest.textContent);
            if (questText.includes('tipologia')) {
                updateSearchReasonTag(val);
            } else if (questText.includes('por que deseas buscar') || questText.includes('por qué deseas buscar')) {
                updatePlanTag(val);
            }
        }

        if (quest && normalizeText(quest.textContent).includes('facultad')) {
            const tags = Array.from(document.querySelectorAll('.tags .tag'));
            const programTag = tags.find(t => {
                const q = t.querySelector('.quest');
                return q && normalizeText(q.textContent).includes('programa');
            });
            if (programTag) {
                programTag.querySelector('.op').textContent = '';
            }
        }

        applyFilters();
    }
    valueEditor.classList.remove('active');
    currentEditingTag = null;
}

function updateSearchReasonTag(val) {
    const tagId = 'dynamic-search-reason-tag';
    let existingTag = document.getElementById(tagId);
    const isLibreEleccion = normalizeText(val) === 'libre eleccion';

    if (isLibreEleccion) {
        if (!existingTag) {
            const newTag = document.createElement('div');
            newTag.className = 'tag';
            newTag.id = tagId;
            newTag.innerHTML = `<div class="quest">¿Por qué deseas buscar?</div><div class="op">Por facultad y plan</div><div class="desplegar"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M480-360 280-560h400L480-360Z" /></svg></div>`;
            currentEditingTag.insertAdjacentElement('afterend', newTag);
        }
    } else {
        if (existingTag) {
            existingTag.remove();
        }
        // También remover los tags dinámicos si existen
        ['dynamic-plan-tag', 'dynamic-sede-tag', 'dynamic-faculty-tag', 'dynamic-program-tag'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }
}

function updatePlanTag(val) {
    const planTagId = 'dynamic-plan-tag';
    const sedeTagId = 'dynamic-sede-tag';
    const facultyTagId = 'dynamic-faculty-tag';
    const programTagId = 'dynamic-program-tag';

    // Remove existing tags
    [planTagId, sedeTagId, facultyTagId, programTagId].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    const normalizedVal = normalizeText(val);

    if (normalizedVal === 'por plan de estudios') {
        const newTag = document.createElement('div');
        newTag.className = 'tag';
        newTag.id = planTagId;
        newTag.innerHTML = `<div class="quest">¿Por qué plan?</div><div class="op">Seleccionar</div><div class="desplegar"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M480-360 280-560h400L480-360Z" /></svg></div>`;
        currentEditingTag.insertAdjacentElement('afterend', newTag);
    } else if (normalizedVal === 'por facultad y plan') {
        // Insertar en orden inverso para que queden: Sede, Facultad, Plan
        
        // 3. ¿Por qué plan?
        const t3 = document.createElement('div');
        t3.className = 'tag';
        t3.id = programTagId;
        t3.innerHTML = `<div class="quest">¿Por qué plan?</div><div class="op">Seleccionar</div><div class="desplegar"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M480-360 280-560h400L480-360Z" /></svg></div>`;
        currentEditingTag.insertAdjacentElement('afterend', t3);

        // 2. ¿Por qué facultad?
        const t2 = document.createElement('div');
        t2.className = 'tag';
        t2.id = facultyTagId;
        t2.innerHTML = `<div class="quest">¿Por qué facultad?</div><div class="op">Seleccionar</div><div class="desplegar"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M480-360 280-560h400L480-360Z" /></svg></div>`;
        currentEditingTag.insertAdjacentElement('afterend', t2);

        // 1. ¿Por qué sede?
        const t1 = document.createElement('div');
        t1.className = 'tag';
        t1.id = sedeTagId;
        t1.innerHTML = `<div class="quest">¿Por qué sede?</div><div class="op">Seleccionar</div><div class="desplegar"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M480-360 280-560h400L480-360Z" /></svg></div>`;
        currentEditingTag.insertAdjacentElement('afterend', t1);
    }
}

document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== addTagBtn) {
        menu.classList.remove('active');
    }
    if (!valueEditor.contains(e.target) && currentEditingTag && !currentEditingTag.contains(e.target)) {
        valueEditor.classList.remove('active');
        currentEditingTag = null;
    }
    if (!colorPicker.contains(e.target) && !e.target.classList.contains('color-indicator')) {
        colorPicker.classList.remove('active');
    }
});

// Lógica del selector de color para las cards
const colorPicker = document.createElement('div');
colorPicker.className = 'color-picker-popover';
document.body.appendChild(colorPicker);

const colors = [
    { bg: '#1f2a44', text: '#dfe6f1' }, // og1
    { bg: '#ceedb2', text: '#0b4937' }, // og2
    { bg: '#efe6d4', text: '#1c0090' }, // og3
    { bg: '#84abd6', text: '#feffb9' }, // og4
    { bg: '#0b4937', text: '#ceedb2' }, // og5
    { bg: '#c2c8a0', text: '#2e3524' }, // sage light
    { bg: '#c6d9ec', text: '#354c39' }, // blue sky
    { bg: '#f9e793', text: '#0029ff' }, // amarillo sunshube
    { bg: '#1a0088', text: '#ebece7' }, // azul
    { bg: '#2d1b3f', text: '#f2e9ff' }, // purple night
    { bg: '#0f4c5c', text: '#e6f7f9' }, // deep teal
    { bg: '#8c1d18', text: '#f6e4dc' }, // wine red
    { bg: '#f2c94c', text: '#2b2b2b' }, // warm mustard
    { bg: '#18191c', text: '#c8c2b9' },  // nylon gray

    { bg: '#3a6b35', text: '#eef4ea' }, // forest green
    { bg: '#f1b2c4', text: '#3a1c2a' }, // dusty rose
    { bg: '#5f4b8b', text: '#efeaff' }, // muted violet
    { bg: '#b6cf4f', text: '#1a008d' }, // verde claro
    { bg: '#e07a5f', text: '#fff1ec' }, // clay coral
    { bg: '#222831', text: '#f2f2f2' }, // charcoal blue
    { bg: '#ffb8a4', text: '#222114' }, // rosa salmon
    { bg: '#7a3e3e', text: '#f3e6e6' }, // muted brick
    { bg: '#b8b42d', text: '#1f2400' }, // olive lime
    { bg: '#264653', text: '#e9f5f7' }, // blue petrol
    { bg: '#f4f1de', text: '#3d405b' },  // warm paper
    { bg: '#961a22', text: '#f0a32a' }, // t
    { bg: '#fe6b35', text: '#f9e4c3' }, // t
    { bg: '#f6e1c6', text: '#286687' }, // t
    { bg: '#004e89', text: '#e9e7d6' }, // t
    { bg: '#1c649d', text: '#edf9fe' }, // t
];

let currentColorIndicator = null;

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('color-indicator')) {
        e.stopPropagation();
        currentColorIndicator = e.target;
        const rect = e.target.getBoundingClientRect();

        // Re-popular el selector para manejar colores usados
        colorPicker.innerHTML = '';

        const card = currentColorIndicator.closest('.card');
        const currentCode = card ? card.dataset.code : null;

        // Obtener colores usados excluyendo el de la materia actual
        const usedColors = selectedCourses
            .filter(c => c.code !== currentCode)
            .map(c => c.color.bg);

        colors.forEach(colorObj => {
            const circle = document.createElement('div');
            circle.className = 'color-option';
            circle.style.backgroundColor = colorObj.bg;

            if (usedColors.includes(colorObj.bg)) {
                circle.style.opacity = '0.6';
                circle.style.cursor = 'not-allowed';
                circle.title = 'Color en uso';
                circle.style.display = 'flex';
                circle.style.justifyContent = 'center';
                circle.style.alignItems = 'center';
                circle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="#ffffff" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>`;
            } else {
                circle.onclick = (e) => {
                    e.stopPropagation();
                    if (currentColorIndicator) {
                        currentColorIndicator.style.backgroundColor = colorObj.bg;
                        // Actualizar estado si es una card
                        const card = currentColorIndicator.closest('.card');
                        if (card && card.dataset.code) {
                            const course = selectedCourses.find(c => c.code === card.dataset.code);
                            if (course) {
                                course.color = colorObj;
                                saveSelectedCourses();
                                renderCards(); // Actualización inmediata
                            }
                        }
                    }
                    colorPicker.classList.remove('active');
                    currentColorIndicator = null;
                };
            }
            colorPicker.appendChild(circle);
        });

        colorPicker.style.top = `${rect.bottom + window.scrollY + 5}px`;
        colorPicker.style.left = `${rect.left + window.scrollX}px`;
        colorPicker.classList.add('active');

        // Cerrar otros menús si están abiertos
        valueEditor.classList.remove('active');
        menu.classList.remove('active');
    }
});

// Lógica de búsqueda y renderizado de materias desde JSON
let allCourses = [];
let schedules = JSON.parse(localStorage.getItem('schedules')) || [];
let activeScheduleIndex = parseInt(localStorage.getItem('activeScheduleIndex')) || 0;

if (schedules.length === 0) {
    const legacy = JSON.parse(localStorage.getItem('selectedCourses')) || [];
    schedules.push({ name: "Horario 1", courses: legacy });
    activeScheduleIndex = 0;
}

if (activeScheduleIndex < 0 || activeScheduleIndex >= schedules.length) activeScheduleIndex = 0;
let selectedCourses = schedules[activeScheduleIndex].courses;

// Migración de colores antiguos (string) a nuevos (objeto)
if (selectedCourses.length > 0 && typeof selectedCourses[0].color === 'string') {
    selectedCourses.forEach((c, index) => {
        c.color = colors[index % colors.length];
    });
    saveSelectedCourses();
}

renderTabs();

const modalContentBox = document.querySelector('.modal-content-box');

// Cargar datos
fetch('materias.json')
    .then(response => response.json())
    .then(data => {
        // Adaptar el nuevo modelo JSON al formato plano que usa el script
        const rawData = Array.isArray(data) ? data : (data.courses || [data]);

        allCourses = rawData.map(item => {
            // Si ya tiene la estructura plana antigua, devolver tal cual (fallback)
            if (!item.course && item.code) return item;

            const c = item.course || {};
            const groups = [];

            // Aplanar grupos de todos los offerings
            if (item.offerings) {
                item.offerings.forEach(offering => {
                    if (offering.groups) {
                        offering.groups.forEach((g) => {
                            const code = String(g.groupNumber !== undefined ? g.groupNumber : g.groupCode);
                            groups.push({
                                id: `${offering.offeringId}-${code}-${groups.length}`,
                                groupCode: code,
                                professor: g.professor || 'Por asignar',
                                schedule: g.schedule || [],
                                capacity: g.capacity || 0,
                                deliveryMode: g.deliveryMode || offering.deliveryMode,
                                campus: g.campus || offering.campus,
                                admission: (offering.type === 'PAET' || offering.type === 'PEAMA') ? { type: offering.type } : null,
                                repeatersOnly: g.repeatersOnly,
                                dateRange: g.dateRange,
                                shift: g.shift,
                                program: g.program,
                                offeringType: offering.type
                            });
                        });
                    }
                });
            }

            return {
                code: c.code,
                name: c.name,
                credits: c.credits,
                type: c.type,
                program: c.program,
                faculty: c.faculty,
                contentType: c.contentType,
                academicPeriod: c.academicPeriod,
                prerequisites: (item.prerequisites || []).map(p => ({
                    code: p.code,
                    name: p.name,
                    type: p.condition
                })),
                groups: groups
            };
        });

        // Sincronizar selectedCourses con los datos más recientes de allCourses
        selectedCourses = selectedCourses.map(selected => {
            const freshData = allCourses.find(c => c.code === selected.code);
            if (freshData) {
                // Crear copia de los datos frescos
                const updatedCourse = JSON.parse(JSON.stringify(freshData));

                // Restaurar estado de usuario
                updatedCourse.active = selected.active;
                updatedCourse.selectedGroup = selected.selectedGroup ? String(selected.selectedGroup) : null;
                updatedCourse.color = selected.color;

                // Sincronizar grupos preservando datos generados (score, enrolled)
                if (updatedCourse.groups) {
                    updatedCourse.groups.forEach(freshGroup => {
                        const oldGroup = selected.groups ? selected.groups.find(g => String(g.id) === String(freshGroup.id)) : null;
                        if (oldGroup) {
                            freshGroup.score = oldGroup.score;
                        } else {
                            // Si es un grupo nuevo, generar datos
                            freshGroup.score = (Math.random() * 2 + 3).toFixed(1);
                        }
                        freshGroup.enrolled = 0;
                    });
                }

                return updatedCourse;
            }
            return selected;
        });
        schedules[activeScheduleIndex].courses = selectedCourses;
        saveSelectedCourses();

        renderTabs();
        renderCards(); // Renderizar cards guardadas
        loadFilters();
        renderSchedule();
        applyFilters();
    })
    .catch(err => console.error('Error cargando materias:', err));

function renderCourses(courses) {
    // Limpiar contenido excepto el header (.op-row)
    const header = modalContentBox.querySelector('.op-row');
    modalContentBox.innerHTML = '';
    if (header) modalContentBox.appendChild(header);

    if (courses.length === 0) {
        return;
    }

    courses.forEach(course => {
        const row = document.createElement('div');
        row.className = 'op-materia';

        // Construir HTML interno usando template literals para limpieza
        row.innerHTML = `
            <div class="codigo-op-materia">${course.code}</div>
            <div class="nombre-op-materia">${course.name}</div>
            <div class="creditos-op-materia">${course.credits}</div>
            <div class="tipologia-op-materia">${course.type}</div>
            <div class="prerrequisito-op-materia"></div>
            <div class="add-op-materia"></div>
        `;

        row.querySelector('.add-op-materia').onclick = () => addCourse(course);

        // Manejo dinámico de prerrequisitos
        const prereqContainer = row.querySelector('.prerrequisito-op-materia');
        if (course.prerequisites && course.prerequisites.length > 0) {
            course.prerequisites.forEach(prereq => {
                const wrapper = document.createElement('div');
                wrapper.className = 'prereq-item';

                const pName = document.createElement('div');
                pName.className = 'p-p-m-asignatura';
                pName.textContent = prereq.name;

                const pDetails = document.createElement('div');
                pDetails.className = 'p-p-m-details';
                pDetails.innerHTML = `
                    <div class="p-p-m-codigo">${prereq.code}</div>
                    <div class="p-p-m-tag">${prereq.type}</div>
                `;

                wrapper.appendChild(pName);
                wrapper.appendChild(pDetails);
                prereqContainer.appendChild(wrapper);
            });
        } else {
            prereqContainer.textContent = 'Ninguno';
            prereqContainer.style.color = '#aaa';
            prereqContainer.style.fontSize = '0.7rem';
        }

        modalContentBox.appendChild(row);
    });
}

// Evento de búsqueda en tiempo real
modalInput.addEventListener('input', () => {
    applyFilters();
});

function normalizeText(text) {
    return (text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function getActiveFilters() {
    const filters = {};
    const visibleTags = Array.from(document.querySelectorAll('.tags .tag'))
        .filter(tag => !tag.closest('.opcionales') && !tag.classList.contains('add-tag'));

    visibleTags.forEach(tag => {
        const quest = tag.querySelector('.quest')?.textContent.trim();
        const op = tag.querySelector('.op')?.textContent.trim();
        if (quest && op) {
            filters[quest] = op;
        }
    });
    return filters;
}

function applyFilters() {
    const searchTerm = normalizeText(modalInput.value);
    const filters = getActiveFilters();

    localStorage.setItem('courseFilters', JSON.stringify(filters));

    const filtered = allCourses.filter(course => {
        // Filtro por texto
        const matchesSearch = normalizeText(course.name).includes(searchTerm) ||
            normalizeText(course.code).includes(searchTerm);
        if (!matchesSearch) return false;

        // Excluir materias que ya están en el menú (staged)
        if (tempSelectedCourses.some(c => c.code === course.code)) return false;

        // Filtros por tags
        if (filters['Facultad'] && !normalizeText(filters['Facultad']).includes(normalizeText(course.faculty))) return false;
        if (filters['Programa'] && !normalizeText(filters['Programa']).includes(normalizeText(course.program))) return false;

        if (filters['Tipología de la asignatura']) {
            const fVal = normalizeText(filters['Tipología de la asignatura']);
            const cVal = normalizeText(course.type);
            if (fVal === 'todas menos libre eleccion') {
                if (cVal.includes('libre eleccion')) return false;
            } else {
                if (!fVal.includes(cVal) && !cVal.includes(fVal)) return false;
            }
        }

        if (filters['Numero de creditos']) {
            const val = parseInt(filters['Numero de creditos']);
            if (!isNaN(val) && course.credits !== val) return false;
        }

        if (filters['Dias']) {
            const day = normalizeText(filters['Dias']);
            const validDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
            if (validDays.includes(day)) {
                const hasDay = course.groups?.some(g => g.schedule?.some(s => normalizeText(s.day) === day));
                if (!hasDay) return false;
            }
        }

        return true;
    });

    renderCourses(filtered);
}

function loadFilters() {
    const saved = localStorage.getItem('courseFilters');
    if (saved) {
        try {
            const filters = JSON.parse(saved);
            for (const [quest, val] of Object.entries(filters)) {
                let tag = Array.from(document.querySelectorAll('.tags .tag'))
                    .find(t => t.querySelector('.quest')?.textContent.trim() === quest);

                if (!tag) {
                    tag = Array.from(document.querySelectorAll('.opcionales .tag'))
                        .find(t => t.querySelector('.quest')?.textContent.trim() === quest);
                    if (tag) moveTagToVisible(tag);
                }

                if (tag) {
                    const op = tag.querySelector('.op');
                    if (op) op.textContent = val;
                }
            }
        } catch (e) {
            console.error('Error loading filters', e);
        }
    }
}

function addCourse(course) {
    // Añadir a la lista temporal (staging)
    if (!tempSelectedCourses.some(c => c.code === course.code)) {
        // Clonar para no modificar la referencia original
        const newCourse = JSON.parse(JSON.stringify(course));
        newCourse.active = true;
        newCourse.selectedGroup = null;

        // Intentar asignar un color no usado
        const usedColors = tempSelectedCourses.map(c => c.color.bg);
        newCourse.color = colors.find(c => !usedColors.includes(c.bg)) || colors[tempSelectedCourses.length % colors.length];

        // Inventar valores faltantes para los grupos
        if (newCourse.groups) {
            newCourse.groups.forEach(g => {
                g.score = (Math.random() * 2 + 3).toFixed(1); // Puntaje entre 3.0 y 5.0
                g.enrolled = 0; // Cupos ocupados inicializados en 0
            });
        }

        tempSelectedCourses.push(newCourse);
        renderStagedCourses();
        applyFilters(); // Actualizar lista de búsqueda para "mover" la materia
    }
}

function renderStagedCourses() {
    const container = document.querySelector('.staged-list');
    if (!container) return;
    container.innerHTML = '';

    let totalCredits = 0;

    tempSelectedCourses.forEach(course => {
        const credits = parseInt(course.credits) || 0;
        totalCredits += credits;

        const item = document.createElement('div');
        item.className = 'staged-item';
        item.innerHTML = `
            <div class="staged-item-info">
                <div class="staged-item-name" title="${course.name}">${course.name}</div>
                <div class="staged-item-code">${course.code} • ${credits} Cr</div>
            </div>
            <div class="remove-staged-btn">&times;</div>
        `;
        item.querySelector('.remove-staged-btn').onclick = () => {
            tempSelectedCourses = tempSelectedCourses.filter(c => c.code !== course.code);
            renderStagedCourses();
            applyFilters(); // Devolver a la lista de búsqueda
        };
        container.appendChild(item);
    });

    const menuTitle = document.querySelector('.menu-title');
    if (menuTitle) {
        menuTitle.textContent = `Materias (${totalCredits} Cr)`;
    }
}

function saveSelectedCourses() {
    schedules[activeScheduleIndex].courses = selectedCourses;
    localStorage.setItem('schedules', JSON.stringify(schedules));
    localStorage.setItem('activeScheduleIndex', activeScheduleIndex);
}

function renderCards() {
    const cardsContainer = document.querySelector('.cards');

    // Guardar posición del scroll HORIZONTAL del contenedor
    const containerScrollLeft = cardsContainer.scrollLeft;

    // Guardar posición del scroll vertical de cada card
    const scrollPositions = {};
    cardsContainer.querySelectorAll('.card').forEach(card => {
        const groups = card.querySelector('.grupos-materia');
        if (groups) scrollPositions[card.dataset.code] = groups.scrollTop;
    });

    cardsContainer.innerHTML = '';
    renderSchedule();

    if (selectedCourses.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'add-course-btn-large';
        emptyState.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="#555"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
            <span>Añadir materias</span>
        `;
        emptyState.onclick = () => openSearchModal(emptyState);
        cardsContainer.appendChild(emptyState);
    } else {
        selectedCourses.forEach((course) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.code = course.code;
        if (!course.active) card.style.opacity = '0.6';

        // Configuración de Drag and Drop
        card.draggable = true;

        // Solo permitir arrastrar desde el título
        card.addEventListener('mousedown', (e) => {
            if (e.target.closest('.nombre-materia')) {
                card.draggable = true;
            } else {
                card.draggable = false;
            }
        });

        card.addEventListener('dragstart', () => card.classList.add('dragging'));
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            updateCourseOrder();
        });

        // Auto-scroll al hacer clic si la card no es completamente visible
        card.addEventListener('click', () => {
            let targetCard = card;

            // Si la card fue re-renderizada (ej: al seleccionar grupo), buscar la nueva instancia
            if (!card.isConnected) {
                targetCard = cardsContainer.querySelector(`.card[data-code="${course.code}"]`);
            }
            scrollToCardIfHidden(targetCard);
        });

        // Header de la card
        const headerHtml = `
            <div class="color-indicator" style="background-color: ${course.color.bg};"></div>
            <div class="nombre-materia" title="${course.name}">${course.name}</div>
            <div class="info-materia">
                <div class="detalles-materia">
                    <div class="creditos-materia">Créditos</div>
                    <div class="creditos-materia">${course.credits}</div>
                    <div class="tipología-materia">${course.type}</div>
                </div>
            </div>
        `;

        // Botón On/Off
        const onOffBtn = document.createElement('div');
        onOffBtn.className = 'op-on-off';
        onOffBtn.style.backgroundColor = course.active ? '#34C759' : '#8e8e93';
        onOffBtn.onclick = () => {
            course.active = !course.active;
            if (!course.active) {
                course.selectedGroup = null;
            }
            saveSelectedCourses();
            renderCards();
        };

        // Botón Eliminar
        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-course-btn';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Eliminar materia';
        removeBtn.onclick = () => {
            selectedCourses = selectedCourses.filter(c => c.code !== course.code);
            saveSelectedCourses();
            renderCards();
        };

        // Contenedor de grupos
        const groupsContainer = document.createElement('div');
        groupsContainer.className = 'grupos-materia';

        if (course.groups) {
            course.groups.forEach(group => {
                const isPAET = group.admission && group.admission.type === 'PAET';
                const isPEAMA = group.admission && group.admission.type === 'PEAMA';
                const isREG = !isPAET && !isPEAMA;

                const remaining = group.capacity - group.enrolled;
                const tagsHtml = getGroupTags(group);
                const isSelected = course.selectedGroup === group.id;
                const isConflict = !isSelected && checkConflict(group, course.code);

                // Obtener grupos bloqueadores
                const blockingGroups = isConflict ? getBlockingGroups(group, course.code) : [];
                const firstBlocker = blockingGroups.length > 0 ? blockingGroups[0] : null;

                const groupDiv = document.createElement('div');
                groupDiv.className = 'grupo';
                groupDiv.dataset.groupId = group.id;
                if (isSelected) {
                    groupDiv.style.border = '2px solid #34c759';
                    groupDiv.style.backgroundColor = '#e8f5e9';
                } else if (isConflict) {
                    groupDiv.classList.add('conflict');
                }

                // HTML del grupo bloqueador (si existe)
                let blockingInfo = '';
                if (isConflict && firstBlocker) {
                    const blockerTags = getGroupTags(firstBlocker.group);
                    blockingInfo = `
                        <div class="blocking-info" style="
                            background: rgba(196, 100, 100, 0.29);
                            border-top: 1px solid rgba(196, 100, 100, 0.1);
                            padding: 6px 8px;
                            margin-top: 4px;
                            border-radius: 4px;
                            font-size: 0.7rem;
                            color: #c46464;
                        ">
                            <div style="font-weight: 600; margin-bottom: 2px;">Bloqueado por:</div>
                            <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                                <strong style="color: #333;">G${firstBlocker.group.groupCode}</strong>
                                ${blockerTags}
                                <span style="font-weight: 500; color: #666;">· ${firstBlocker.course.name}</span>
                            </div>
                        </div>
                    `;
                }

                groupDiv.innerHTML = `
                    <div class="grupo-header">
                        <div class="nombre-grupo">G${group.groupCode}</div>
                        ${tagsHtml}
                    </div>
                    <div class="profesor-info">
                        <div class="calificacion-profe" style="color: ${getScoreColor(group.score)}">${group.score}</div>
                        <div class="nombre-profesor" title="${group.professor}">${group.professor}</div>
                        <div class="cupos-tag">${remaining}</div>
                    </div>
                    <div class="select-grupo" style="background-color: ${isSelected ? '#34c759' : 'transparent'}"></div>
                    ${blockingInfo}
                `;

                groupDiv.onclick = () => {
                    if (isConflict) return;
                    if (course.selectedGroup === group.id) {
                        course.selectedGroup = null;
                    } else {
                        course.selectedGroup = group.id;
                    }
                    saveSelectedCourses();
                    renderCards();

                    // Asegurar que la card sea visible después del re-render
                    setTimeout(() => {
                        const newCard = document.querySelector(`.card[data-code="${course.code}"]`);
                        scrollToCardIfHidden(newCard);
                    }, 50);
                };

                groupDiv.onmouseenter = () => renderSchedule({ course, group, isConflict });
                groupDiv.onmouseleave = () => renderSchedule();

                groupDiv.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    activeGroupContext = { course, group };
                    groupContextMenu.style.left = `${e.pageX}px`;
                    groupContextMenu.style.top = `${e.pageY}px`;
                    groupContextMenu.style.display = 'block';
                    
                    // Close other menus
                    if (typeof tabContextMenu !== 'undefined') tabContextMenu.style.display = 'none';
                };

                groupsContainer.appendChild(groupDiv);
            });
        }

        card.innerHTML = headerHtml;
        card.appendChild(onOffBtn);
        card.appendChild(removeBtn);
        card.appendChild(groupsContainer);
        cardsContainer.appendChild(card);

        // Restaurar posición del scroll
        if (scrollPositions[course.code]) {
            groupsContainer.scrollTop = scrollPositions[course.code];
        }
        });
    }

    // Botones de navegación (Flechas) dentro del contenedor .cards
    if (selectedCourses.length > 0) {
    const navButtons = document.createElement('div');
    navButtons.className = 'card-nav-buttons';

    navButtons.innerHTML = `
        <div class="nav-btn" id="scroll-left">
            <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#fff"><path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/></svg>
        </div>
        <div class="nav-btn" id="scroll-right">
            <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#fff"><path d="M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z"/></svg>
        </div>
        <div class="nav-btn" id="add-course-btn-small" title="Añadir materia">
            <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#fff"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
        </div>
    `;
    // Funcionalidad de scroll
    const scrollAmount = (260 + 15) * 3; // 4 cards * (width + gap)
    navButtons.querySelector('#scroll-left').onclick = () => smoothScroll(cardsContainer, -scrollAmount, 600);
    navButtons.querySelector('#scroll-right').onclick = () => smoothScroll(cardsContainer, scrollAmount, 600);
    
    const addBtn = navButtons.querySelector('#add-course-btn-small');
    addBtn.onclick = () => openSearchModal(addBtn);

    cardsContainer.appendChild(navButtons);
    }

    // Restaurar posición del scroll horizontal
    requestAnimationFrame(() => {
        cardsContainer.scrollLeft = containerScrollLeft;
    });
}

function smoothScroll(element, amount, duration) {
    const start = element.scrollLeft;
    const startTime = performance.now();

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-in-out
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        element.scrollLeft = start + (amount * ease);

        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function getScoreColor(score) {
    if (score >= 4.0) return '#34C759';
    if (score >= 3.0) return '#FF9500';
    return '#FF3B30';
}

function getCapacityColor(remaining, total) {
    const ratio = remaining / total;
    if (ratio > 0.3) return '#34C759';
    if (ratio > 0) return '#FF9500';
    return '#FF3B30';
}

function renderSchedule(previewData = null) {
    const container = document.querySelector('.schedule-grid');
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'schedule-inner';

    // Compactar horario: reducir gap y altura de la primera fila
    grid.style.gap = '-2px';
    grid.style.gridTemplateRows = '25px repeat(16, 1fr)';

    // 1. Renderizar Headers
    const headers = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    headers.forEach((h, index) => {
        const div = document.createElement('div');
        div.className = 's-cell s-header';
        div.textContent = h;
        div.style.gridRow = '1';
        div.style.gridColumn = (index + 1).toString();

        // Estilos header compacto
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.fontSize = '0.75rem';
        div.style.padding = '0';
        grid.appendChild(div);
    });

    // 2. Renderizar Grid Base (Horas y celdas vacías)
    for (let hour = 6; hour <= 21; hour++) {
        const row = hour - 6 + 2;

        // Alternar colores: filas pares blancas, impares gris (#dbdbdb)
        const rowColor = (hour % 2 !== 0) ? '#f2eeeeff' : '#cec7c7ff';

        // Etiqueta de hora
        const timeLabel = document.createElement('div');
        timeLabel.className = 's-cell s-time';
        timeLabel.textContent = `${hour} - ${hour + 1}`;
        timeLabel.style.gridRow = row.toString();
        timeLabel.dataset.row = row;
        timeLabel.style.gridColumn = '1';
        timeLabel.style.backgroundColor = rowColor;
        grid.appendChild(timeLabel);

        // Celdas vacías para los 7 días
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('div');
            cell.className = 's-cell';
            cell.style.gridRow = row.toString();
            cell.style.gridColumn = (day + 2).toString();
            cell.style.backgroundColor = rowColor;
            grid.appendChild(cell);
        }
    }

    // 3. Renderizar Bloques de Clases
    const dayMap = {
        'lunes': 2, 'martes': 3, 'miercoles': 4, 'jueves': 5, 'viernes': 6, 'sabado': 7, 'domingo': 8
    };

    const blocks = [];

    selectedCourses.forEach(course => {
        let group = null;
        let isPreview = false;
        let isConflict = false;

        if (previewData && previewData.course.code === course.code) {
            group = previewData.group;
            isPreview = true;
            isConflict = previewData.isConflict;
        } else if (course.active && course.selectedGroup) {
            group = course.groups.find(g => g.id === course.selectedGroup);
        }

        if (!group || !group.schedule) return;

        group.schedule.forEach(item => {
            const dayKey = normalizeText(item.day);
            const col = dayMap[dayKey];
            if (!col) return;

            const [startStr, endStr] = item.time.split('-');
            const startHour = parseInt(startStr.split(':')[0]);
            const endHour = parseInt(endStr.split(':')[0]);

            const rowStart = (startHour - 6) + 2; // +2 porque row 1 es header
            const span = endHour - startHour;

            blocks.push({
                course,
                group,
                col,
                rowStart,
                span,
                isPreview,
                isConflict
            });
        });
    });

    // Calcular superposiciones para renderizar lado a lado
    const matrix = {};
    blocks.forEach((b, i) => {
        for (let r = 0; r < b.span; r++) {
            const key = `${b.col}-${b.rowStart + r}`;
            if (!matrix[key]) matrix[key] = [];
            matrix[key].push(i);
        }
    });

    blocks.forEach((b, i) => {
        const neighbors = new Set();
        for (let r = 0; r < b.span; r++) {
            const key = `${b.col}-${b.rowStart + r}`;
            if (matrix[key]) matrix[key].forEach(idx => neighbors.add(idx));
        }
        const neighborArray = Array.from(neighbors).sort((a, b) => a - b);
        b.overlapCount = neighborArray.length;
        b.overlapIndex = neighborArray.indexOf(i);
    });

    blocks.forEach(b => {
        const block = document.createElement('div');
        block.className = 's-cell class-block';
        block.style.backgroundColor = b.course.color.bg;
        block.style.color = b.course.color.text;
        block.style.gridColumn = b.col;
        block.style.gridRow = `${b.rowStart} / span ${b.span}`;

        if (b.isConflict) {
            block.style.backgroundColor = '#c46464';
            block.style.color = '#ffffff';
            block.style.opacity = '0.3';
            block.style.zIndex = '100';
            block.style.boxShadow = '0 4px 8px rgba(196, 100, 100, 0.5)';
        } else if (b.isPreview) {
            block.style.opacity = '0.9';
            block.style.zIndex = '100';
            block.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        }

        if (b.overlapCount > 1) {
            block.style.width = `calc(${100 / b.overlapCount}% - 2px)`;
            block.style.marginLeft = `${(100 / b.overlapCount) * b.overlapIndex}%`;
            block.style.justifySelf = 'start';
            block.style.zIndex = 5 + b.overlapIndex;
        }

        const tagsHtml = getGroupTags(b.group);

        block.draggable = true;
        block.dataset.courseCode = b.course.code;
        // block.addEventListener('dragstart', handleScheduleDragStart); // Removed in favor of delegation
        // block.addEventListener('dragend', handleScheduleDragEnd);     // Removed in favor of delegation

        // FORCE inline handler to debug/bypass listener issues
        block.setAttribute('ondragstart', 'handleScheduleDragStart(event)');
        block.setAttribute('ondragend', 'handleScheduleDragEnd(event)');

        block.addEventListener('mouseenter', () => {
            for (let i = 0; i < b.span; i++) {
                const r = b.rowStart + i;
                const cell = grid.querySelector(`.s-time[data-row="${r}"]`);
                if (cell) {
                    cell.style.borderLeft = '2px solid #444';
                    cell.style.borderRight = '2px solid #444';
                    if (i === 0) cell.style.borderTop = '2px solid #444';
                    if (i === b.span - 1) cell.style.borderBottom = '2px solid #444';
                    cell.style.borderLeft = '2px solid #555';
                    cell.style.borderRight = '2px solid #555';
                    if (i === 0) {
                        cell.style.borderTop = '2px solid #555';
                        cell.style.borderTopLeftRadius = '8px';
                        cell.style.borderTopRightRadius = '8px';
                    }
                    if (i === b.span - 1) {
                        cell.style.borderBottom = '2px solid #555';
                        cell.style.borderBottomLeftRadius = '8px';
                        cell.style.borderBottomRightRadius = '8px';
                    }
                }
            }
        });

        block.addEventListener('mouseleave', () => {
            for (let i = 0; i < b.span; i++) {
                const r = b.rowStart + i;
                const cell = grid.querySelector(`.s-time[data-row="${r}"]`);
                if (cell) {
                    cell.style.borderLeft = '';
                    cell.style.borderRight = '';
                    cell.style.borderTop = '';
                    cell.style.borderBottom = '';
                    cell.style.borderTopLeftRadius = '';
                    cell.style.borderTopRightRadius = '';
                    cell.style.borderBottomLeftRadius = '';
                    cell.style.borderBottomRightRadius = '';
                }
            }
        });

        block.onclick = (e) => {
            const card = document.querySelector(`.card[data-code="${b.course.code}"]`);
            if (card) {
                // Scroll horizontal manual para evitar mover toda la página
                const cardsContainer = document.querySelector('.cards');
                const cardRect = card.getBoundingClientRect();
                const containerRect = cardsContainer.getBoundingClientRect();
                const currentScrollLeft = cardsContainer.scrollLeft;
                
                const targetScrollLeft = (cardRect.left - containerRect.left + currentScrollLeft) - (cardsContainer.clientWidth / 2) + (card.offsetWidth / 2);
                cardsContainer.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });

                // Efecto visual de resaltado temporal en la tarjeta (Borde brillante)
                const originalCardTransition = card.style.transition;
                const originalCardBorder = card.style.borderColor;
                const originalCardShadow = card.style.boxShadow;

                card.style.transition = 'box-shadow 0.5s ease, border-color 2s ease';
                card.style.borderColor = '#151716';
                card.style.boxShadow = '0 0 20px rgb(30, 241, 58)';

                setTimeout(() => {
                    card.style.borderColor = originalCardBorder;
                    card.style.boxShadow = originalCardShadow;
                    setTimeout(() => { card.style.transition = originalCardTransition; }, 500);
                }, 1000);

                // Buscar el grupo específico dentro de la tarjeta
                const groupElement = card.querySelector(`.grupo[data-group-id="${b.group.id}"]`);
                if (groupElement) {
                    // Scroll vertical manual dentro de la tarjeta
                    const groupsContainer = card.querySelector('.grupos-materia');
                    // offsetTop es relativo al padre posicionado (.card), restamos el offset del contenedor
                    const targetScrollTop = (groupElement.offsetTop - groupsContainer.offsetTop) - (groupsContainer.clientHeight / 2) + (groupElement.offsetHeight / 2);
                    groupsContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });

                    // Efecto visual de resaltado temporal
                    const originalTransition = groupElement.style.transition;
                    const originalBg = groupElement.style.backgroundColor;

                    groupElement.style.transition = 'background-color 0.5s ease';
                    groupElement.style.backgroundColor = '#fff9c4'; // Amarillo suave

                    setTimeout(() => {
                        groupElement.style.backgroundColor = originalBg;
                        setTimeout(() => { groupElement.style.transition = originalTransition; }, 500);
                    }, 1000);
                }
            }
        };

        block.innerHTML = `
            <div class="nombre-grupo" style="background-color: rgba(255,255,255,0.6); color: #333;">G${b.group.groupCode}</div>
            ${tagsHtml}
            <div class="block-name" style="color: inherit;">${b.course.name}</div>
        `;

        grid.appendChild(block);
    });

    // Resaltar las celdas de tiempo correspondientes al grupo en hover
    if (previewData && previewData.group && previewData.group.schedule) {
        previewData.group.schedule.forEach(item => {
            const [startStr, endStr] = item.time.split('-');
            const startHour = parseInt(startStr.split(':')[0]);
            const endHour = parseInt(endStr.split(':')[0]);

            const rowStart = (startHour - 6) + 2;
            const span = endHour - startHour;

            for (let i = 0; i < span; i++) {
                const r = rowStart + i;
                const cell = grid.querySelector(`.s-time[data-row="${r}"]`);
                if (cell) {
                    const borderColor = '#555';
                    cell.style.borderLeft = `2px solid ${borderColor}`;
                    cell.style.borderRight = `2px solid ${borderColor}`;
                    if (i === 0) {
                        cell.style.borderTop = `2px solid ${borderColor}`;
                        cell.style.borderTopLeftRadius = '8px';
                        cell.style.borderTopRightRadius = '8px';
                    }
                    if (i === span - 1) {
                        cell.style.borderBottom = `2px solid ${borderColor}`;
                        cell.style.borderBottomLeftRadius = '8px';
                        cell.style.borderBottomRightRadius = '8px';
                    }
                }
            }
        });
    }

    container.appendChild(grid);
}

function parseTimeRange(timeStr) {
    const [start, end] = timeStr.split('-');
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return [startH * 60 + startM, endH * 60 + endM];
}

function checkConflict(targetGroup, currentCourseCode) {
    if (!targetGroup.schedule) return false;

    for (const course of selectedCourses) {
        if (course.code == currentCourseCode || !course.active || !course.selectedGroup) continue;

        const selectedGroup = course.groups.find(g => g.id == course.selectedGroup);
        if (!selectedGroup || !selectedGroup.schedule) continue;

        for (const targetItem of targetGroup.schedule) {
            for (const selectedItem of selectedGroup.schedule) {
                if (normalizeText(targetItem.day) === normalizeText(selectedItem.day)) {
                    const [tStart, tEnd] = parseTimeRange(targetItem.time);
                    const [sStart, sEnd] = parseTimeRange(selectedItem.time);

                    if (tStart < sEnd && tEnd > sStart) return true;
                }
            }
        }
    }
    return false;
}

/**
 * Genera el HTML de los tags para un grupo basado en Modalidad, Admisión y Sede.
 */
function getGroupTags(group) {
    let html = '';

    const config = {
        deliveryMode: {
            'VIRTUAL': { code: 'V', bgColor: '#BFDBFE', textColor: '#1E3A8A', title: 'Virtual' },
            'REMOTA': { code: 'R', bgColor: '#BAE6FD', textColor: '#0C4A6E', title: 'Remota' },
            'HIBRIDO': { code: 'H', bgColor: '#DDD6FE', textColor: '#5B21B6', title: 'Híbrido' }
        },
        admission: {
            'PAET': { code: 'PA', bgColor: '#BBF7D0', textColor: '#14532D', title: 'PAET' },
            'PEAMA': { code: 'PE', bgColor: '#A7F3D0', textColor: '#064E3B', title: 'PEAMA' }
        },
        campus: {
            'AMAZONIA': { code: 'AM', bgColor: '#FED7AA', textColor: '#7C2D12', title: 'Amazonia' },
            'TUMACO': { code: 'TU', bgColor: '#FDE68A', textColor: '#78350F', title: 'Tumaco' },
            'CARIBE': { code: 'CA', bgColor: '#645621ff', textColor: '#ffe4d4ff', title: 'Caribe' },
            'ORINOQUIA': { code: 'OR', bgColor: '#21642fff', textColor: '#ffe4d4ff', title: 'Orinoquia' }
        },
        repeatersOnly: {
            'SI': { code: 'PR', bgColor: '#f45656ff', textColor: '#231d1bff', title: 'para repitentes' }
        }
    };

    // 1. Modalidad
    if (group.deliveryMode && config.deliveryMode[group.deliveryMode]) {
        const t = config.deliveryMode[group.deliveryMode];
        html += `<div class="group-tag" style="background-color: ${t.bgColor}; color: ${t.textColor};" title="${t.title}">${t.code}</div>`;
    }
    // 2. Admisión Especial
    if (group.admission && group.admission.type && config.admission[group.admission.type]) {
        const t = config.admission[group.admission.type];
        html += `<div class="group-tag" style="background-color: ${t.bgColor}; color: ${t.textColor};" title="${t.title}">${t.code}</div>`;
    }
    // 3. Sede Regional
    if (group.campus && config.campus[group.campus]) {
        const t = config.campus[group.campus];
        html += `<div class="group-tag" style="background-color: ${t.bgColor}; color: ${t.textColor};" title="${t.title}">${t.code}</div>`;
    }
    // 4. Solo Repitentes
    if (group.repeatersOnly) {
        const t = config.repeatersOnly['SI'];
        html += `<div class="group-tag" style="background-color: ${t.bgColor}; color: ${t.textColor};" title="${t.title}">${t.code}</div>`;
    }
    return html;
}

/**
 * Actualiza el orden de las materias basado en el DOM y guarda en localStorage.
 */
function updateCourseOrder() {
    const newOrder = [];
    const cards = document.querySelectorAll('.cards .card');
    cards.forEach(card => {
        const code = card.dataset.code;
        const course = selectedCourses.find(c => c.code === code);
        if (course) newOrder.push(course);
    });
    selectedCourses = newOrder;
    saveSelectedCourses();
    renderCards();
}

// Listeners globales para el contenedor de cards (Drag & Drop)
const cardsContainerGlobal = document.querySelector('.cards');
if (cardsContainerGlobal) {
    cardsContainerGlobal.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necesario para permitir el drop
        const afterElement = getDragAfterElement(cardsContainerGlobal, e.clientX);
        const draggable = document.querySelector('.dragging');
        const navButtons = cardsContainerGlobal.querySelector('.card-nav-buttons');

        if (afterElement == null) {
            // Si no hay elemento siguiente, insertar antes de los botones de navegación si existen
            if (navButtons) cardsContainerGlobal.insertBefore(draggable, navButtons);
            else cardsContainerGlobal.appendChild(draggable);
        } else {
            cardsContainerGlobal.insertBefore(draggable, afterElement);
        }
    });
}

function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Función para obtener qué grupos bloquean a un grupo específico
function getBlockingGroups(targetGroup, currentCourseCode) {
    if (!targetGroup.schedule) return [];

    const blockingGroups = [];

    for (const course of selectedCourses) {
        if (course.code == currentCourseCode || !course.active || !course.selectedGroup) continue;

        const selectedGroup = course.groups.find(g => g.id == course.selectedGroup);
        if (!selectedGroup || !selectedGroup.schedule) continue;

        // Verificar si hay conflicto de horario
        let hasConflict = false;
        for (const targetItem of targetGroup.schedule) {
            for (const selectedItem of selectedGroup.schedule) {
                if (normalizeText(targetItem.day) === normalizeText(selectedItem.day)) {
                    const [tStart, tEnd] = parseTimeRange(targetItem.time);
                    const [sStart, sEnd] = parseTimeRange(selectedItem.time);

                    if (tStart < sEnd && tEnd > sStart) {
                        hasConflict = true;
                        break;
                    }
                }
            }
            if (hasConflict) break;
        }

        if (hasConflict) {
            blockingGroups.push({
                course: course,
                group: selectedGroup
            });
        }
    }

    return blockingGroups;
}

/* Context Menu para Tabs */
const tabContextMenu = document.createElement('div');
tabContextMenu.className = 'tab-context-menu';
Object.assign(tabContextMenu.style, {
    display: 'none',
    position: 'absolute',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: '10000',
    padding: '4px 0',
    minWidth: '140px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
});

const renameItem = document.createElement('div');
renameItem.textContent = 'Cambiar nombre';
Object.assign(renameItem.style, {
    padding: '8px 12px',
    fontSize: '13px',
    color: '#333',
    cursor: 'pointer',
    transition: 'background 0.2s'
});
renameItem.onmouseenter = () => renameItem.style.backgroundColor = '#f5f5f5';
renameItem.onmouseleave = () => renameItem.style.backgroundColor = 'transparent';

tabContextMenu.appendChild(renameItem);
document.body.appendChild(tabContextMenu);

let activeTabContext = null;

renameItem.onclick = () => {
    if (activeTabContext) {
        enableTabEditing(activeTabContext.tab, activeTabContext.index);
    }
    tabContextMenu.style.display = 'none';
};

document.addEventListener('click', (e) => {
    if (!tabContextMenu.contains(e.target)) {
        tabContextMenu.style.display = 'none';
    }
});

function enableTabEditing(tab, index) {
    const nameSpan = tab.querySelector('.tab-name');
    if (!nameSpan) return;

    const currentName = schedules[index].name;
    const input = document.createElement('input');
    input.className = 'tab-name-edit';
    input.value = currentName;
    
    // Estilos inline para el input
    input.style.width = '100px';
    input.style.border = 'none';
    input.style.borderRadius = '4px';
    input.style.padding = '2px';
    input.style.fontSize = 'inherit';
    input.style.fontFamily = 'inherit';
    input.style.outline = '2px solid #007aff';
    
    nameSpan.innerHTML = '';
    nameSpan.appendChild(input);
    input.focus();
    input.select();
    
    const save = () => {
        const val = input.value.trim();
        if (val) {
            schedules[index].name = val;
            saveSelectedCourses();
        }
        renderTabs();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (ev) => { 
        if (ev.key === 'Enter') save(); 
        if (ev.key === 'Escape') renderTabs();
    });
    input.addEventListener('click', (ev) => ev.stopPropagation());
    input.addEventListener('dblclick', (ev) => ev.stopPropagation());
}

/* Lógica de Tabs */
function renderTabs() {
    const container = document.querySelector('.tabs-container');
    if (!container) return;
    container.innerHTML = '';

    schedules.forEach((schedule, index) => {
        const tab = document.createElement('div');
        tab.className = `tab ${index === activeScheduleIndex ? 'active' : ''}`;
        tab.innerHTML = `<span class="tab-name" title="${schedule.name}">${schedule.name}</span> <span class="close-tab">&times;</span>`;
        
        tab.onclick = (e) => {
            if (e.target.classList.contains('close-tab')) return;
            switchTab(index);
        };

        tab.querySelector('.close-tab').onclick = (e) => {
            e.stopPropagation();
            closeTab(index);
        };

        const nameSpan = tab.querySelector('.tab-name');
        
        tab.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            activeTabContext = { tab, index };
            tabContextMenu.style.left = `${e.pageX}px`;
            tabContextMenu.style.top = `${e.pageY}px`;
            tabContextMenu.style.display = 'block';
        });

        container.appendChild(tab);
    });

    if (schedules.length < 15) {
        const addBtn = document.createElement('div');
        addBtn.className = 'add-tab-btn';
        addBtn.textContent = '+';
        addBtn.onclick = addTab;
        container.appendChild(addBtn);
    }
}

function addTab() {
    if (schedules.length >= 15) return;
    const newName = `Horario ${schedules.length + 1}`;
    const newCourses = JSON.parse(JSON.stringify(selectedCourses));
    newCourses.forEach(c => c.selectedGroup = null);
    
    schedules.push({ name: newName, courses: newCourses });
    switchTab(schedules.length - 1);
}

function switchTab(index) {
    activeScheduleIndex = index;
    selectedCourses = schedules[activeScheduleIndex].courses;
    saveSelectedCourses();
    renderTabs();
    renderCards();
}

function closeTab(index) {
    if (schedules.length <= 1) return;
    if (index === activeScheduleIndex) activeScheduleIndex = Math.max(0, index - 1);
    else if (index < activeScheduleIndex) activeScheduleIndex--;
    
    schedules.splice(index, 1);
    selectedCourses = schedules[activeScheduleIndex].courses;
    saveSelectedCourses();
    renderTabs();
    renderCards();
}

/* Funciones para Drag & Drop en el Horario */

function handleScheduleDragStart(e) {
    try {
        const block = e.target.closest('.class-block');
        if (!block) return;

        const courseCode = block.dataset.courseCode;
        if (!courseCode) return;

        const course = selectedCourses.find(c => c.code == courseCode);
        if (!course) return;

        e.dataTransfer.setData('text/plain', courseCode);
        e.dataTransfer.effectAllowed = 'move';
        block.style.opacity = '0.4';

        const dayMap = { 'lunes': 2, 'martes': 3, 'miercoles': 4, 'jueves': 5, 'viernes': 6, 'sabado': 7, 'domingo': 8 };
        const slots = {};
        const safeNormalize = (text) => (text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

        // Calcular slots disponibles de otros grupos
        course.groups.forEach(group => {
            if (group.id == course.selectedGroup) return;
            if (!group.schedule) return;

            // Filtrar grupos que tienen conflicto de horario con OTRAS materias
            if (checkConflict(group, courseCode)) {
                return;
            }

            group.schedule.forEach(item => {
                const dayKey = safeNormalize(item.day);
                const col = dayMap[dayKey];
                if (!col) return;

                const [startStr, endStr] = item.time.split('-');
                const startHour = parseInt(startStr.split(':')[0]);
                const endHour = parseInt(endStr.split(':')[0]);

                // Validación básica de horas
                if (isNaN(startHour) || isNaN(endHour)) return;

                const rowStart = (startHour - 6) + 2;
                const span = endHour - startHour;

                // Clave única para el slot de tiempo
                const key = `${col}-${rowStart}-${span}`;
                if (!slots[key]) slots[key] = [];
                slots[key].push(group.id);
            });
        });

        const grid = document.querySelector('.schedule-inner');

        // Crear tooltip para preview
        const tooltip = document.createElement('div');
        tooltip.className = 'drag-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            z-index: 10000;
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(8px);
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
            pointer-events: none;
            display: none;
            min-width: 200px;
            color: white;
        `;
        document.body.appendChild(tooltip);

        // Guardar referencia para uso posterior
        block.dataset.tooltipId = 'active-tooltip';

        // USAR setTimeout para forzar renderizado durante drag
        setTimeout(() => {
            Object.entries(slots).forEach(([key, groupIds]) => {
                const [col, rowStart, span] = key.split('-').map(Number);

                const ghost = document.createElement('div');
                ghost.className = 'ghost-block';
                ghost.style.gridColumn = col;
                ghost.style.gridRow = `${rowStart} / span ${span}`;
                ghost.style.zIndex = '2000';
                ghost.style.border = `2px dashed ${course.color.bg}`;
                ghost.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                ghost.style.color = course.color.bg;
                ghost.style.display = 'flex';
                ghost.style.flexDirection = 'column';
                ghost.style.justifyContent = 'center';
                ghost.style.alignItems = 'center';
                ghost.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';

                const getCode = (gid) => {
                    const g = course.groups.find(grp => grp.id === gid);
                    return g ? g.groupCode : '?';
                };

                // Si hay muchos grupos, mostrar resumen simple
                if (groupIds.length > 3) {
                    ghost.innerHTML = `<strong>${groupIds.length} Grupos</strong>`;
                } else {
                    // Mostrar cada grupo con sus etiquetas
                    const groupsHtml = groupIds.map(gid => {
                        const group = course.groups.find(grp => grp.id === gid);
                        if (!group) return '';

                        const tagsHtml = getGroupTags(group);
                        return `
                            <div style="display: flex; align-items: center; gap: 4px; margin: 2px 0;">
                                <strong>G${group.groupCode}</strong>
                                ${tagsHtml}
                            </div>
                        `;
                    }).join('');

                    ghost.innerHTML = groupsHtml;
                }

                ghost.dataset.groupIds = JSON.stringify(groupIds);
                ghost.dataset.courseCode = courseCode;

                ghost.addEventListener('dragover', (ev) => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = 'move';
                    ghost.style.backgroundColor = '#e8f5e9';
                    ghost.style.borderColor = '#34C759';

                    // Mostrar tooltip con info del/los grupos
                    const tooltip = document.querySelector('.drag-tooltip');
                    if (tooltip && groupIds.length > 0) {
                        // Contenido del tooltip
                        let tooltipContent = `
                            <div style="font-weight: bold; font-size: 0.9rem; margin-bottom: 8px; color: white;">
                                ${course.name}
                            </div>
                        `;

                        // Mostrar cada grupo con sus tags
                        groupIds.forEach(gid => {
                            const group = course.groups.find(g => g.id === gid);
                            if (group) {
                                const tagsHtml = getGroupTags(group);
                                tooltipContent += `
                                    <div style="display: flex; align-items: center; gap: 6px; margin: 4px 0; padding: 4px 0; ${groupIds.length > 1 ? 'border-bottom: 1px solid rgba(255, 255, 255, 0.2);' : ''}">
                                        <strong style="font-size: 0.95rem; color: white;">G${group.groupCode}</strong>
                                        ${tagsHtml}
                                    </div>
                                `;
                            }
                        });

                        // Si es un solo grupo, mostrar también el profesor
                        if (groupIds.length === 1) {
                            const group = course.groups.find(g => g.id === groupIds[0]);
                            if (group) {
                                tooltipContent += `
                                    <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7); margin-top: 4px;">
                                        ${group.professor || 'Profesor no asignado'}
                                    </div>
                                `;
                            }
                        }

                        tooltip.innerHTML = tooltipContent;
                        tooltip.style.display = 'block';

                        // Posicionar tooltip cerca del cursor
                        tooltip.style.left = (ev.clientX + 15) + 'px';
                        tooltip.style.top = (ev.clientY + 15) + 'px';
                    }
                });

                ghost.addEventListener('dragleave', (ev) => {
                    ghost.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                    ghost.style.borderColor = course.color.bg;

                    // Ocultar tooltip
                    const tooltip = document.querySelector('.drag-tooltip');
                    if (tooltip) {
                        tooltip.style.display = 'none';
                    }
                });

                ghost.addEventListener('drop', handleGhostDrop);

                grid.appendChild(ghost);
            });
        }, 0);
    } catch (err) {
        console.error('Error en DragStart:', err);
        alert('Error al iniciar arrastre: ' + err.message);
    }
}

function handleScheduleDragEnd(e) {
    e.target.style.opacity = '1';
    // Eliminar todos los ghost blocks
    const ghosts = document.querySelectorAll('.ghost-block');
    ghosts.forEach(g => g.remove());

    // Eliminar tooltip si existe
    const tooltip = document.querySelector('.drag-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

function handleGhostDrop(e) {
    e.preventDefault();
    const target = e.target.closest('.ghost-block');
    if (!target) return;

    const courseCode = target.dataset.courseCode;
    const groupIds = JSON.parse(target.dataset.groupIds);

    if (groupIds.length === 1) {
        // Solo un grupo en este horario, cambio directo
        selectGroup(courseCode, groupIds[0]);
    } else {
        // Conflicto: múltiples grupos a la misma hora
        showGroupSelectionModal(courseCode, groupIds);
    }
}

function selectGroup(courseCode, groupId) {
    const course = selectedCourses.find(c => c.code == courseCode);
    if (course) {
        course.selectedGroup = groupId;
        saveSelectedCourses();
        renderCards(); // Esto actualiza cards y horario
    }
}

function showGroupSelectionModal(courseCode, groupIds) {
    const overlay = document.createElement('div');
    overlay.className = 'group-selection-overlay';

    const modal = document.createElement('div');
    modal.className = 'group-selection-modal';

    const title = document.createElement('div');
    title.innerHTML = '<strong>Selecciona un grupo</strong><br><span style="font-size:0.8rem; color:#666">Múltiples grupos en este horario</span>';
    modal.appendChild(title);

    const course = selectedCourses.find(c => c.code == courseCode);

    groupIds.forEach(gid => {
        const group = course.groups.find(g => g.id === gid);
        const tagsHtml = getGroupTags(group);

        const btn = document.createElement('div');
        btn.className = 'group-option-btn';
        btn.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <strong>Grupo ${group.groupCode}</strong>
                ${tagsHtml}
            </div>
            <span style="font-size:0.8rem; color: #666;">${group.professor}</span>
        `;
        btn.onclick = () => {
            selectGroup(courseCode, gid);
            document.body.removeChild(overlay);
        };
        modal.appendChild(btn);
    });

    // Cerrar al hacer clic fuera del modal
    overlay.onclick = (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
    };

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// Funcionalidad Pantalla Completa
const fullscreenBtn = document.getElementById('fullscreen-btn');
const iconExpand = document.querySelector('.icon-expand');
const iconCollapse = document.querySelector('.icon-collapse');

if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        const isFullscreen = !!document.fullscreenElement;
        iconExpand.style.display = isFullscreen ? 'none' : 'block';
        iconCollapse.style.display = isFullscreen ? 'block' : 'none';
    });
}

const scheduleGrid = document.querySelector('.schedule-grid');
if (scheduleGrid) {
    scheduleGrid.addEventListener('dragstart', (e) => {
        const block = e.target.closest('.class-block');
        if (block) {
            handleScheduleDragStart(e);
        }
    });
    scheduleGrid.addEventListener('dragend', (e) => {
        const block = e.target.closest('.class-block');
        if (block) {
            handleScheduleDragEnd(e);
        }
    });

// Inicializar botones de scroll (Overlay)
const leftBtn = document.getElementById('scroll-left-btn');
const rightBtn = document.getElementById('scroll-right-btn');
const cardsContainer = document.querySelector('.cards');

if (leftBtn && rightBtn && cardsContainer) {
    const scrollAmount = (260 + 15) * 3;
    leftBtn.onclick = () => smoothScroll(cardsContainer, -scrollAmount, 600);
    rightBtn.onclick = () => smoothScroll(cardsContainer, scrollAmount, 600);
}

function scrollToCardIfHidden(card) {
    if (!card) return;
    const cardsContainer = document.querySelector('.cards');
    const cardRect = card.getBoundingClientRect();
    const containerRect = cardsContainer.getBoundingClientRect();
    const visibleLeft = containerRect.left;
    const visibleRight = containerRect.left + cardsContainer.clientWidth;

    if (cardRect.left < visibleLeft || cardRect.right > visibleRight) {
        const currentScrollLeft = cardsContainer.scrollLeft;
        const targetScrollLeft = (cardRect.left - visibleLeft + currentScrollLeft) - (cardsContainer.clientWidth / 2) + (card.offsetWidth / 2);
        cardsContainer.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    }
}

/* Context Menu para Grupos */
const groupContextMenu = document.createElement('div');
groupContextMenu.className = 'group-context-menu';
Object.assign(groupContextMenu.style, {
    display: 'none',
    position: 'absolute',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: '10000',
    padding: '4px 0',
    minWidth: '140px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
});

const detailsItem = document.createElement('div');
detailsItem.textContent = 'Información del grupo';
Object.assign(detailsItem.style, {
    padding: '8px 12px',
    fontSize: '13px',
    color: '#333',
    cursor: 'pointer',
    transition: 'background 0.2s'
});
detailsItem.onmouseenter = () => detailsItem.style.backgroundColor = '#f5f5f5';
detailsItem.onmouseleave = () => detailsItem.style.backgroundColor = 'transparent';

groupContextMenu.appendChild(detailsItem);
document.body.appendChild(groupContextMenu);

let activeGroupContext = null;

detailsItem.onclick = () => {
    if (activeGroupContext) {
        showGroupDetails(activeGroupContext.course, activeGroupContext.group);
    }
    groupContextMenu.style.display = 'none';
};

document.addEventListener('click', (e) => {
    if (!groupContextMenu.contains(e.target)) {
        groupContextMenu.style.display = 'none';
    }
});

function showGroupDetails(course, group) {
    const overlay = document.createElement('div');
    overlay.className = 'group-selection-overlay';
    overlay.style.zIndex = '10001';

    const modal = document.createElement('div');
    modal.className = 'group-selection-modal';
    modal.style.maxWidth = '500px';
    modal.style.width = '90%';
    modal.style.background = 'rgba(255, 255, 255, 0.95)';
    modal.style.backdropFilter = 'blur(10px)';

    // Title
    const title = document.createElement('div');
    title.innerHTML = `
        <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 5px; color: #333;">${course.name}</div>
        <div style="font-size: 0.9rem; color: #666;">Grupo ${group.groupCode} - ${course.code}</div>
        <div style="font-size: 0.8rem; color: #888; margin-top: 2px;">${course.credits} Créditos • ${course.type}</div>
    `;
    modal.appendChild(title);

    // Content Container
    const content = document.createElement('div');
    Object.assign(content.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '15px',
        fontSize: '0.9rem',
        maxHeight: '60vh',
        overflowY: 'auto',
        paddingRight: '5px'
    });

    // Helper to add rows
    const addRow = (label, value) => {
        if (!value) return;
        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex',
            justifyContent: 'space-between',
            borderBottom: '1px solid #eee',
            padding: '6px 0'
        });
        
        row.innerHTML = `
            <strong style="color: #444;">${label}:</strong>
            <span style="color: #666; text-align: right; max-width: 60%; word-break: break-word;">${value}</span>
        `;
        content.appendChild(row);
    };

    if (course.faculty) addRow('Facultad', course.faculty);
    if (course.contentType) addRow('Tipo de Contenido', course.contentType);
    if (course.academicPeriod) addRow('Periodo', course.academicPeriod);
    if (course.prerequisites && course.prerequisites.length > 0) {
        const prereqs = course.prerequisites.map(p => p.name).join(', ');
        addRow('Prerrequisitos', prereqs);
    }
    addRow('Profesor', group.professor);
    addRow('Cupos', `${group.capacity - (group.enrolled || 0)} / ${group.capacity}`);
    addRow('Modalidad', group.deliveryMode);
    addRow('Sede', group.campus);
    addRow('Tipo de Oferta', group.offeringType);
    if (group.admission && group.admission.type) addRow('Admisión', group.admission.type);
    addRow('Solo Repitentes', group.repeatersOnly ? 'Sí' : 'No');
    addRow('Fechas', group.dateRange);
    addRow('Jornada', group.shift);
    if (group.program) addRow('Programa', group.program);
    
    // Schedule details
    if (group.schedule && group.schedule.length > 0) {
        const scheduleTitle = document.createElement('div');
        scheduleTitle.innerHTML = '<strong>Horario:</strong>';
        scheduleTitle.style.marginTop = '10px';
        scheduleTitle.style.color = '#444';
        content.appendChild(scheduleTitle);

        const scheduleList = document.createElement('div');
        Object.assign(scheduleList.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: '#f5f5f7',
            padding: '10px',
            borderRadius: '8px',
            marginTop: '5px'
        });

        group.schedule.forEach(s => {
            let locInfo = '';
            if (s.location) {
                const parts = [];
                if (s.location.type) parts.push(s.location.type);
                if (s.location.building) parts.push(`Bloque: ${s.location.building}`);
                if (s.location.room) parts.push(`Salón: ${s.location.room}`);
                const mainLoc = parts.join(', ');
                
                if (mainLoc) locInfo += `<div>${mainLoc}</div>`;
                if (s.location.name) locInfo += `<div style="font-size:0.8rem; color:#888; margin-top:2px;">${s.location.name}</div>`;
            }
            
            const item = document.createElement('div');
            item.innerHTML = `
                <div style="color:#333;"><span style="font-weight:600;">${s.day}</span>: ${s.time}</div>
                ${locInfo ? `<div style="font-size:0.85rem; color:#555; margin-top:2px; padding-left: 8px; border-left: 2px solid #ddd;">${locInfo}</div>` : ''}
            `;
            item.style.borderBottom = '1px solid #e0e0e0';
            item.style.paddingBottom = '6px';
            item.style.marginBottom = '2px';
            scheduleList.appendChild(item);
        });
        // Remove border from last item
        if (scheduleList.lastChild) scheduleList.lastChild.style.borderBottom = 'none';
        
        content.appendChild(scheduleList);
    }

    modal.appendChild(content);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cerrar';
    Object.assign(closeBtn.style, {
        marginTop: '20px',
        padding: '10px 20px',
        backgroundColor: '#007aff',
        color: 'white',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer',
        alignSelf: 'center',
        fontWeight: '600',
        width: '100%'
    });
    closeBtn.onmouseover = () => closeBtn.style.backgroundColor = '#005bb5';
    closeBtn.onmouseout = () => closeBtn.style.backgroundColor = '#007aff';
    closeBtn.onclick = () => document.body.removeChild(overlay);

    modal.appendChild(closeBtn);

    // Close on click outside
    overlay.onclick = (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
    };

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
}