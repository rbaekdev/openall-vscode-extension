import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Recursive function to get all folders in a directory
async function getFolders(dir: string): Promise<vscode.QuickPickItem[]> {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const folders = dirents
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => ({
      label: dirent.name,
      description: path.join(dir, dirent.name),
    }));

  const nestedFolders = await Promise.all(
    folders.map(async (folder) => await getFolders(folder.description!))
  );

  return [...folders, ...nestedFolders.flat()];
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.openAllFiles",
    async () => {
      if (vscode.workspace.workspaceFolders) {
        const items: vscode.QuickPickItem[] = [];
        for (const folder of vscode.workspace.workspaceFolders) {
          items.push(...(await getFolders(folder.uri.fsPath)));
        }

        const selectedFolder = await vscode.window.showQuickPick(items, {
          placeHolder: "Select the folder",
        });

        if (selectedFolder) {
          const folderPath = selectedFolder.description;

          // Save and close all currently open files
          await vscode.commands.executeCommand(
            "workbench.action.closeAllEditors"
          );

          // Open files in the selected directory
          fs.readdir(folderPath!, (err, files) => {
            if (err) {
              vscode.window.showErrorMessage(`Read directory error: ${err}`);
            } else {
              let column = 1;
              for (const file of files) {
                const filePath = path.join(folderPath!, file);
                const openPath = vscode.Uri.file(filePath);
                vscode.workspace.openTextDocument(openPath).then((doc) => {
                  // If an editor group for this column does not exist, it will be created
                  vscode.window.showTextDocument(doc, column);
                  column++;
                });
              }
            }
          });
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}
