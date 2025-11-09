"use client";
import { useState } from "react";

export default function JSONVisualizer({ data, onClose }: any) {
    const [collapsed, setCollapsed] = useState(false);
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-[80%] h-[80%] overflow-auto border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">JSON Visualizer</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <pre className="text-xs bg-gray-800 p-3 rounded overflow-x-auto">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </div>
    );
}
