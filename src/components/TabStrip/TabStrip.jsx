// components/TabStrip/TabStrip.jsx
import React, { useState } from 'react';
import {
    FaGasPump,
    FaCarCrash
} from 'react-icons/fa';
import {
    PiEngineFill,
    PiSpeakerSimpleLowFill
} from "react-icons/pi";
import { BsSoundwave } from "react-icons/bs";
import { SiTurbo } from "react-icons/si";
import { 
    GiCarWheel, 
    GiCartwheel, 
    GiGearStick , 
    GiCrownedExplosion,
    GiGears 
} from "react-icons/gi";

import GeneralTab from './tabs/GeneralTab';
import AfterFireTab from './tabs/AfterFire/AfterFireTab';
import ExhaustTab from './tabs/ExhaustTab';
import ForcedInductionTab from './tabs/ForcedInduction/ForcedInductionTab';
import '../../styles/TabStrip.css';
import FuelTab from './tabs/FuelTab';
import TiresTab from './tabs/TiresTab';
import ESCTab from './tabs/ESCTab'; // Added import for ESCTab

const tabDefinitions = [
    { key: 'General', icon: <PiEngineFill /> },
    { key: 'Exhaust', icon: <PiSpeakerSimpleLowFill /> },
    { key: 'AfterFire', icon: <GiCrownedExplosion /> },
    { key: 'Forced Induction', icon: <SiTurbo /> },
    { key: 'Fuel', icon: <FaGasPump /> },
    { key: 'Front Tires', icon: <GiCartwheel /> },
    { key: 'Rear Tires', icon: <GiCarWheel /> },
    { key: 'Transmission', icon: <GiGearStick /> },
    { key: 'Differential', icon: <GiGears  /> },
    { key: 'ESC', icon: <FaCarCrash /> },
    { key: 'Sound Inject', icon: <BsSoundwave /> }
];

export default function TabStrip({
    parts,               // { engine, fueltank, wheels_front, wheels_rear, … }
    onFieldChange,       // (partKey, fieldKey, value)
    pendingChanges,      // { engine: {...}, fueltank: {...}, wheels_front: {...}, wheels_rear: {...}, … }
    active: activeProp,  // controlled active tab
    onTabChange          // controlled tab change handler
}) {
    // fallback
    const [internal, setInternal] = useState('General');
    const active = activeProp || internal;
    const setActive = onTabChange || setInternal;

    const enginePart = parts.engine || { extracted: {}, raw: '' };
    const fuelPart = parts.fueltank || { extracted: {}, raw: '' };
    const frontTirePart = parts.wheels_front || { extracted: {}, raw: '' };
    const rearTirePart = parts.wheels_rear || { extracted: {}, raw: '' };

    const renderPanel = () => {
        switch (active) {
            case 'General':
                return <GeneralTab
                    extractedData={enginePart.extracted}
                    onFieldChange={(key, val) => onFieldChange('engine', key, val)}
                    pendingChanges={pendingChanges.engine || {}}
                />;

            case 'Exhaust':
                return <ExhaustTab
                    extractedData={enginePart.extracted}
                    onFieldChange={(key, val) => onFieldChange('engine', key, val)}
                    pendingChanges={pendingChanges.engine || {}}
                    engineFilePath={enginePart.filePath}
                />;

            case 'AfterFire':
                return <AfterFireTab
                    extractedData={enginePart.extracted}
                    rawContent={enginePart.raw}
                    onFieldChange={(key, val) => onFieldChange('engine', key, val)}
                    pendingChanges={pendingChanges.engine || {}}
                />;

            case 'Forced Induction':
                return <ForcedInductionTab
                    extractedData={enginePart.extracted}
                    onFieldChange={(key, val) => onFieldChange('engine', key, val)}
                    pendingChanges={pendingChanges.engine || {}}
                />;

            case 'Fuel':
                return <FuelTab
                    extractedParts={{
                        engine: enginePart.extracted,
                        fueltank: fuelPart.extracted
                    }}
                    pendingChanges={{
                        engine: pendingChanges.engine || {},
                        fueltank: pendingChanges.fueltank || {}
                    }}
                    onFieldChange={onFieldChange}
                />;

            case 'Front Tires':
                return <TiresTab
                    extractedData={frontTirePart.extracted}
                    pendingChanges={pendingChanges.wheels_front || {}}
                    onFieldChange={(key, val) => onFieldChange('wheels_front', key, val)}
                />;

            case 'Rear Tires':
                return <TiresTab
                    extractedData={rearTirePart.extracted}
                    pendingChanges={pendingChanges.wheels_rear || {}}
                    onFieldChange={(key, val) => onFieldChange('wheels_rear', key, val)}
                />;

            case 'ESC': {
                // if there's no ESC part at all, show a simple fallback
                const escPart = parts.esc;
                if (!escPart) {
                    return (
                        <div className="card">
                            <h3>ESC / Drive Modes</h3>
                            <p><em>ESC not detected</em></p>
                        </div>
                    );
                }

                // otherwise safely render the real tab
                return (
                    <ESCTab
                        extracted={escPart.extracted}
                        raw={escPart.raw}
                        pending={pendingChanges.esc}
                        onFieldChange={onFieldChange}
                    />
                );
            }

            default:
                return <div className="card" style={{ fontWeight: 'bold' }}>{active} tab coming soon…</div>;
        }
    };

    return (
        <div className="app-container">
            <nav className="sidebar">
                {tabDefinitions.map(({ key, icon }) => (
                    <button
                        key={key}
                        className={`sidebar-tab${active === key ? ' active' : ''}`}
                        onClick={() => setActive(key)}
                    >
                        {icon}
                        <span className="sidebar-label">{key}</span>
                    </button>
                ))}
            </nav>
            <div className="content">
                {renderPanel()}
            </div>
        </div>
    );
}
