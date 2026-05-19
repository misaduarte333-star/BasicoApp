require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function updateDb() {
    try {
        console.log('1. Fetching users...')
        const { data: users, error: e1 } = await supabase.from('usuarios_admin').select('*, sucursales(*)')
        if (e1) throw e1
        console.log('Current users:', users.map(u => ({ email: u.email, plan: u.sucursales?.plan })))

        console.log('2. Deleting Alpha and Beta users...')
        await supabase.from('usuarios_admin').delete().in('email', ['admin@alphav2.com', 'admin@betav2.com'])
        console.log('Deleted old test admin users.')

        // We can also let the sucursales/negocios remain or delete them. We will just leave them for now or delete them if we find them.

        console.log('3. Updating plans...')
        // Find admin@barbercloud.com
        const basicoUser = users.find(u => u.email === 'admin@barbercloud.com')
        if (basicoUser && basicoUser.sucursales) {
            await supabase.from('sucursales').update({ plan: 'basico' }).eq('id', basicoUser.sucursal_id)
            console.log('Updated admin@barbercloud.com to basico')
        }

        // Find Nails_Art@gmail.com
        const premiumUser = users.find(u => u.email === 'Nails_Art@gmail.com')
        if (premiumUser && premiumUser.sucursales) {
            await supabase.from('sucursales').update({ plan: 'premium' }).eq('id', premiumUser.sucursal_id)
            console.log('Updated Nails_Art@gmail.com to premium')
        }

        console.log('Done.')
    } catch (e) {
        console.error('Error:', e)
    }
}

updateDb()
