// src/App.jsx
import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import TabStrip from './components/TabStrip/TabStrip';
import MetaTab from './components/MetaTab';
import Footer from './components/Footer/Footer';
import SettingsTab from './components/SettingsTab';

export default function App() {
    const [defaultExportLocation, setDefaultExportLocation] = useState('');
    const [darkMode, setDarkMode] = useState(false);
    const [vehicleData, setVehicleData] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [pendingChanges, setPendingChanges] = useState({});
    const [isApplied, setIsApplied] = useState(false);
    const [activeView, setActiveView] = useState('General');
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    // load settings.json on startup
    useEffect(() => {
        window.settings.get()
            .then(s => {
                if (s.exportPath) setDefaultExportLocation(s.exportPath);
                if (s.darkMode != null) setDarkMode(s.darkMode);
            })
            .finally(() => {
                // now that we've loaded from disk, allow saves
                setSettingsLoaded(true);
            });
    }, []);

    // save settings.json whenever either piece changes
    useEffect(() => {
        // skip initial default-write before load
        if (!settingsLoaded) return;

        window.settings.set({
            exportPath: defaultExportLocation,
            darkMode: darkMode,
        });
    }, [settingsLoaded, defaultExportLocation, darkMode]);

    const handleOpenSettings = () => setActiveView('Settings');

    useEffect(() => {
        document.body.classList.toggle('dark-mode', darkMode);
    }, [darkMode]);

    // If Apply completed, and enhanced audio is staged, install the Lua
    useEffect(() => {
        (async () => {
            if (!isApplied) return;
            try {
                const enginePath = vehicleData?.parts?.engine?.filePath;
                const flag = pendingChanges.engine?.__enhancedAudio;
                if (enginePath && flag === true) {
                    await window.electron.applyEnhancedAudio(enginePath);
                } else if (enginePath && flag === false) {
                    await window.electron.applyStockAudio(enginePath);
                }
            } catch (e) {
                console.error('Enhanced Audio install failed:', e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isApplied]);

    // 1) Field edits (remove key if null/undefined)
    const handleFieldChange = (partKey, key, value) => {
        setPendingChanges(prev => {
            const part = { ...(prev[partKey] || {}) };
            if (value == null) delete part[key];
            else part[key] = value;
            return { ...prev, [partKey]: part };
        });
    };

    // 2) Write to disk
    const handleApplyChanges = async () => {
        console.log('Pending changes:', pendingChanges);
        for (const [part, changes] of Object.entries(pendingChanges)) {
            if (!Object.keys(changes).length) continue;
            const path = vehicleData.parts[part].filePath;
            const res = await window.electron.applyChanges(path, part, changes);
            if (!res.success) {
                return alert(`Failed on ${part}: ${res.message}`);
            }
        }
        // Handle Enhanced Audio Lua copy based on staged toggle
        try {
            const enginePath = vehicleData?.parts?.engine?.filePath;
            const flag = pendingChanges.engine?.__enhancedAudio;
            if (enginePath && flag === true) {
                const r = await window.electron.applyEnhancedAudio(enginePath);
                if (!r?.success) console.error('Enhanced Audio apply failed:', r?.message);
            } else if (enginePath && flag === false) {
                const r = await window.electron.applyStockAudio(enginePath);
                if (!r?.success) console.error('Stock Audio apply failed:', r?.message);
            }
        } catch (e) {
            console.error('Enhanced/Stock Audio apply error:', e);
        }
        alert('All changes applied!');
        setIsApplied(true);
    };

    // 3) When you pick a new car export
    const handleNewVehicle = (data) => {
        setVehicleData(data);
        setPendingChanges({});
        setIsApplied(false);
        setActiveView('General');
        setIsReady(true);
    };

    // 4a) Load (replace) a built-in preset
    const handleLoadBuiltIn = async () => {
        const preset = await window.presets.pick('builtIn');
        if (preset) setPendingChanges(preset);
    };

    // 4b) Append (merge) a built-in preset
    const handleAppendBuiltIn = async () => {
        const preset = await window.presets.pick('builtIn');
        if (preset) setPendingChanges(prev => ({ ...prev, ...preset }));
    };

    // 5a) Load (replace) a user preset
    const handleLoadUser = async () => {
        const preset = await window.presets.pick('custom');
        if (preset) setPendingChanges(preset);
    };

    // 5b) Append (merge) a user preset
    const handleAppendUser = async () => {
        const preset = await window.presets.pick('custom');
        if (preset) setPendingChanges(prev => ({ ...prev, ...preset }));
    };

    // 6) Save the current pendingChanges as a custom preset
    const handleSavePreset = async () => {
        console.log('Pending changes:', pendingChanges);
        const toSave = { ...pendingChanges };
        const fuelTab = document.querySelector('textarea[name="burnEfficiency"]');
        if (toSave.engine?.burnEfficiency && fuelTab) {
            toSave.engine.burnEfficiency = fuelTab.value
                .split('\n')
                .map(line => line.trim().replace(/,$/, ''));
        }

        const fileName = await window.presets.save(toSave);
        if (fileName) alert(`Ã¢Å“â€œ Saved as ${fileName}`);
    };

    // 7) Reveal the user-preset folder in Explorer/Finder
    const handleOpenPresetFolder = () => {
        window.presets.openFolder();
    };

    // Revert changes by writing original raw text back to files
    const handleRevert = async () => {
        for (const [partKey, part] of Object.entries(vehicleData.parts)) {
            const original = part.raw || part.parsed.raw;
            const { success, message } = await window.electron.writeFile(part.filePath, original);
            if (!success) {
                return alert(`Failed to revert ${partKey}: ${message}`);
            }
        }
        // Also restore stock camsoEngine.lua
        try {
            if (vehicleData?.parts?.engine?.filePath) {
                await window.electron.applyStockAudio(vehicleData.parts.engine.filePath);
            }
        } catch (e) {
            console.error('Restore stock audio failed:', e);
        }
        setPendingChanges({});
        setIsApplied(false);
    };

    return (
        <div className="app-root">
            <Header
                isReady={isReady}
                setIsReady={setIsReady}
                setVehicleData={data => {
                    setVehicleData(data);
                    setPendingChanges({});
                    setActiveView('General');
                }}
                vehicleData={vehicleData}
                pendingChanges={pendingChanges}
                onLoadBuiltIn={handleLoadBuiltIn}
                onAppendBuiltIn={handleAppendBuiltIn}
                onLoadUser={handleLoadUser}
                onAppendUser={handleAppendUser}
                onEditMetadata={() => setActiveView('Meta')}
                onOpenSettings={handleOpenSettings}
                defaultExportLocation={defaultExportLocation}
            />

            {activeView === 'Settings' ? (
                <SettingsTab
                    exportPath={defaultExportLocation}
                    onExportPathChange={setDefaultExportLocation}
                    darkMode={darkMode}
                    onDarkModeChange={setDarkMode}
                    onExit={() => setActiveView('General')}
                />
            ) : (
                isReady && vehicleData && (
                    <>
                        {activeView === 'Meta' ? (
                            <MetaTab
                                modelExtracted={vehicleData.parts.infoModel.extracted}
                                modelPending={pendingChanges.infoModel || {}}
                                trimExtracted={vehicleData.parts.infoTrim.extracted}
                                trimPending={pendingChanges.infoTrim || {}}
                                onFieldChange={handleFieldChange}
                                onExit={() => setActiveView('General')} // Ã¢â€ Â back to tabs
                            />
                        ) : (
                            <TabStrip
                                parts={vehicleData.parts}
                                onFieldChange={handleFieldChange}
                                pendingChanges={pendingChanges}
                                active={activeView} // Ã¢â€ Â controlled
                                onTabChange={setActiveView} // Ã¢â€ Â controlled
                            />
                        )}
                        <Footer
                            onApply={handleApplyChanges}
                            onRevert={handleRevert}
                            onSavePreset={handleSavePreset}
                            onOpenPresetFolder={handleOpenPresetFolder}
                            isApplied={isApplied}
                        />
                    </>
                )
            )}
        </div>
    );
}
