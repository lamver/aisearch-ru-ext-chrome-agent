// В content.js

chrome.storage.sync.get([window.location.hostname], (result) => {
    const isEnabled = result[window.location.hostname];

    if (isEnabled === false) {
        return;
    }

    initAgent();
});

function collectExternalFilesByType() {
        const files = {
            images: [],
            videos: [],
            scripts: [],
            styles: [],
            others: []
        };

        // Получим все элементы с внешними ресурсами
        // Изображения - <img src="...">
        document.querySelectorAll('img[src]').forEach(img => {
            const url = img.src;
            files.images.push({ name: getFileNameFromUrl(url), url });
        });

        // Видео - <video src="..."> и внутри <source src="...">
        document.querySelectorAll('video[src]').forEach(video => {
            const url = video.src;
            files.videos.push({ name: getFileNameFromUrl(url), url });
        });
        document.querySelectorAll('video source[src]').forEach(source => {
            const url = source.src;
            files.videos.push({ name: getFileNameFromUrl(url), url });
        });

        // Скрипты - <script src="...">
        document.querySelectorAll('script[src]').forEach(script => {
            const url = script.src;
            files.scripts.push({ name: getFileNameFromUrl(url), url });
        });

        // Стили - <link rel="stylesheet" href="...">
        document.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
            const url = link.href;
            files.styles.push({ name: getFileNameFromUrl(url), url });
        });

        // Другие внешние файлы — например, в <a href="..."> с расширениями, которые не отдали в категории выше
        // Для этого возьмем все <a> с href отличным от текущего домена (внешние ресурсы)
        document.querySelectorAll('a[href]').forEach(a => {
            const url = a.href;
            if (!url) return;

            // Если url уже присутствует в предыдущих категориях — пропустим
            if (isUrlInFiles(url, files)) return;

            // Если это внешний url (протокол http(s), сторонний хост)
            if (new URL(url).origin !== location.origin) {
                files.others.push({ name: getFileNameFromUrl(url), url });
            }
        });

        return files;

        // Вспомогательные функции
        function getFileNameFromUrl(url) {
            try {
                const urlObj = new URL(url);
                const pathname = urlObj.pathname;
                const name = pathname.substring(pathname.lastIndexOf('/') + 1) || url;
                return name;
            } catch {
                return url;
            }
        }

        function isUrlInFiles(url, filesObj) {
            return Object.values(filesObj).some(arr => arr.some(file => file.url === url));
        }
    }

// Функция рендера списка файлов по типу
function renderFilesList(filesList, type) {
    const modalScenario = document.getElementById('my-unique-modal-v1');
    const container = modalScenario.shadowRoot.getElementById('fileListContainer');
    container.innerHTML = '';

    let filesToShow = [];
    if (type === 'all') {
        // если понадобится - показать все сразу
        filesToShow = Object.values(filesList).flat();
    } else {
        filesToShow = filesList[type] || [];
    }

    if (filesToShow.length === 0) {
        container.textContent = 'Нет файлов данного типа.';
        return;
    }

    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';

    filesToShow.forEach(file => {
        const li = document.createElement('li');
        li.style.marginBottom = '10px';
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '10px';

        // Превью (если возможно)
        const preview = document.createElement('div');
        preview.style.width = '50px';
        preview.style.height = '50px';
        preview.style.flexShrink = '0';

        if (type === 'images') {
            const img = document.createElement('img');
            img.src = file.url;
            img.alt = file.name;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            preview.appendChild(img);
        } else if (type === 'videos') {
            const video = document.createElement('video');
            video.src = file.url;
            video.controls = false;
            video.muted = true;
            video.style.maxWidth = '100%';
            video.style.maxHeight = '100%';
            preview.appendChild(video);
        } else {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            // Для скриптов и стилей можно добавить иконки или текст
            let icon = document.createElement('span');
            icon.style.fontSize = '24px';
            icon.style.lineHeight = '50px';
            switch (ext) {
                case 'js':
                    icon.textContent = '📜';
                    break;
                case 'css':
                    icon.textContent = '🎨';
                    break;
                default:
                    icon.textContent = '📄';
            }
            preview.appendChild(icon);
        }

        li.appendChild(preview);

        // Название файла с ссылкой
        const link = document.createElement('a');
        link.href = file.url;
        link.textContent = file.name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = file.name; // Подсказка для скачивания
        link.style.flexGrow = '1';
        link.style.wordBreak = 'break-all';

        li.appendChild(link);

        // Кнопка скачать (с загрузкой по клику)
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Скачать';
        downloadBtn.onclick = (e) => {
            e.preventDefault();
            downloadFile(file.url, file.name);
        };
        li.appendChild(downloadBtn);

        ul.appendChild(li);
    });

    container.appendChild(ul);
}

