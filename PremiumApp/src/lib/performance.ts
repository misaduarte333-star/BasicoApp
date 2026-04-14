/**
 * Utility to detect low-end hardware (RAM/CPU)
 * Used to automatically enable "Efficiency Mode" without compromising
 * the experience on high-end devices.
 */
export function isLowEndDevice(): boolean {
    if (typeof window === 'undefined') return false;

    // 1. Check RAM (navigator.deviceMemory is in GB)
    // Most entry-level tablets (2GB RAM) will report 2 or less.
    const ram = (navigator as any).deviceMemory;
    if (ram !== undefined && ram <= 2) return true;

    // 2. Check CPU Cores (MediaTek A22 has 4 cores)
    // Modern high-end phones/PCs have 8-16+.
    const cores = navigator.hardwareConcurrency;
    if (cores !== undefined && cores <= 4) return true;

    // 3. User Agent Check (Optional but helpful for older Android Tablets)
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    
    // If it's a mobile device with very few cores, it's likely low-end
    if (isMobile && cores !== undefined && cores <= 4) return true;

    return false;
}
