// forge.config.js
const path = require('path');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    // point at your icon _without_ extension; electron-packager will pick .ico/.icns
    icon: path.resolve(__dirname, 'assets', 'icons', 'app-icon'),
    // bundle enhanced audio lua into resources/enhancedAudio/
    extraResource: [
      path.resolve(__dirname, 'assets', 'enhancedAudio'),
      path.resolve(__dirname, 'assets', 'stockAudio')
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'exportomation',
        setupExe: 'Exportomation-${version}-Setup.exe',
        setupIcon: path.resolve(__dirname, 'assets', 'icons', 'app-icon.ico'),
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: {
        artifactName: '${productName}-${version}.zip'
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        artifactName: '${productName}-${version}.deb',
      }
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        artifactName: '${productName}-${version}.rpm',
      }
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.jsx',
              name: 'main_window',
              preload: {
                js: './src/preload.js',
              },
            },
          ],
        },
      },
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
