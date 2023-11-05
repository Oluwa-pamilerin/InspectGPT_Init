const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const envFilePath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envFilePath });
const limit = 10000; // Set your payload size limit here
const apiKey = process.env.API_KEY;
if (result.error) {
    console.error(`Error loading .env file: ${result.error.message}`);
} else {
    // Check if the API_KEY is available
    if (!apiKey) {
        console.error("API_KEY is not found in the .env file. Please check your configuration.");
    }
}

// List of file names to omit
function activate(context) {
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
                    const selectedText = editor.document.getText(selection).slice(0, limit) + '... "\n The code continues..."';
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


    const language = getActiveFileLanguage()
    const fileContent = getActiveFileContent();

    const MODEL_NAME = "models/chat-bison-001";
    const API_KEY = "AIzaSyBZxz1NG1QpRtLRKq1wC_wJSYz7lZYPl5k";
    const messages = [];


    const client = new DiscussServiceClient({
        authClient: new GoogleAuth().fromAPIKey(API_KEY),
    });

    const context = "Reply like a seasoned senior developer and code coach giving detailed explanation to the extracted code line. The file currently being worked on is written in \n '" + language+ "' programming language. This is the content of the file: \n '" + fileContent+ "' \n" ;
    const examples = [
        {
            "input": {
                "content": "Deligently check out this extract below and explain what this code is all about in specific context to the other codes in the project. If there are any error, point them out." + "\n" + "from dotenv import load_dotenv" + "\n" + "If neccesary, send the corrected version of the code. If your response include a code, Enclose it in a '<pre>' tag. \n Meanwhile, if you do not undestand anything about the extracted code, simply make a comment about the extracted code on how it can be made more meaningful.",

            },
            "output": {
                "content": "I see that you've provided a code extract and requested an explanation of what this code is all about in the specific context of the other codes in the project. Let's examine the code:```from dotenv import load_dotenv```This line of code is importing the load_dotenv function from the dotenv module. It's a common practice in Python to use the import statement to bring in external functions or classes from libraries to use them in your code.The purpose of this line of code is to import the load_dotenv function. load_dotenv is typically used for loading environment variables from a .env file into the application's environment. This is a common technique for managing sensitive information like API keys and database credentials without hardcoding them in your code.Regarding its context within the project, it's important to know that this line is just one part of the code, and its specific role depends on how and where it's used within the project. Without access to the entire codebase, it's challenging to provide a detailed context. If you can share more code or describe where and how this code is used, I can provide a more specific explanation.As for the code itself, there doesn't appear to be any errors in this line. It's a straightforward import statement.If you have more code or specific questions about how this code is used in your project, please feel free to share that, and I'll be happy to provide further assistance."
            }
        }, {
            "input": {
                "content": "Deligently check out this extract below and explain what this code is all about in specific context to the other codes in the project. If there are any error, point them out." + "\n" + "from bardapi import Bard" + "\n" + "If neccesary, send the corrected version of the code. If your response include a code, Enclose it in a '<pre>' tag. \n Meanwhile, if you do not undestand anything about the extracted code, simply make a comment about the extracted code on how it can be made more meaningful."
            },
            "output": {
                "content": "I see that you've provided a code extract that seems to import something from the bardapi module. However, I can't provide a complete understanding of the code without the full context of the project and other related codes. To understand the code in its specific context, I would need to see the entire project or at least more of the surrounding code. Without the complete codebase, I can't identify specific errors or provide a comprehensive explanation. If you have any specific questions or concerns about this code or if you can provide more details about the project, please feel free to share them, and I'll do my best to assist you."
            }
        },
        {
            "input": {
                "content": "Deligently check out this extract below and explain what this code is all about in specific context to the other codes in the project. If there are any error, point them out." + "\n" + "load_dotenv()" + "\n" + "If neccesary, send the corrected version of the code. If your response include a code, Enclose it in a '<pre>' tag. \n Meanwhile, if you do not undestand anything about the extracted code, simply make a comment about the extracted code on how it can be made more meaningful."
            },
            "output": {
                "content": "The code extract you provided, 'load_dotenv()', appears to be a Python function call. In the context of a Python project, this function is typically used to load environment variables from a file called '.env' into the project's environment. These environment variables are often used to store configuration settings or sensitive information such as API keys.The line 'load_dotenv()' is a common way to initiate the process of loading these environment variables from the .env file into the application. It's usually placed at the beginning of a Python script or application to ensure that the environment variables are available for the rest of the code.As for pointing out any errors, there is no error in the code extract 'load_dotenv().' It's a valid function call in Python, and its correctness depends on whether the 'python-dotenv' library is correctly installed and whether the '.env' file exists in the project directory.Since there are no errors in the provided code extract, there's no need to send a corrected version. If you have any specific questions or need further assistance related to this code or any other part of your project, please feel free to ask."
            }
        }
    ];

 messages.push({
        "content": "Deligently check out this extract below and explain what this code is all about in specific context to the other codes in the project. If there are any error, point them out." + "\n '" + highlightedText + "' \n" + "If neccesary, send the corrected version of the code. If your response include a code. Enclose it in a '<pre>' tag ",
    // "content": "Simply Check this text and make a comment about it \n '" + highlightedText + "' \n"
    });

    client.generateMessage({
        // required, which model to use to generate the result
        model: MODEL_NAME,
        // optional, 0.0 always uses the highest-probability result
        temperature: 0.25,
        // optional, how many candidate results to generate
        candidateCount: 8,
        // optional, number of most probable tokens to consider for generation
        top_k: 40,
        // optional, for nucleus sampling decoding strategy
        top_p: 0.95,
        prompt: {
            // optional, sent on every request and prioritized over history
            context: context,
            // optional, examples to further finetune responses
            examples: examples,
            // required, alternating prompt/response messages
            messages: messages,
        },
    }).then(result => {
        // console.log(JSON.stringify(result, null, 2));
        if (result && result[0] && result[0].candidates && result[0].candidates.length > 0) {
            result[0].candidates.forEach(obj => {
                panel.webview.html = getWebviewContent(highlightedText, obj.content);
                messages.push({ "content": obj.content })
                console.log(obj.content);
            });
        } else {
            console.log("Opps, please provide some more info");
            console.log(result);
            panel.webview.html = getWebviewContent(highlightedText, "Opps, please provide some more info");
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

