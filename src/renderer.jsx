/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

// src/renderer.jsx
// import React from 'react';
// import ReactDOM from 'react-dom';
// import FileBrowser from './FileBrowser';


// const App = () => {
//   return (
//     <div>
//       <h1>Temp UI for Mod Tool</h1>
//       <FileBrowser />
//     </div>
//   );
// };

// ReactDOM.render(<App />, document.getElementById('app'));
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';           // your existing base styles
import './styles/presets.css';

import App from './App';

ReactDOM.render(<App />, document.getElementById('app'));
