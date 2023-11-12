const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const envFilePath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envFilePath });
const limit = 10000; // Set your payload size limit here
let config = '';
let apiKey = '';

var getResult = false;

// List of file names to omit
function activate(context) {
    config = vscode.workspace.getConfiguration('InspectGPT');
    apiKey = config.get('apiKey');
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.inspectGPTAPIKey', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'InspectGPT.apiKey');
        })
    );
    if (!apiKey) {
        vscode.window.showErrorMessage('InspectGPT API key is not set. Please configure it in the settings. Click Ctrl+Shift+P and type "InspectGPT API KEY" in the search box.');
    }

    config = vscode.workspace.getConfiguration('InspectGPT');
    apiKey = config.get('apiKey');

    if (!apiKey) {
        vscode.window.showErrorMessage('InspectGPT API key is not set. Click "InspectGPT API KEY" to configure it.');
    } else {
        // Continue with extension logic using apiKey
    }

    // Register an event listener to log folder contents when a workspace folder is ready
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
    });

    // Extension Activation
    console.log('Congratulations, your extension "inspectgpt" is now active!');
    vscode.window.showInformationMessage('InspectGPT is all set! Happy Coding 👨‍💻');

    let currentSelection = null;
    let selectionTimeout = null;
    let panel = null; // Declare the panel variable

    // Event listener for text selection changes in the editor
    vscode.window.onDidChangeTextEditorSelection(() => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            if (!selection.isEmpty) {
                const selectedText = editor.document.getText(selection);
                if (selectedText !== currentSelection) {
                    if (selectionTimeout) {
                        clearTimeout(selectionTimeout);
                    }

                    selectionTimeout = setTimeout(async () => {
                        currentSelection = selectedText;
                        vscode.window.showInformationMessage(`InspectGPT`, 'InspectGPT').then(
                            async (selection) => {
                                if (selection === 'InspectGPT') {
                                    sendHighlightedTextToBard(currentSelection, panel); // Pass the panel variable
                                }
                            }
                        );
                    }, 500);
                }
            } else {
                currentSelection = null;
            }
        }
    });

    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('inspectgpt.searchStackOverflow', async () => {
        // You can add custom logic for this command here if needed.
    }));

    context.subscriptions.push(vscode.commands.registerCommand('inspectgpt.openWebview', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            if (!selection.isEmpty) {
                if (editor.document.getText(selection).length <= limit) {
                    const selectedText = editor.document.getText(selection);
                    // If the content is within the limit, return it as is
                } else {
                    // If content exceeds the limit, return the content until the limit with "..."
                    const selectedText = editor.document.getText(selection).slice(0, limit) + "... '\n The code continues...'";
                }
                panel = sendHighlightedTextToBard(selectedText, panel); // Pass the panel variable
            }
        }
    }));

    // Run extension one at the beginning
}
// Now you can access the file contents from outside the function using the 'fileContents' array.


// ... (Previous code)

// Function to send highlighted text to Bard and handle the response.

function getActiveFileLanguage() {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
        const document = editor.document;
        const languageId = document.languageId;
        return languageId;
    } else {
        vscode.window.showInformationMessage('No active text editor found.');
        return null; // Return null or an appropriate value if there's no active text editor.
    }
}

function getActiveFileContent() {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
        const document = editor.document;
        const text = document.getText();
        const limit = 10000; // Set your payload size limit here

        if (text.length <= limit) {
            return text; // If the content is within the limit, return it as is
        } else {
            // If content exceeds the limit, return the content until the limit with "..."
            const truncatedContent = text.slice(0, limit) + '... "The code continues..."';
            return truncatedContent;
        }
    } else {
        vscode.window.showInformationMessage('No active text editor found.');
        return null; // Return null or an appropriate value if there's no active text editor.
    }
}


