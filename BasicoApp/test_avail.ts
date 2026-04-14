import { makeAllTools } from './src/lib/ai/tools'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function test() {
    const sucursalId = '1dc56deb-f568-421b-b8d1-94fce9acf64a'
    const timezone = 'America/Hermosillo'
    const tools = makeAllTools(sucursalId, timezone)
    const availabilityTool = tools.find(t => t.name === 'DISPONIBILIDAD_HOY')

    console.log('--- TEST: DISPONIBILIDAD_HOY ---')
    console.log('Slot: 14:00 (Hoy)')
    try {
        const result = await availabilityTool.func('14:00')
        console.log('RESULT:', result)
    } catch (e) {
        console.error('CRITICAL CRASH:', e)
    }
}

test()
