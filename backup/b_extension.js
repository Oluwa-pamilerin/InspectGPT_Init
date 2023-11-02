const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const envFilePath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envFilePath });
let apiKey;

if (result.error) {
    console.error(`Error loading .env file: ${result.error.message}`);
} else { 
    // Check if the API_KEY is available
    if (!apiKey) {
        console.error("API_KEY is not found in the .env file. Please check your configuration.");
    }
}
apiKey = process.env.API_KEY;

// List of file names to omit
const omittedFiles = ['.env', 'secrets.txt', 'private.key']; // Add sensitive file names here
let fileContents = [];

function dislayfileContentText(fileContents) {
    fileContents.forEach(fileContent => {
        return fileContent
    });
}

function activate(context) {
    // Register an event listener to log folder contents when a workspace folder is ready
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        logAllFolderContents();
    });

    // Extension Activation
    console.log('Congratulations, your extension "inspectgpt" is now active!');

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
                const selectedText = editor.document.getText(selection);
                panel = sendHighlightedTextToBard(selectedText, panel); // Pass the panel variable
            }
        }
    }));

    // Run extension one at the beginning
    logAllFolderContents();
}
function logAllFolderContents() {
    const { workspace } = vscode;
    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
        vscode.window.showInformationMessage('No workspace folders are opened.');
        return;
    }

    // Loop through the opened workspace folders
    workspace.workspaceFolders.forEach((folder) => {
        const folderPath = folder.uri.fsPath;
        const folderName = path.basename(folderPath);

        // Read the files in the folder
        try {
            const files = fs.readdirSync(folderPath);

            // Loop through the files in the folder
            files.forEach((file) => {
                // Check if the file should be omitted
                if (!omittedFiles.includes(file)) {
                    const filePath = path.join(folderPath, file);
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    // console.log(`Folder: ${folderName}, File: ${filePath}`);
                    // console.log(fileContent);

                    // Add the file content to the array
                    fileContents.push({ folderName, filePath, fileContent });
                }
            });
        } catch (error) {
            console.error('Error reading the directory:', error.message);
        }
    });

    vscode.window.showInformationMessage('InspectGPT is all set! Happy Coding 👨‍💻');
}

// Now you can access the file contents from outside the function using the 'fileContents' array.


// ... (Previous code)

// Function to send highlighted text to Bard and handle the response.




function sendHighlightedTextToBard(highlightedText, existingPanel) {
    if (!apiKey) {
        console.error("API_KEY is not available. Cannot make the request.");
        return existingPanel;
    }
    const apiUrl = "https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText?key=" + apiKey;
    const requestData = {
        prompt: {
            text: "Below are the content of the coding project I am currently working on using Vscode editor." + "\n" +
                dislayfileContentText(fileContents) + "\n" +
                "I want you to go through the codes. Digest it and understand it well.  Then, deligently check out this extract below and explain what this code is all about in specific context to the other codes in the project. If there are any error, point them out." + "\n" + highlightedText + "\n" + "If neccesary, send the corrected version of the code. If your response include a code. Enclose it in a '<pre>' tag ",
        }
    };

    const headers = {
        'Content-Type': 'application/json',
    };

    if (existingPanel) {
        existingPanel.dispose(); // Dispose the existing panel
    }

    // Create a new panel
    const panel = vscode.window.createWebviewPanel(
        'highlightedTextPanel',
        'Highlighted Text and Bard Response',
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
        }
    );

    // Show "Waiting for Bard" while waiting for the response
    panel.webview.html = getWebviewContent(highlightedText, 'Waiting for Bard...');

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(message => {
        console.log(message.text);
        // vscode.window.showInformationMessage(`Received: ${message.text}`);
    });

    // Send the highlighted text to Bard via an HTTP request
    axios.post(apiUrl, requestData, { headers })
        .then(response => {
            if (response.data && response.data.candidates && response.data.candidates.length > 0) {
                console.log('Response Data:', response.data.candidates[0].output.toString());
                // Update the webview with Bard's response
                panel.webview.html = getWebviewContent(highlightedText, response.data.candidates[0].output);

            } else {
                console.error('No valid response data from Bard');
                console.log(response.data);
                panel.webview.html = getWebviewContent(highlightedText, "Opps An Error Occured! Please Retry");
            }

        })
        .catch(error => {
            if (error.code === 'ECONNABORTED') {
                // Network timeout error, indicate no internet connection
                panel.webview.html = getWebviewContent(highlightedText, 'No Internet Connection');
            } else {
                console.error('Error sending text to Bard:', error);

                // Handle other errors in the webview
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
    const searchedResponse = formattedResponse.replace(codeRegex, '<pre style="padding: 10px; border-radius:5px; background-color: black; color: white; white-space: pre-wrap;">$1</pre>');


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
            <!-- Add more messages as needed -->
        </div>
        <div class="input">
            <textarea id="textInput" class="message-input" type="text"  placeholder="Ask Followup Questions"></textarea>
            <br>
            <button id="logButton" class="send-button">Send</button>
        </div>
    </div>

    <script>
    const vscode = acquireVsCodeApi();

    document.getElementById("logButton").addEventListener("click", () => {
        const textInput = document.getElementById("textInput");
        const text = textInput.value;
        vscode.postMessage({ text });
    });
</script>

</body>
</html>
`
}


function deactivate() {
    // This method is called when your extension is deactivated.
}

module.exports = {
    activate,
    deactivate,
};
