'use client'

import { File, Image, Video, Music } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'

interface FileCardProps {
    name: string
    size: number
    type: string
    url?: string
}

export default function FileCard({ name, size, type, url }: FileCardProps) {
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getIcon = () => {
        if (type.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />
        if (type.startsWith('video/')) return <Video className="w-8 h-8 text-red-500" />
        if (type.startsWith('audio/')) return <Music className="w-8 h-8 text-green-500" />
        return <File className="w-8 h-8 text-gray-500" />
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                            {url && (type.startsWith('image/') || type.startsWith('video/')) ? (
                                type.startsWith('image/') ? (
                                    <img src={url} alt={name} className="w-full h-full object-cover rounded" />
                                ) : (
                                    <video src={url} className="w-full h-full object-cover rounded" />
                                )
                            ) : (
                                getIcon()
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm truncate">{name}</h4>
                            <p className="text-xs text-gray-500">{type} • {formatSize(size)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
