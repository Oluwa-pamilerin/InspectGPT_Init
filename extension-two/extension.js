const vscode = require('vscode');
const axios = require('axios');

function activate(context) {
  console.log('Congratulations, your extension "inspectgpt" is now active!');

  let currentSelection = null;
  let panel = null;
  let selectionTimeout = null;

  vscode.window.onDidChangeTextEditorSelection((event) => {
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
                  sendHighlightedTextToBard(currentSelection);
                  if (panel) {
                    panel.dispose();
                  }

                  panel = vscode.window.createWebviewPanel(
                    'highlightedTextPanel',
                    'Highlighted Text and Bard Response',
                    vscode.ViewColumn.Two,
                    {
                      enableScripts: true,
                    }
                  );

                  panel.webview.html = getWebviewContent(currentSelection, 'Waiting for Bard response...');
                }
              }
            );
          }, 500);
        }
      } else {
        currentSelection = null;
        if (panel) {
          panel.dispose();
        }
        if (selectionTimeout) {
          clearTimeout(selectionTimeout);
          selectionTimeout = null;
        }
      }
    }
  });

  function sendHighlightedTextToBard(highlightedText) {
    const apiUrl = "https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText?key=AIzaSyBZxz1NG1QpRtLRKq1wC_wJSYz7lZYPl5k";
    const requestData = {
      prompt: {
        text: "What can you say about the following text: '" + highlightedText + "'",
      }
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    axios.post(apiUrl, requestData, { headers })
      .then(response => {
        console.log('Response Data:', response.data.candidates[0].output);

        if (panel) {
          panel.webview.html = getWebviewContent(highlightedText, response.data.candidates[0].output);
        }
      })
      .catch(error => {
        console.error('Error sending text to Bard:', error);
      });
  }

  context.subscriptions.push(vscode.commands.registerCommand('inspectgpt.searchStackOverflow', async () => {
    // You can add a similar logic here if needed.
  }));

  context.subscriptions.push(vscode.commands.registerCommand('inspectgpt.openWebview', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const selection = editor.selection;
      if (!selection.isEmpty) {
        const selectedText = editor.document.getText(selection);
        sendHighlightedTextToBard(selectedText);
        if (panel) {
          panel.dispose();
        }

        panel = vscode.window.createWebviewPanel(
          'highlightedTextPanel',
          'Highlighted Text and Bard Response',
          vscode.ViewColumn.Two,
          {
            enableScripts: true,
          }
        );

        panel.webview.html = getWebviewContent(selectedText, 'Waiting for Bard response...');
      }
    }
  }));
}

exports.activate = activate;

function deactivate() { }

module.exports = {
  activate,
  deactivate,
};

function getWebviewContent(selectedText, bardResponse) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #F0F8FF;
          font-size: 30px;
        }
        .container {
          margin: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Highlighted Text</h1>
        <p>${selectedText}</p>
        <h2>Bard Response:</h2>
        <p>${bardResponse}</p>
      </div>
    </body>
    </html>
  `;
}

// Error sending text to Bard: AxiosError {hostname: 'generativelanguage.googleapis.com', syscall: 'getaddrinfo', code: 'ENOTFOUND', errno: -3008, message: 'getaddrinfo ENOTFOUND generativelanguage.googleapis.com', …}