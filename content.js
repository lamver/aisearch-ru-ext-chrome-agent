// В content.js

chrome.storage.sync.get([window.location.hostname], (result) => {
    const isEnabled = result[window.location.hostname];
    if (isEnabled) {
        // Ваши скрипты для активации функциональности
        console.log(`AiSearch активирован для ${window.location.hostname}`);
        initAgent();
        // Ваш основной код здесь
    } else {
        console.log(`AiSearch деактивирован для ${window.location.hostname}`);
    }
});

function initAgent() {
    // Генерируем уникальный ID для кнопки
    const uniqueIdAiSearchInitButton = `ai-search-init-btn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const uniqueIdAiSearchWidgetFormEditableContent = `ai-search-form-editable-content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const uniqueIdAiSearchWidgetFormPromptTextArea = `ai-search-form-prompt-textarea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const uniqueIdAiSearchWidgetFormMainBtn = `ai-search-form-main-btn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let lastInputElmInitExecuteTask= null;
    let lastSelectedEditableElement = null;

// Создаем кнопку и задаем ее стиль
    const button = document.createElement('button');
    button.id = uniqueIdAiSearchInitButton;
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.height = '40px';
    button.style.width = '50px';
    button.style.zIndex = '10000';
    button.style.padding = '10px 20px';
    button.style.color = 'white';
    button.style.backgroundColor = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '15px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    button.style.transition = 'top 0.3s ease, left 0.3s ease, bottom 0.3s ease, right 0.3s ease';

// Установка изображения как фона
    button.style.backgroundImage = "url('https://aisearch.ru/images/logo/logo_ai_search_40_40.png')";
    button.style.backgroundSize = '30px 30px';
    button.style.backgroundRepeat = 'no-repeat';
    button.style.backgroundPosition = 'center';

// Добавляем кнопку в DOM
    document.body.appendChild(button);

// Исходные координаты для возврата
    const originalPosition = {
        bottom: button.style.bottom,
        right: button.style.right,
        top: null,
        left: null
    };

    let movedUnderTextarea = false;

// Обработчик клика по всему документу
    document.addEventListener('click', (event) => {
        const target = event.target;

        if (target.id === uniqueIdAiSearchWidgetFormPromptTextArea) {
            return;
        }

        // Проверка, если клик по textarea или contenteditable
        if (
            target.tagName.toLowerCase() === 'textarea'
            || target.getAttribute('contenteditable') === 'true'
            || document.querySelector('.kix-canvas-tile-content')
        ) {
            handleEditableFocus(target, event);
        } else {
            // Если клик за пределами, вернуть кнопку в исходное положение
            if (target.id !== uniqueIdAiSearchInitButton) {
                restoreButtonPosition();
            }
        }

        //lastSelectedEditableElement = null;
    });

// Функция для обработки фокуса на редактируемых элементах
    function handleEditableFocus(target, event) {
        if (target.id === uniqueIdAiSearchWidgetFormPromptTextArea) {
            return;
        }
        lastSelectedEditableElement = target;

        const clickX = event.clientX;
        const clickY = event.clientY;

        if (!movedUnderTextarea) {
            // Запоминаем исходные координаты
            originalPosition.bottom = button.style.bottom;
            originalPosition.right = button.style.right;
            originalPosition.top = button.style.top;
            originalPosition.left = button.style.left;
        }

        movedUnderTextarea = true;

        // Меняем позиционирование кнопки
        button.style.bottom = '';
        button.style.right = '';
        button.style.top = (clickY + 10) + 'px'; // чуть ниже клика
        button.style.left = (clickX - button.offsetWidth / 2) + 'px';

        // Фокусируем textarea, чтобы отслеживать потерю фокуса
        target.focus();
    }

// Восстановление позиции кнопки
    function restoreButtonPosition() {
        button.style.top = originalPosition.top || '';
        button.style.left = originalPosition.left || '';
        button.style.bottom = originalPosition.bottom || '20px';
        button.style.right = originalPosition.right || '20px';
        movedUnderTextarea = false;
    }

// Обработчик клика по кнопке
    button.addEventListener('click', () => {

        if (lastSelectedEditableElement) {
            openAiFormEditableContent();
            return;
        }

        openAiScenarioButtons();
    });

    function openAiFormEditableContent() {
        const editableContentForm = document.getElementById(uniqueIdAiSearchWidgetFormEditableContent);
        editableContentForm.style.display = 'block';
    }

    function openAiScenarioButtons() {
        //alert('scenario buttons');

        const selectedText = window.getSelection().toString();
        if (selectedText) {
            // Можно обработать выделенный текст
            //alert(selectedText);
        } else {
            // alert('Текст не выделен');
        }
    }

// Дополнительный обработчик для фокусировки на уже фокусированном элементе
// (например, если элемент уже в фокусе до клика)
    document.addEventListener('focusin', (event) => {

        const target = event.target;
        if (
            target.tagName.toLowerCase() === 'textarea' ||
            target.getAttribute('contenteditable') === 'true'
        ) {
            // Если элемент уже в фокусе, запускаем тот же уход в позицию
            handleEditableFocus(target, { clientX: target.getBoundingClientRect().left + 10, clientY: target.getBoundingClientRect().top + 10 });
        }
    });
// Функция для вставки HTML шаблона на страницу
    function insertTemplate() {
        // Создаем шаблон
        const template = document.createElement('template');
        template.innerHTML = `
    <style>
      .aiSearchWidget {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 600px;
    width: 100%;
    padding: 15px;
    background:
rgba(0, 0, 0, 0.8);
    color:
white;
    font-family: Arial, sans-serif;
    border-radius: 10px;
    box-shadow: 0 0 10px
rgba(0,0,0,0.5);
    z-index: 999999;
  }
  .aiSearchWidget #${uniqueIdAiSearchWidgetFormMainBtn} {
    background:
#4CAF50;
    color:
white;
    border: none;
    padding: 8px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  }
  .aiSearchWidget button:hover {
    background:
#45a049;
  }
  .aiSearchWidget textarea {
    margin-bottom: 10px;
    padding: 8px 10px;
    border-radius: 5px;
    border: none;
    font-size: 14px;
    width: 95%;
  }

  .closeBtn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 20px;
    height: 20px;
    background-color: grey;
    border: none;
    color: white;
    font-weight: bold;
    font-size: 14px;
    cursor: pointer;
    border-radius: 30px;
  }
    </style>
    <div id="${uniqueIdAiSearchWidgetFormEditableContent}" class="aiSearchWidget" style="display: none">
      <button class="closeBtn" id="aisearchWidgetCloseBtn" title="Закрыть">&times;</button>
      <textarea id="${uniqueIdAiSearchWidgetFormPromptTextArea}" placeholder="Введите запрос..."></textarea>
      <button id="${uniqueIdAiSearchWidgetFormMainBtn}">Делай</button>
      <div id="aiSearchResult" style="margin-top:10px; font-size: 13px;"></div>
    </div>
  `;
        // Вставляем шаблон в тело страницы
        document.body.appendChild(template.content.cloneNode(true));

        // Навешиваем логику на кнопку
        const widget = document.getElementById(uniqueIdAiSearchWidgetFormEditableContent);
        const input = widget.querySelector('textarea');
        const mainButton = widget.querySelector('#'+uniqueIdAiSearchWidgetFormMainBtn);
        const resultDiv = widget.querySelector('#aiSearchResult');

        mainButton.addEventListener('click', () => {

           const pageText = document.body.innerText;

            // Получаем HTML код страницы и выводим в консоль
            const pageHTML = document.documentElement.outerHTML;

            //return;
            const query = input.value.trim();
            if (!query) {
                resultDiv.textContent = 'Пожалуйста, введите запрос.';
                return;
            }

            chrome.runtime.sendMessage({ type: "task", prompt: pageText + "\n" + query }, response => {
                if (response && response.error) {
                    console.error("Error response:", response.error);
                }
            });

            lastInputElmInitExecuteTask = lastSelectedEditableElement;
        });

        const aisearchWidgetCloseBtn = document.getElementById('aisearchWidgetCloseBtn');

        aisearchWidgetCloseBtn.addEventListener('click', () => {

            const widget = document.getElementById(uniqueIdAiSearchWidgetFormEditableContent);

            if (widget) {
                widget.style.display = 'none';
            }
        });
    }

    // Запускаем вставку шаблона после загрузки страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTemplate);
    } else {
        insertTemplate();
    }

    let accumulateResponseContent = '';
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('tyhyt');
        if (message.type === 'data') {
            console.log("Received data chunk:", message.data);
            //console.log(lastInputElmInitExecuteTask);
            accumulateResponseContent += message.data;

            if ('value' in lastInputElmInitExecuteTask) {
                lastInputElmInitExecuteTask.value = accumulateResponseContent;
            } else {
                // Если свойства value нет (например, div), вставляем код внутрь элемента
                lastInputElmInitExecuteTask.innerHTML = accumulateResponseContent;

                // Создаём и отправляем событие 'input' (или 'change' если нужно)
                const changeEvent = new Event('change', {
                    bubbles: true,
                    cancelable: true,
                });

                lastInputElmInitExecuteTask.dispatchEvent(changeEvent);
            }

        }

        if (message.type === 'task_complete') {
            console.log("Task completed.");
            accumulateResponseContent = '';
        }
    });
}