// Функция скачивания файла по ссылке
function downloadFile(url, filename) {
    fetch(url, {mode: 'cors'})
        .then(resp => resp.blob())
        .then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        })
        .catch(() => alert('Не удалось скачать файл.'));
}

async function initAgent() {
    const imageUrlLogo40X40 = chrome.runtime.getURL('images/logo_ai_search_40_40.png');
    console.log(imageUrlLogo40X40);
    let lastInputElmInitExecuteTask= null;
    let lastSelectedEditableElement = null;
    let modalScenario = null;
    let originalPosition = { x: 0, y: 0 }; // Чтобы сохранить исходную позицию контейнера
    let moveBackTimeout = null;
    let lastTaskContent = null;

    // Создаем shadow root контейнер, чтобы не влиять на стили страницы
    const container = document.createElement('div');
    container.id = 'aiSearch-draggable-container';
    container.style.all = 'initial'; // сбросим все наследованные стили
    container.style.position = 'fixed';
    container.style.width = '40px';
    container.style.height = '40px';
    container.style.zIndex = '9999999';  // максимально наверху
    container.style.cursor = 'grab';
    container.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
    container.style.borderRadius = '15px';
    container.style.transition = 'left 0.3s ease, top 0.3s ease';


    // Попробуем установить позицию из chrome.storage.local (или fallback)
    const storageKey = `aiSearch-position-${window.location.hostname}`;
    chrome.storage.sync.get([storageKey], (posResult) => {
        const pos = posResult[storageKey];
        let x, y;

        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            x = pos.x;
            y = pos.y;
        } else {
            // Изначально правый нижний угол
            x = window.innerWidth - 40; // немного отступить от края
            y = window.innerHeight - 40;
        }

        // Получаем размеры контейнера, чтобы проверить видимость
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;

        // Корректируем координаты, чтобы контейнер не выходил за зону видимости окна
        // Минимальное значение 0 (чтобы не выйти вверх и влево)
        // Максимальное: ширина/высота окна минус размер контейнера и небольшой отступ (10px)
        const padding = 10;

        if (x < padding) x = padding;
        if (y < padding) y = padding;

        if (x + containerWidth + padding > window.innerWidth) {
            x = window.innerWidth - containerWidth - padding;
        }

        if (y + containerHeight + padding > window.innerHeight) {
            y = window.innerHeight - containerHeight - padding;
        }

        // Применяем позицию к контейнеру
        container.style.left = x + 'px';
        container.style.top = y + 'px';

        // Обновляем оригинальную позицию
        originalPosition.x = x;
        originalPosition.y = y;
    });

    // Создаем кнопку
    const btn = document.createElement('button');
    btn.id = 'aiSearch-btn';
    btn.title = 'AiSearch';
    btn.setAttribute('aria-label', 'AiSearch draggable button');
    btn.style.all = 'initial'; // сбросим стили кнопки
    btn.style.width = '40px';
    btn.style.height = '40px';
    btn.style.border = 'none';
    btn.style.backgroundImage = `url("${imageUrlLogo40X40}")`;
    btn.style.backgroundSize = 'contain';
    btn.style.backgroundRepeat = 'no-repeat';
    btn.style.backgroundPosition = 'center';
    btn.style.cursor = 'grab';
    btn.style.outline = 'none';
    btn.style.padding = '0px 0px';
    btn.style.color = 'white';
    btn.style.backgroundColor = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '15px';


    container.appendChild(btn);
    document.body.appendChild(container);

    // Drag logic
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    let wasDragged = false;

    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (!lastSelectedEditableElement) {
            isDragging = true;
        }

        wasDragged = false; // сбросим флаг при старте drag
        container.style.cursor = 'grabbing';

        // Смещение курсора относительно кнопки
        const rect = container.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;

        // Для предотвращения выделения текста на странице во время drag
        document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        e.preventDefault();

        let newX = e.clientX - dragOffsetX;
        let newY = e.clientY - dragOffsetY;

        // Ограничиваем позицию, чтобы кнопка не ушла за экран
        const maxX = window.innerWidth - container.offsetWidth;
        const maxY = window.innerHeight - container.offsetHeight;

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX > maxX) newX = maxX;
        if (newY > maxY) newY = maxY;

        // Если позиция изменилась - считаем это drag
        if (
            Math.abs(newX - parseInt(container.style.left || 0, 10)) > 2 ||
            Math.abs(newY - parseInt(container.style.top || 0, 10)) > 2
        ) {
            wasDragged = true;
        }

        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
    });

    window.addEventListener('mouseup', (e) => {
        if (!isDragging) return;

        e.preventDefault();

        isDragging = false;
        container.style.cursor = 'grab';
        document.body.style.userSelect = '';

        // Сохраняем позицию в chrome.storage.sync
        const finalX = parseInt(container.style.left, 10);
        const finalY = parseInt(container.style.top, 10);

        originalPosition.x = finalX;
        originalPosition.y = finalY;

        chrome.storage.sync.set({
            [storageKey]: { x: finalX, y: finalY }
        }, () => {
            // console.log('Position saved', finalX, finalY);
        });
    });

    // При клике (без перетаскивания) вызываем initScenario
    btn.addEventListener('click', (e) => {
        // Если во время клика не было drag (в обработчике mouseup)
        if (!wasDragged) {
            initScenario();
        }
    });

    document.addEventListener('click', (event) => {
        handleSelectInputElm(event);
    });

    document.addEventListener('focusin', (event) => {
        handleSelectInputElm(event);
    });

    function handleSelectInputElm(event) {
        //alert();
        const target = event.target;

        if (target.id === 'aiSearch-btn') {
            return;
        }

        // Проверка, если клик по textarea или contenteditable
        if (
            target.tagName.toLowerCase() === 'textarea'
            || target.getAttribute('contenteditable') === 'true'
            || document.querySelector('.kix-canvas-tile-content')
        ) {
            // Переносим контейнер плавно под курсор
            if (moveBackTimeout) {
                clearTimeout(moveBackTimeout);
                moveBackTimeout = null;
            }
            //isDragging = false;
            // Смещаем кнопку, чтобы центр был под курсором
            const buttonWidth = container.offsetWidth;
            const buttonHeight = container.offsetHeight;

            let newLeft = event.clientX - buttonWidth / 2;
            let newTop = event.clientY - buttonHeight / 2;

            // Ограничения, чтобы не выходить за экран
            const maxX = window.innerWidth - buttonWidth;
            const maxY = window.innerHeight - buttonHeight;

            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;
            if (newLeft > maxX) newLeft = maxX;
            if (newTop > maxY) newTop = maxY;

            container.style.left = newLeft + 'px';
            container.style.top = (newTop + 40) + 'px';

            lastSelectedEditableElement = target;
            lastInputElmInitExecuteTask = lastSelectedEditableElement;

            //console.log('click ' + lastSelectedEditableElement);
            //console.log(lastInputElmInitExecuteTask);
        } else {
            if (lastSelectedEditableElement) {
                // Возврат контейнера к исходной позиции с плавным переходом
                if (moveBackTimeout) clearTimeout(moveBackTimeout);

                moveBackTimeout = setTimeout(() => {
                    container.style.left = originalPosition.x + 'px';
                    container.style.top = originalPosition.y + 'px';
                }, 100); // с небольшой задержкой, чтобы не конфликтовать с другими кликами
                lastInputElmInitExecuteTask = lastSelectedEditableElement;
            }

            lastSelectedEditableElement = null;
        }
    }

    function initScenario() {
        modalScenario = document.getElementById('my-unique-modal-v1');

        if (!modalScenario) {
            createModal();
            modalScenario = document.getElementById('my-unique-modal-v1');
        }

        if (modalScenario.style.visibility !== 'visible') {
            modalScenario.style.visibility = 'visible';
        }

        let selectedText = window.getSelection().toString();

        let highlightedText = modalScenario.shadowRoot.querySelector('.highlighted-text');

        if (highlightedText) {
            highlightedText.value = selectedText;
        }

        if (
            lastInputElmInitExecuteTask
            && lastTaskContent
        ) {
            let pasteButton = modalScenario.shadowRoot.querySelector('.paste-button');
            pasteButton.style.display = 'block';
        }
    }

    function createModal() {
        // Создаем контейнер модального окна
        const modalId = 'my-unique-modal-v1';
        if (document.getElementById(modalId)) {
            // Если уже есть такое окно - удалить
            document.getElementById(modalId).remove();
        }

        // Получаем выделенный текст на странице
        const selectedText = window.getSelection().toString();

        // Создаем стили для изоляции от стилей страницы
        // Используем Shadow DOM чтобы стили не "пробивались"
        const container = document.createElement('div');
        container.id = modalId;
        Object.assign(container.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'transparent',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '2147483647', // максимально высокий z-index
            pointerEvents: 'none',
        });

        // Создаем shadow root для изоляции стилей
        const shadowRoot = container.attachShadow({ mode: 'open' });

        // Создаем CSS
        const style = document.createElement('style');
        style.textContent = `
        * {
            box-sizing: border-box;
            font-family: Arial, sans-serif;
        }
        .modal {
            position: relative;
            background: white;
            border-radius: 8px;
            width: 600px;
            max-width: 90vw;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            pointer-events: auto;
            gap: 10px;
        }
        .highlighted-text {
            border: 1px solid #cccc00;
            padding: 10px;
            min-height: 40px;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            user-select: text;
            color: black;
            max-height: 300px;
            overflow-y: auto;
        }
        textarea {
            width: 100%;
            height: 100px;
            resize: vertical;
            font-family: monospace;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        button {
            cursor: pointer;
            padding: 8px 12px;
            border: none;
            background-color: #007bff;
            color: white;
            font-weight: 600;
            border-radius: 4px;
            transition: background-color 0.2s ease;
        }
        button:hover {
            background-color: #0056b3;
        }
        .btn-group {
            display: flex;
            gap: 10px;
        }
        .exceptions, .result {
            min-height: 30px;
            padding: 8px;
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-wrap;
            overflow-wrap: break-word;
        }
        .exceptions {
            background-color: #ffe6e6;
            color: #d8000c;
            border: 1px solid #d8000c;
            display: none;
        }
        .result {
            background-color: white;
            color: black;
            border: 1px solid #006400;
            max-height: 300px;
            overflow-y: auto;
            display: none;
        }
        button.close-button {
            position: absolute;
            top: -2px;
            right: -2px;
            background: transparent;
            padding: 0;
            border: none;
            color: black;
        }
        /* Вкладки */
        .tabs {
            display: flex;
            border-bottom: 1px solid #ccc;
            margin-bottom: 10px;
        }
        .tab {
            padding: 8px 16px;
            cursor: pointer;
            user-select: none;
            border-radius: 6px 6px 0 0;
            border: 1px solid transparent;
            border-bottom: none;
            background-color: #eee;
            font-weight: 600;
        }
        .tab.active {
            background-color: white;
            border-color: #ccc #ccc white;
            color: black;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .tab-files {
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-style: italic;
            border: 1px dashed #ccc;
            border-radius: 4px;
        }
    `;

        // Само модальное окно
        const modal = document.createElement('div');
        modal.className = 'modal';

        const closeButton = document.createElement('button');
        closeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16">
  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
