// src/components/TabStrip/tabs/ExhaustTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import exhaustSchema from '../../../schemas/engine/exhaust.schema';
import "../../../styles/Tabs.css";


const ExhaustTab = ({ extractedData, onFieldChange, pendingChanges= {}, engineFilePath }) => {
  const [checked, setChecked] = useState({});
  const [values,  setValues]  = useState({});
  const [enhancedAudio, setEnhancedAudio] = useState(false);

  // 1) Re-init from extractedData & pendingChanges
  useEffect(() => {
    if (!extractedData) return;
    const initChecked = {};
    const initValues  = {};

    for (const [key, def] of Object.entries(exhaustSchema.fields)) {
      const hasChange = pendingChanges.hasOwnProperty(key);
      initChecked[key] = hasChange;
      initValues[key]  = hasChange
        ? pendingChanges[key]
        : (extractedData[key] ?? def.default);
    }

    setChecked(initChecked);
    setValues(initValues);
  }, [extractedData, pendingChanges]);

  // 2) Checkbox toggle
  const handleCheckboxChange = (key) => {
    const now = !checked[key];
    setChecked(prev => ({ ...prev, [key]: now }));

    if (now) {
      // checked → send current value
      onFieldChange(key, values[key]);
    } else {
      // unchecked → revert to original + clear
      const original = extractedData[key] ?? exhaustSchema.fields[key].default;
      setValues(prev => ({ ...prev, [key]: original }));
      onFieldChange(key, null);
    }
  };

  const handleEnhancedToggle = async () => {
    const newVal = !enhancedAudio;
    setEnhancedAudio(newVal);
    // stage pending change; actual copy happens on global Apply
    onFieldChange('__enhancedAudio', newVal);
  };

  const openHelp = () => {
    window.electron.openExternal('https://discord.com/channels/250008858062225408/1426408880904081438');
  };

  // Reintroduce auto-detect on engine change (read-only; does not stage changes)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!engineFilePath) return;
      try {
        const res = await window.electron.detectAudioState(engineFilePath);
        if (!alive) return;
        // Only initialize the toggle based on detected state.
        setEnhancedAudio(res?.state === 'enhanced');
      } catch {
        /* ignore */
      }
    })();
    return () => { alive = false; };
  }, [engineFilePath]);

  // Note: no auto-detect; user controls the toggle

  // 3) Value edits
  const handleFieldChange = (key, raw) => {
    const def = exhaustSchema.fields[key];
    let val = raw;

    if (def.type === 'number') {
      const n = parseFloat(raw);
      val = isNaN(n) ? 0 : n;
    } else if (def.type === 'boolean') {
      val = raw === 'true';
    }

    setValues(prev => ({ ...prev, [key]: val }));

    if (checked[key]) {
      onFieldChange(key, val);
    }
  };

  const enhancedKeys = useMemo(() => new Set(['hush','kPos','kNeg']), []);
  const renderRow = (key, type, tip) => {
    const isEnhancedField = enhancedKeys.has(key);
    const disabled = (!checked[key]) || (isEnhancedField && !enhancedAudio);
    return (
      <div key={key} className="field-row">
        <input
          type="checkbox"
          checked={checked[key] || false}
          onChange={() => handleCheckboxChange(key)}
          disabled={isEnhancedField && !enhancedAudio}
          style={{ marginRight: 8 }}
        />
        <label title={tip} style={{ width: 200, fontWeight: 'bold', opacity: disabled ? 0.7 : 1 }}>{key}</label>

        {type === 'number' ? (
          <input
            type="number"
            disabled={disabled}
            value={values[key]}
            onChange={e => handleFieldChange(key, e.target.value)}
            style={{ width: 100, marginLeft: 10 }}
          />
        ) : type === 'boolean' ? (
          <select
            disabled={disabled}
            value={values[key] ? 'true' : 'false'}
            onChange={e => handleFieldChange(key, e.target.value)}
            style={{ marginLeft: 10 }}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            type="text"
            disabled={disabled}
            value={values[key]}
            onChange={e => handleFieldChange(key, e.target.value)}
            style={{ width: 200, marginLeft: 10 }}
          />
        )}
        <div className="tooltip">{tip}</div>
      </div>
    );
  };

  // 4) Render (two cards side-by-side), with advisory below when enabled
  return (
    <>
      <div className="two-col">
        <div className="card">
          {Object.entries(exhaustSchema.fields)
            .filter(([key]) => !enhancedKeys.has(key))
            .map(([key, { type, tip }]) => renderRow(key, type, tip))}
        </div>

        <div className="card">
          <div className="field-row" style={{ alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={enhancedAudio}
              onChange={handleEnhancedToggle}
              style={{ marginRight: 8 }}
            />
            <label style={{ width: 220, fontWeight: 'bold' }}>Enhanced Audio Dynamics</label>
            <button className="btn" onClick={openHelp} title="Learn more / support" style={{ marginLeft: 8 }}>
              Help
            </button>
          </div>
          <hr />
          {Object.entries(exhaustSchema.fields)
            .filter(([key]) => enhancedKeys.has(key))
            .map(([key, { type, tip }]) => renderRow(key, type, tip))}
        </div>
      </div>
      {enhancedAudio && (
        <div style={{ color: '#c62828', marginTop: 12 }}>
          When using Enhanced Audio, it is recommended to set offLoadGain at high rpm to around the same perceived loudness as on Load. Values 2-4 tend to work well.
        </div>
      )}
    </>
  );
};

export default ExhaustTab;
