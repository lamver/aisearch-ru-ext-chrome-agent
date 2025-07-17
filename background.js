chrome.runtime.onInstalled.addListener(() => {
    console.log('Расширение установлено!');
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {

    if (request.type === "task") {
        const url = 'https://aisearch.ru/api/v3/services/ai-task/execute';
        const formData = new FormData();
        formData.append('prompt', request.prompt);

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'enctype': 'multipart/form-data'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`${errorData.message}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            const processChunk = async () => {
                const { done, value } = await reader.read();
                if (done) {
                    chrome.tabs.sendMessage(sender.tab.id, { type: "task_complete" });
                    return;
                }

                const chunk = decoder.decode(value, { stream: true });
                const messages = chunk.split('\n').filter(line => line);
                messages.forEach(message => {
                    try {
                        const jsonData = JSON.parse(message.replace(/^data: /, ''));
                        chrome.tabs.sendMessage(sender.tab.id, jsonData);
                    } catch (e) {
                        console.error('Failed to parse chunk message:', e);
                    }
                });
                await processChunk();
            };
            await processChunk();
        } catch (error) {
            sendResponse({ error: error.message });
        }
    }
    return true; // Return true to signal async response
});
