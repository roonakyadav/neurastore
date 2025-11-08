"use client";
import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { motion } from "framer-motion";

export default function ChartVisualizer({ files }: { files: any[] }) {
    if (!files.length) return null;
    const grouped = files.reduce((acc: any, f: any) => {
        const t = f.type.split("/")[0];
        acc[t] = (acc[t] || 0) + 1;
        return acc;
    }, {});

    const data = Object.keys(grouped).map((key) => ({ name: key, value: grouped[key] }));
    const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF"];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center mt-10">
            <h2 className="text-xl font-semibold mb-4">File Type Distribution</h2>
            <PieChart width={350} height={300}>
                <Pie data={data} cx={180} cy={150} label outerRadius={100} dataKey="value">
                    {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </motion.div>
    );
}
