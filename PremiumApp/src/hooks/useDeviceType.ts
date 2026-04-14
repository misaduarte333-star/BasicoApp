'use client'

import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export function useDeviceType() {
    const [deviceType, setDeviceType] = useState<DeviceType>('desktop')

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth
            if (width < 768) {
                setDeviceType('mobile')
            } else if (width < 1024) {
                setDeviceType('tablet')
            } else {
                setDeviceType('desktop')
            }
        }

        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return deviceType
}