</svg>`;

        closeButton.classList.add('close-button');

        const checkboxWithoutContext = document.createElement('input');
        checkboxWithoutContext.className = 'checkbox-without-context';
        checkboxWithoutContext.type = 'checkbox';

        const labelWithoutContext = document.createElement('label');
        labelWithoutContext.textContent = 'Не учитывать контекст';
        labelWithoutContext.prepend(checkboxWithoutContext);

        // Создаем контейнер для вкладок
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs';

        const tabAISearch = document.createElement('div');
        tabAISearch.className = 'tab active';
        tabAISearch.textContent = 'Контент';

        const tabFiles = document.createElement('div');
        tabFiles.className = 'tab';
        tabFiles.textContent = 'Файлы';

        tabsContainer.append(tabAISearch, tabFiles);

        // Контейнер для контента вкладок
        const contentAISearch = document.createElement('div');
        contentAISearch.className = 'tab-content active';

        const contentFiles = document.createElement('div');
        contentFiles.className = 'tab-content';
        contentFiles.innerHTML = `<div class="tab-files">Пусто</div>`;

        // 1) блок с выделенным текстом (если есть, иначе пишем "Нет выделенного текста")
        const highlightedBlock = document.createElement('textarea');
        highlightedBlock.className = 'highlighted-text';
        highlightedBlock.textContent = selectedText || '';
        highlightedBlock.placeholder = 'По умолчанию учитывается контекст всей страницы. Чтобы сузить контекст — выделите текст на странице или вставьте нужную информацию тут.';
        highlightedBlock.rows = 3;

        // 2) текстареа
        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Напишите, что надо сделать...';

        // 3) кнопка "Делай"
        const doButton = document.createElement('button');
        doButton.textContent = 'Делай';

        // 4) блок для исключений
        const exceptionsBlock = document.createElement('div');
        exceptionsBlock.className = 'exceptions';
        exceptionsBlock.textContent = ''; // изначально пусто

        // 5) блок для вывода результата
        const resultBlock = document.createElement('div');
        resultBlock.className = 'result';
        resultBlock.textContent = ''; // изначально пусто
        resultBlock.contentEditable = true;

        // 6) две кнопки: "Вставить" и "Скопировать"
        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group';

        const pasteButton = document.createElement('button');
        pasteButton.textContent = 'Вставить';
        pasteButton.className = 'paste-button';
        pasteButton.style.display = 'none';

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Скопировать';
        copyButton.className = 'copy-button';
        copyButton.style.display = 'none';

        btnGroup.append(pasteButton, copyButton);

        // Добавляем все элементы айсечарча в его вкладку контента
        contentAISearch.append(
            highlightedBlock,
            labelWithoutContext,
            textarea,
            doButton,
            exceptionsBlock,
            resultBlock,
            btnGroup
        );

        // Добавляем вкладки и их контент в модальное окно
        modal.append(
            closeButton,
            tabsContainer,
            contentAISearch,
            contentFiles
        );

        // Добавляем стиль и модальное окно в shadow DOM
        shadowRoot.append(style, modal);

        // Добавляем модальное окно на страницу
        document.body.appendChild(container);

        modalScenario = document.getElementById('my-unique-modal-v1');

        // Функция переключения вкладок
        function switchTab(tab) {
            // отключаем активные классы у вкладок
            tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');

            if (tab === tabAISearch) {
                contentAISearch.classList.add('active');
            } else if (tab === tabFiles) {
                let filesList = collectExternalFilesByType();
                contentFiles.innerHTML = ''; // очищаем

                // Создаем фильтр по типам файлов
                const fileTypes = ['images', 'videos', 'scripts', 'styles', 'others'];
                const filtersContainer = document.createElement('div');
                filtersContainer.style.marginBottom = '10px';

                fileTypes.forEach(type => {
                    const btn = document.createElement('button');
                    btn.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                    btn.dataset.type = type;
                    btn.style.marginRight = '5px';
                    btn.onclick = () => {
                        renderFilesList(filesList, btn.dataset.type);
                        // Обновить активный класс у кнопок
                        filtersContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                    };
                    filtersContainer.appendChild(btn);
                });
                contentFiles.appendChild(filtersContainer);

                // Список файлов
                const listContainer = document.createElement('div');
                listContainer.id = 'fileListContainer';
                listContainer.style.maxHeight = '400px';
                listContainer.style.overflowY = 'auto';
                contentFiles.appendChild(listContainer);

                // По умолчанию показываем все типы (или первый)
                filtersContainer.querySelector('button').click();

                contentFiles.classList.add('active');
            }
        }

        // Обработчики кликов на вкладках
        tabAISearch.addEventListener('click', () => switchTab(tabAISearch));
        tabFiles.addEventListener('click', () => switchTab(tabFiles));

        // Обработчик закрытия модального окна
        closeButton.addEventListener('click', () => {
            container.style.visibility = 'hidden';
        });

        // Обработчик кнопки "Делай"
        doButton.addEventListener('click', () => {
            exceptionsBlock.textContent = '';
            resultBlock.textContent = '';
            const inputText = textarea.value.trim();

            const pageText = document.body.innerText;

            if (!inputText) {
                resultBlock.textContent = 'Пожалуйста, введите запрос.';
                resultBlock.style.display = 'block';
                return;
            }

            let prompt = inputText;

            if (!checkboxWithoutContext.checked) {
                if (highlightedBlock.value === '') {
                    prompt = pageText + "\n" + prompt;
                } else {
                    prompt = highlightedBlock.value + "\n" + prompt;
                }
            }

            chrome.runtime.sendMessage({ type: "task", prompt: prompt }, response => {
                if (response && response.error) {
                    console.error("Error response:", response.error);
                }
            });
        });

        // Обработчик вставки
        pasteButton.addEventListener('click', async () => {
            if ('value' in lastInputElmInitExecuteTask) {
                lastInputElmInitExecuteTask.value = resultBlock.innerText;
            } else {
                lastInputElmInitExecuteTask.innerHTML = resultBlock.innerText;

                const changeEvent = new Event('change', {
                    bubbles: true,
                    cancelable: true,
                });

                lastInputElmInitExecuteTask.dispatchEvent(changeEvent);
            }
        });

        // Обработчик копирования результата
        copyButton.addEventListener('click', async () => {
            exceptionsBlock.textContent = '';
            try {
                if (!resultBlock.textContent) {
                    throw new Error('Результат пустой, нечего копировать');
                }
                await navigator.clipboard.writeText(resultBlock.innerText);
            } catch (e) {
                exceptionsBlock.textContent = 'Ошибка копирования в буфер обмена: ' + (e.message || e);
            }
        });

        textarea.addEventListener('focus', async () => {
            container.style.pointerEvents = 'auto';
        });

        textarea.addEventListener('blur', async () => {
            container.style.pointerEvents = 'none';
        });

        textarea.addEventListener('keydown', (event) => {
            event.stopPropagation();
        });
    }

    let accumulateResponseContent = '';
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

        if (message.type === 'data') {
            accumulateResponseContent += message.data;
            const resultBlock = modalScenario.shadowRoot.querySelector('.result');
            const copyButton = modalScenario.shadowRoot.querySelector('.copy-button');

            if (resultBlock.style.display !== 'block') {
                resultBlock.style.display = 'block';
            }

            if (copyButton.style.display !== 'block') {
                copyButton.style.display = 'block';
            }

            if (lastInputElmInitExecuteTask) {
                let pasteButton = modalScenario.shadowRoot.querySelector('.paste-button');
                pasteButton.style.display = 'block';
            }

            resultBlock.innerHTML = accumulateResponseContent;
        }

        if (message.type === 'task_error') {
            // Формируем HTML из ошибок для вывода в .exceptions
            let exceptionsContainer = modalScenario.shadowRoot.querySelector('.exceptions');
            exceptionsContainer.style.display = 'block';
            if (message.message && message.message["ошибка"]) {
                // message.message["ошибка"] - массив строк с ошибками (там могут быть уже HTML-ссылки)
                let errorsHtml = message.message["ошибка"].map(err => `${err}<br>`).join('');
                exceptionsContainer.innerHTML = errorsHtml;
            } else {
                exceptionsContainer.innerHTML = '<p>Неизвестная ошибка</p>';
            }
        }

        if (message.type === 'task_complete') {
            lastTaskContent = accumulateResponseContent;
            accumulateResponseContent = '';
        }
    });
}
