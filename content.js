// В content.js

chrome.storage.sync.get([window.location.hostname], (result) => {
    const isEnabled = result[window.location.hostname];

    if (isEnabled === false) {
        return;
    }

    initAgent();
});

async function initAgent() {

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
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            container.style.left = pos.x + 'px';
            container.style.top = pos.y + 'px';
            originalPosition.x = pos.x;
            originalPosition.y = pos.y;
        } else {
            // Изначально правый нижний угол: bottom:10px, right:10px -
            // но с position fixed лучше использовать left и top
            // Чтобы не влиять на flow, установим initial position — правый низ
            // Вычислим с window.innerWidth/Height
            const defaultX = window.innerWidth - 40; // немного отступить от края
            const defaultY = window.innerHeight - 40;
            container.style.left = defaultX + 'px';
            container.style.top = defaultY + 'px';
            originalPosition.x = defaultX;
            originalPosition.y = defaultY;
        }
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
    btn.style.backgroundImage = 'url(https://aisearch.ru/images/logo/logo_ai_search_40_40.png)';
    btn.style.backgroundSize = 'contain';
    btn.style.backgroundRepeat = 'no-repeat';
    btn.style.backgroundPosition = 'center';
    btn.style.cursor = 'grab';
    btn.style.outline = 'none';
    btn.style.backgroundImage = "url('https://aisearch.ru/images/logo/logo_ai_search_40_40.png')";
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
            highlightedText.innerHTML = selectedText;
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
            //backgroundColor: 'rgba(0,0,0,0.5)',
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
            /*background-color: #ffffcc;*/
            border: 1px solid #cccc00;
            padding: 10px;
            min-height: 40px;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            user-select: text;
            color: black;
            max-height: 300px;
            overflow-Y: auto;
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
            overflow-Y: auto;
            display:none;
        }
        
        button.close-button {
            position: absolute;
            top: -2px;
            right: -2px;
            background: 
            transparent;
            padding: 0;
            border: none;
            color: black;
        }
    `;

        // Само модальное окно
        const modal = document.createElement('div');
        modal.className = 'modal';

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16">\n' +
            '  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>\n' +
            '  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>\n' +
            '</svg>';

        closeButton.classList.add('close-button');

        // 1) блок с выделенным текстом (если есть, иначе пишем "Нет выделенного текста")
        const highlightedBlock = document.createElement('div');
        highlightedBlock.className = 'highlighted-text';
        highlightedBlock.textContent = selectedText || '';
        highlightedBlock.contentEditable = true;

        // 2) текстареа
        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Напишите что надо сделать...';

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

        // Добавляем все в modal
        modal.append(
            closeButton,
            highlightedBlock,
            textarea,
            doButton,
            exceptionsBlock,
            resultBlock,
            btnGroup
        );

        // Добавляем стиль и модальное окно в shadow DOM
        shadowRoot.append(style, modal);

        // Добавляем модальное окно на страницу
        document.body.appendChild(container);

        modalScenario = document.getElementById('my-unique-modal-v1');

        // Функция закрытия модального окна при клике вне него
        closeButton.addEventListener('click', (ev) => {
            /*if (ev.target === container) {
                container.remove();
            }*/
            container.style.visibility = 'hidden';
        });

        // Обработчик кнопки "Делай"
        doButton.addEventListener('click', () => {
            exceptionsBlock.textContent = '';
            resultBlock.textContent = '';
            const inputText = textarea.value.trim();

            const pageText = document.body.innerText;

            // Получаем HTML код страницы и выводим в консоль
            const pageHTML = document.documentElement.outerHTML;

            if (!inputText) {
                resultBlock.textContent = 'Пожалуйста, введите запрос.';
                return;
            }

            let prompt = inputText;

            if (highlightedBlock.textContent === '') {
                prompt = pageText + "\n" + prompt;
            } else {
                prompt = highlightedBlock.textContent + "\n" + prompt;
            }

            chrome.runtime.sendMessage({ type: "task", prompt: prompt }, response => {
                if (response && response.error) {
                    console.error("Error response:", response.error);
                }
            });
        });

        // Обработчик вставки
        pasteButton.addEventListener('click', async () => {
           // alert();

            if ('value' in lastInputElmInitExecuteTask) {
                lastInputElmInitExecuteTask.value = resultBlock.innerText;
            } else {
                // Если свойства value нет (например, div), вставляем код внутрь элемента
                lastInputElmInitExecuteTask.innerHTML = resultBlock.innerText;

                // Создаём и отправляем событие 'input' (или 'change' если нужно)
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
            //modal.style.pointerEvents = 'auto';
        });

        textarea.addEventListener('blur', async () => {
            container.style.pointerEvents = 'none';
            //modal.style.pointerEvents = 'auto';
        });

        textarea.addEventListener('keydown', (event) => {
            // Блокируем всплытие и действие всех горячих клавиш
            event.stopPropagation();
            // Если вы хотите полностью заблокировать ввод при нажатии клавиш — раскомментируйте следующую строку
            // event.preventDefault();
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