function sendHighlightedTextToBard(highlightedText, existingPanel) {
    getResult = false;
    if (!apiKey) {
        console.error("API_KEY is not available. Cannot make the request.");
        return existingPanel;
    }

    const { DiscussServiceClient } = require("@google-ai/generativelanguage");
    const { GoogleAuth } = require("google-auth-library");

    if (existingPanel) {
        existingPanel.dispose(); // Dispose the existing panel
    }

    // Create a new panel
    const panel = vscode.window.createWebviewPanel(
        'highlightedTextPanel',
        highlightedText,          // Truncate to 50 characters,
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
        }
    );

    // Show "Waiting for Bard" while waiting for the response
    getResult = false;
    panel.webview.html = getWebviewContent(highlightedText, 'Waiting for Bard...');

    // Handle messages from the webview
    // panel.webview.onDidReceiveMessage(message => {
    //     console.log(message.text);
    //     // vscode.window.showInformationMessage(`Received: ${message.text}`);
    // });

    // Send the highlighted text to Bard via an HTTP request
    const language = getActiveFileLanguage();
    const fileContent = getActiveFileContent();
    const MODEL_NAME = "models/chat-bison-001";
    const API_KEY = apiKey;
    const messages = [];

    const content = "Deligently check out this extract below and explain what this code is all about in specific context to the other codes in the project. If there are any error, point them out." + "\n" + highlightedText + "\n" + "If necessary, send the corrected version of the code. If your response includes code, enclose it in a '<pre>' tag."
    // const content = "Rewrite the corrected version of this code: " + "\n" + highlightedText + "\n";

    messages.push({
        "content": content
    });
    const client = new DiscussServiceClient({
        authClient: new GoogleAuth().fromAPIKey(API_KEY),
    });

    const context = "Reply like a seasoned senior developer and code coach giving detailed explanation to the extracted code line. The file currently being worked on is written in \n '" + language + "' programming language. This is the content of the file: \n '" + fileContent + "' \n";
    const examples = [
        {
            "input": {
                "content": "Simply Check this text and say something:axios.post(apiUrl, requestData, { headers }).then(response => {// console.log('Response Status Code:', response.status);console.log('Response Data:', response.data.candidates[0].output.toString());}).catch(error => { console.error('Error:', error);});If it is meaningless, let me know"
            },
            "output": {
                "content": "The provided text appears to be JavaScript code snippet that utilizes the Axios library to perform an HTTP POST request. It sends the request to an API endpoint specified by apiUrl with the request data stored in requestData and custom headers defined in the headers object.Upon successful completion of the request, the then() block is executed, which logs the response status code and the first candidate's output string to the console. If an error occurs during the request, the catch() block is triggered, logging the error details to the console.The code snippet seems meaningful in the context of making HTTP POST requests and handling responses using the Axios library. It demonstrates the basic structure of sending data to an API endpoint and processing the received response"
            }
        }
    ];

    client.generateMessage({
        model: MODEL_NAME,
        temperature: 0.25,
        candidateCount: 8,
        top_k: 40,
        top_p: 0.95,
        prompt: {
            context: context,
            examples: examples,
            messages: messages,
        },
    }).then(result => {
        if (result && result[0] && result[0].candidates && result[0].candidates.length > 0) {
            result[0].candidates.forEach(obj => {
                panel.webview.html = getWebviewContent(highlightedText, obj.content);
                messages.push({ "content": obj.content });
                getResult = true;
            });
        } else {
            console.log("Oops, please provide some more info");
            getResult = true;
            panel.webview.html = getWebviewContent(highlightedText, "Oops, please provide some more info");
        }
    }).catch(error => {
        if (error.code === 'ECONNABORTED' || error.code === 14) {
            getResult = true;
            panel.webview.html = getWebviewContent(highlightedText, 'Please Check Your No Internet Connection');
        }else if(error.code === 3){
            getResult = true;
            panel.webview.html = getWebviewContent(highlightedText, 'Your API Key Is Invalid. Pease Recheck It. Click Ctrl+Shift+P and type "InspectGPT API KEY" in the search box.');
        } else {
            console.error('Error sending text to Bard:', error.code);
            getResult = true;
            panel.webview.html = getWebviewContent(highlightedText, 'Error sending text to Bard');
        }
    });

    return panel; // Return the new panel
}

// ... (Rest of the code)


