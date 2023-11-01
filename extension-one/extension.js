const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// List of file names to omit
const omittedFiles = ['.env', 'secrets.txt', 'private.key']; // Add sensitive file names here

function activate(context) {
    logAllFolderContents();

    // Register an event listener to log folder contents when a workspace folder is added
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        logAllFolderContents();
    });
}

function logAllFolderContents() {
    const { workspace } = vscode;
    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
        vscode.window.showInformationMessage('No workspace folders are opened.');
        return;
    }

    workspace.workspaceFolders.forEach((folder) => {
        const folderPath = folder.uri.fsPath;
        const folderName = path.basename(folderPath);

        // Read the files in the folder
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                vscode.window.showErrorMessage(`Error reading the directory: ${err.message}`);
                return;
            }

            // Loop through the files in the folder
            files.forEach((file) => {
                // Check if the file should be omitted
                if (!omittedFiles.includes(file)) {
                    const filePath = path.join(folderPath, file);
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    console.log(`Folder: ${folderName}, File: ${filePath}`);
                    console.log(fileContent);
                }
            });
        });
    });

    vscode.window.showInformationMessage('Folder contents logged in the console, omitting sensitive files.');
}

exports.activate = activate;
