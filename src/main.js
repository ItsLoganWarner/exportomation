import { app, BrowserWindow, ipcMain, dialog, shell, net } from 'electron';
import path from 'node:path';
import fs from 'fs';
import os from 'os';
import { updatePart } from './utils/updateRegistry.js'; // Updated import
import builtInPresets from './utils/builtInPresets.js'  // Import built-in presets

// where to store settings.json (flat in userData)
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1080,
    height: 800,
    minWidth: 1000,
    minHeight: 620,
    useContentSize: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      // devTools: true,  
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  // mainWindow.webContents.openDevTools({ mode: 'detach' });
};

app.whenReady().then(() => {
  createWindow();

  // Handlers to open dialogs and read folders/files
  ipcMain.handle('dialog:openDirectory', async (_evt, defaultPath) => {
    const opts = { properties: ['openDirectory'] };
    if (defaultPath) opts.defaultPath = defaultPath;
    const result = await dialog.showOpenDialog(opts);
    if (!result.canceled) {
      return result.filePaths[0];
    }
    return null;
  });

  // ─── SETTINGS PERSISTENCE ────────────────────────────────────────────────────
  // load settings.json (or return empty object)
  ipcMain.handle('settings:get', async () => {
    try {
      const raw = await fs.promises.readFile(SETTINGS_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });

  // save entire settings object
  ipcMain.handle('settings:set', async (_evt, newSettings) => {
    try {
      await fs.promises.writeFile(
        SETTINGS_FILE,
        JSON.stringify(newSettings, null, 2),
        'utf-8'
      );
      return { success: true };
    } catch (err) {
      console.error('settings:set error', err);
      return { success: false, message: err.message };
    }
  });
  // ──────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('fs:readDirectory', async (event, directoryPath) => {
    try {
      const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });
      return files.map((file) => file.name);
    } catch (err) {
      console.error('Error reading directory:', err);
      return [];
    }
  });

  ipcMain.handle('fs:readFile', async (event, filePath) => {
    try {
      const data = await fs.promises.readFile(filePath, 'utf-8');
      return data;
    } catch (err) {
      console.error('Error reading file:', err);
      return null;
    }
  });

  // Add the jbeam:applyChanges IPC channel
  ipcMain.handle('jbeam:applyChanges', async (event, { filePath, partKey, pendingChanges }) => {
    try {
      let raw = await fs.promises.readFile(filePath, 'utf-8');
      const updated = updatePart(raw, pendingChanges, partKey);
      await fs.promises.writeFile(filePath, updated, 'utf-8');
      return { success: true };
    } catch (err) {
      console.error("applyChanges error:", err);
      return { success: false, message: err.message };
    }
  });

  // Install enhanced audio camsoEngine.lua into the selected vehicle export
  ipcMain.handle('audio:applyEnhanced', async (_evt, engineFilePath) => {
    try {
      if (!engineFilePath) throw new Error('Missing engine file path');
      // engineFilePath: .../vehicles/<name>/eng_xxxx/camso_engine_xxxx.jbeam
      const engDir = path.dirname(engineFilePath);
      const vehicleDir = path.dirname(engDir); // .../vehicles/<name>
      const destDir = path.join(vehicleDir, 'lua', 'powertrain');
      const destFile = path.join(destDir, 'camsoEngine.lua');

      // locate replacement lua
      const candidatesEnhanced = [
        path.join(process.resourcesPath || '', 'enhancedAudio', 'camsoEngine.lua'),
        path.join(process.cwd(), 'assets', 'enhancedAudio', 'camsoEngine.lua'), // dev fallback
      ];
      const srcFile = candidatesEnhanced.find(p => {
        try { return p && fs.existsSync(p); } catch { return false; }
      });
      if (!srcFile) {
        return { success: false, message: 'Enhanced camsoEngine.lua not found in resources.' };
      }

      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcFile, destFile);
      return { success: true };
    } catch (err) {
      console.error('audio:applyEnhanced error', err);
      return { success: false, message: err.message };
    }
  });

  // Copy stock camsoEngine.lua (revert)
  ipcMain.handle('audio:applyStock', async (_evt, engineFilePath) => {
    try {
      if (!engineFilePath) throw new Error('Missing engine file path');
      const engDir = path.dirname(engineFilePath);
      const vehicleDir = path.dirname(engDir);
      const destDir = path.join(vehicleDir, 'lua', 'powertrain');
      const destFile = path.join(destDir, 'camsoEngine.lua');

      const candidatesStock = [
        path.join(process.resourcesPath || '', 'stockAudio', 'camsoEngine.lua'),
        path.join(process.cwd(), 'assets', 'stockAudio', 'camsoEngine.lua'), // dev fallback
      ];
      const srcFile = candidatesStock.find(p => {
        try { return p && fs.existsSync(p); } catch { return false; }
      });
      if (!srcFile) {
        return { success: false, message: 'Stock camsoEngine.lua not found in resources.' };
      }

      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcFile, destFile);
      return { success: true };
    } catch (err) {
      console.error('audio:applyStock error', err);
      return { success: false, message: err.message };
    }
  });

  // Detect installed camsoEngine.lua state (enhanced/stock/unknown/none)
  ipcMain.handle('audio:detectState', async (_evt, engineFilePath) => {
    try {
      if (!engineFilePath) return { state: 'none' };
      const engDir = path.dirname(engineFilePath);
      const vehicleDir = path.dirname(engDir);
      const current = path.join(vehicleDir, 'lua', 'powertrain', 'camsoEngine.lua');
      if (!fs.existsSync(current)) return { state: 'none' };

      const read = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
      const currentTxt = fs.readFileSync(current, 'utf-8');
      const enhancedTxt = read(path.join(process.resourcesPath || '', 'enhancedAudio', 'camsoEngine.lua'))
        || read(path.join(process.cwd(), 'assets', 'enhancedAudio', 'camsoEngine.lua'));
      const stockTxt = read(path.join(process.resourcesPath || '', 'stockAudio', 'camsoEngine.lua'))
        || read(path.join(process.cwd(), 'assets', 'stockAudio', 'camsoEngine.lua'));

      if (enhancedTxt && currentTxt === enhancedTxt) return { state: 'enhanced' };
      if (stockTxt && currentTxt === stockTxt) return { state: 'stock' };
      return { state: 'unknown' };
    } catch (err) {
      return { state: 'unknown', message: err.message };
    }
  });

  ipcMain.handle('shell:openExternal', async (_evt, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('fs:writeFile', async (_evt, filePath, contents) => {
    try {
      await fs.promises.writeFile(filePath, contents, 'utf-8');
      return { success: true };
    } catch (err) {
      console.error('writeFile error:', err);
      return { success: false, message: err.message };
    }
  });

  //
  // PRESETS FOLDERS
  //
  // const isDev = !app.isPackaged;
  // console.log('⛳️ isDev?', isDev);
  // // const builtInPresetsDir = isDev
  // //   ? path.join(process.cwd(), 'resources', 'presets')
  // //   : path.join(process.resourcesPath, 'presets');
  // const devPresetsDir = path.resolve(process.cwd(), 'src', 'presets');
  // // in prod, Forge’s extraResources lands under process.resourcesPath:
  // const prodPresetsDir = path.join(process.resourcesPath, 'presets');

  // const builtInPresetsDir = isDev ? devPresetsDir : prodPresetsDir;
  // const userPresetsDir = path.join(app.getPath('userData'), 'presets');
  // console.log('⛳️ Looking for built-in presets in:', builtInPresetsDir);
  // console.log('⛳️ Exists?:', fs.existsSync(builtInPresetsDir));
  // if (fs.existsSync(builtInPresetsDir)) {
  //   console.log('⛳️ Contents:', fs.readdirSync(builtInPresetsDir));
  // }
  // // fs.mkdirSync(builtInPresetsDir, { recursive: true });
  // fs.mkdirSync(userPresetsDir, { recursive: true });

  const baseDir = path.join(app.getPath('userData'), 'presets');
  const builtinDir = path.join(baseDir, 'built-in');
  const customDir = path.join(baseDir, 'custom');

  // only create the two folders under AppData:
  fs.mkdirSync(builtinDir, { recursive: true });
  fs.mkdirSync(customDir, { recursive: true });

  // overwrite every built-in preset on each startup:
  builtInPresets.forEach(({ name, data }) => {
    const fp = path.join(builtinDir, `${name}.json`);
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
  });

  // List all .json in both dirs
  ipcMain.handle('presets:list', async () => {
    const [builtIn, custom] = await Promise.all([
      fs.promises.readdir(builtinDir),
      fs.promises.readdir(customDir),
    ]);
    return {
      builtIn: builtIn.filter(f => f.endsWith('.json')),
      custom: custom.filter(f => f.endsWith('.json')),
    };
  });

  // Load one preset
  ipcMain.handle('presets:load', async (_evt, which, name) => {
    const dir = which === 'custom' ? customDir : builtinDir;
    const raw = await fs.promises.readFile(path.join(dir, name), 'utf-8');
    return JSON.parse(raw);
  });

  // Save user preset
  ipcMain.handle('presets:save', async (_evt, data) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save your preset',
      defaultPath: path.join(customDir, 'my-preset.json'),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || !filePath) return null;
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return path.basename(filePath);
  });

  // Optionally “Show folder”:
  ipcMain.handle('presets:openFolder', () => {
    shell.openPath(customDir);
  });

  // Replace the old pick handler
  ipcMain.handle('presets:pick', async (_evt, which) => {
    const defaultPath = which === 'custom'
      ? customDir
      : builtinDir;
    const title = which === 'custom'
      ? 'Select a User Preset'
      : 'Select a Built-In Preset';

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title,
      defaultPath,
      filters: [{ name: 'JSON Preset', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (canceled || filePaths.length === 0) return null;

    const raw = await fs.promises.readFile(filePaths[0], 'utf-8');
    return JSON.parse(raw);
  });

  ipcMain.handle('check-for-update', () => {
    return new Promise((resolve, reject) => {
      const req = net.request({
        method: 'GET',
        protocol: 'https:',
        hostname: 'api.github.com',
        path: '/repos/ItsLoganWarner/exportomation/releases/latest',
        headers: { 'User-Agent': 'exportomation' }
      });
      let body = '';
      req.on('response', res => {
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            const tag = JSON.parse(body).tag_name;  // e.g. "v1.4.2"
            resolve(tag);
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
