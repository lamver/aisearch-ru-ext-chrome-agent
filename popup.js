document.getElementById('clickMe').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;

        chrome.scripting.executeScript(
            {
                target: { tabId: tabId },
                func: () => document.documentElement.outerHTML,
            },
            (results) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    return;
                }
                const pageHtml = results[0].result;
                console.log('HTML страницы:', pageHtml);
                alert(pageHtml);
            }
        );
    });

    // Получить адрес текущей вкладки
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        console.log('URL текущей вкладки:', currentTab.url);
        alert(currentTab.url);
        //alert(currentTab.html);
    });
});

document.getElementById('authCheck').addEventListener('click', () => {
    // Выполняем fetch по указанному маршруту
    authCheck();
});

function authCheck() {
    fetch('https://aisearch.ru/api/v3/test')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json(); // или response.text(), в зависимости от формата ответа
        })
        .then(data => {
            console.log(data);
            let authState = false;
            if (data.auth) {
                authState = true;
            }
            let authStateHtmlCode = '<a target="_blank" href="https://aisearch.ru/login">Авторизоваться</a>';
            if (authState) {
                authStateHtmlCode = 'Да';
            }
            document.getElementById('auth-state').innerHTML = authStateHtmlCode;
            // Выводим полученные данные в div
            //document.getElementById('checkData').textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            //document.getElementById('checkData').textContent = 'Ошибка: ' + error.message;
        });
}

document.addEventListener('DOMContentLoaded', function() {
    // Это событие срабатывает, когда документ полностью загружен и DOM полностью готов.
    authCheck();

    const enableCheckbox = document.getElementById('enable-checkbox');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        const url = new URL(currentTab.url);
        const domain = url.hostname;

        // Проверяем хранится ли разрешение для текущего домена
        chrome.storage.sync.get([domain], (result) => {
            if (result.hasOwnProperty(domain)) {
                enableCheckbox.checked = result[domain];
            } else {
                enableCheckbox.checked = true; // default value
            }
        });

        enableCheckbox.addEventListener('change', (event) => {
            const isEnabled = event.target.checked;
            let storageObject = {};
            storageObject[domain] = isEnabled;

            // Сохраняем разрешение для текущего домена
            chrome.storage.sync.set(storageObject, () => {
                console.log(`AiSearch ${isEnabled ? 'enabled' : 'disabled'} for ${domain}`);
            });
        });
    });
});