function getWebviewContent(selectedText, bardResponse) {
    const formattedResponse = bardResponse
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(paragraph => `<p>${paragraph}</p>`)
        .join('')
        .toString()
    const codeRegex = /```([\s\S]*?)```/g;
    function replaceParagraphTagsWithNewlines(match) {
        const replacedMatch = match.replace(/<\/p><p>/g, '\n').replace(/```/g, '');
        return "<pre style='padding: 10px; padding-right: 10px; border-radius:5px; background-color: black; white-space: no-wrap; overflow-x: auto;'><pre><code style = 'color: white;'><xmp>" + replacedMatch + "</xmp></code></pre></pre>"
    }
    const searchedResponse = formattedResponse.replace(codeRegex, replaceParagraphTagsWithNewlines);

    selectedText = "<pre><code><xmp>" + selectedText + "</xmp></code></pre>"

    function truncateText(text, lines = 3) {
        // Check if the text is more than 3 lines.
        const textLines = text.split('\n').length;
        if (textLines <= lines) {
            return text;
        }

        // Truncate the text to the first three lines.
        var truncatedText = text.split('\n').slice(0, lines).join('\n');

        // Add a "Read More" link to the end of the truncated text.
        truncatedText = truncatedText + 'Read More';

        // Return the truncated text.
        return truncatedText;
    }

    selectedText = truncateText(selectedText, 3);
    return `<!DOCTYPE html>
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #343541;
            margin: 0;
            padding: 0;
        }

        header {
            background-color: #444654;
            color: white;
            text-align: center;
            padding: 10px;
        }

        #selectedText{
            visibility:hidden;
        }

        .chat-container {
            width:100%;
            margin: 20px auto;
            border-radius: 5px;
            height: 100%;
            padding-bottom: 100px
        }

        .chat {
            padding: 20px;
        }

        .user-message, .bot-message {
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
        }

        .user-message {
            background-color: #343541;
        }

        .bot-message {
            color: white;
            margin-bottom: 70px;
        }

        .message-input {
            width: 80%;
            padding: 10px;
            border: none;
            border-top: 1px solid #0078D4;
            margin: 10px 10px;
            border-radius: 5px;
            max-height: 50px;
            resize: none;
            overflow: hidden;
        }

        .send-button {
            background-color: #6B6C7B;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }

        .input {
            text-align: center;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            padding: 10px;
            border-radius: 5px;
            background-color: #444654;
        }
        .chat-container {
            width: 100%;
            margin: 20px auto;
            border-radius: 5px;
            height: 100%;
            padding-bottom: 100px;
        }
        
        .chat {
            padding: 20px;
        }
        
        .message-input {
            width: 80%;
            padding: 10px;
            border: none;
            border-top: 1px solid #0078D4;
            margin: 10px 10px;
            border-radius: 5px;
            max-height: 50px;
            resize: none;
            overflow: hidden;
        }
        
        .send-button {
            background-color: #6B6C7B;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }
        .invisible{
            visibility:hidden;
        }
        .retry-button{
            background-color: white;
            color: #343541;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
        }

    </style>
</head>
<body>
    <header>
        <h1>InspectGPT</h1>
    </header>
    <div class="chat-container">
    <div class="chat">
            <div class="bot-message">
                ${searchedResponse}
            </div>
            <button id="retry-button" class="invisible retry-button" >Retry</button>
            <hr>
            <div id="selectedText">
                ${selectedText}
            </div>
        </div>
    <div class="chat">
        <!-- Chat messages will go here -->
    </div>
    <div class="input">
        <textarea id="textInput" class="message-input" type="text"  placeholder="Ask Followup Questions"></textarea>
        <br>
        <button id="sendButton" class="send-button">Send</button>
    </div>
    </div>

    <script>
    function updateButtonVisibility() {
        const botMessage = document.getElementById("bot-message");
        const retryButton = document.getElementById("retry-button");

        if (${getResult} === true) {
            retryButton.classList.remove("invisible");
        } else{
            retryButton.classList.add("invisible");
        }
    }

    updateButtonVisibility();

    // Monitor changes to the bot message text
    setInterval(updateButtonVisibility, 1000);
    function appendMessage(sender, message) {
        const chat = document.querySelector(".chat");
        const messageElement = document.createElement("div");
        messageElement.className = sender === "user" ? "user-message" : "bot-message";
        const icon = document.createElement("span");
        icon.className = sender === "user" ? "user-icon" : "bot-icon";
        icon.innerHTML = sender === "user" ? "👤  " : "🤖  "; // Add icons for the user and bot
        messageElement.appendChild(icon);
        messageElement.innerHTML += message;
        chat.appendChild(messageElement);
    }

    document.getElementById("sendButton").addEventListener("click", () => {
        sendMessage();
    });

    document.getElementById("textInput").addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            sendMessage();
        }
    });

    function sendMessage() {
        const textInput = document.getElementById("textInput");
        const text = textInput.value;
        const selectedText = document.getElementById("selectedText").textContent; // Get the text content
        if (text) {
            // Display the user's message in the chat
            appendMessage("user", text);

            // Send the user's message to Bard API (you'll need to integrate this)
            // Replace the following line with your Bard API call
            sendToBard(text, selectedText);

            // Clear the input field
            textInput.value = "";
        }
    }

    // Example function for sending a message to Bard
    function sendToBard(text, selectedText) {
        console.log("selectedText: " + selectedText);
        // Your Bard API integration code here
        // Replace this with your actual API call

        // For this example, we'll simply respond with "seen"
        appendMessage("bot", "Seen: " + text + " SelectedText: " + selectedText);
    }

    document.getElementById("retry-button").addEventListener("click", retry);
    function retry() {
        const selectedText = document.getElementById("selectedText").textContent; // Get the text content
    }
    // Add an event listener to the "Read More" link.
const readMoreLinks = document.querySelectorAll('.read-more');
readMoreLinks.forEach(link => {
  link.addEventListener('click', event => {
    // Prevent the default link behavior.
    event.preventDefault();

    // Get the parent element of the "Read More" link.
    const parentElement = link.closest('.truncated-text');

    // Remove the "Read More" link from the parent element.
    link.remove();

    // Display the remaining lines of text.
    parentElement.classList.remove('truncated');
  });
});

 </script>
        </body>
        </html>
        `;
}


function deactivate() {
    // This method is called when your extension is deactivated.
}

module.exports = {
    activate,
    deactivate,
};

