require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
    try {
        console.log('🚀 Starting Supabase database setup...');
        
        // Insert sample data
        await insertSampleData();
        
        console.log('🎉 Database setup completed successfully!');
        console.log('📋 Note: Tables should be created manually in Supabase dashboard using the schema from supabase-schema.sql');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
    }
}

async function insertSampleData() {
    try {
        console.log('📝 Inserting sample data...');
        
        // Insert admin user
        const bcrypt = require('bcryptjs');
        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        
        const { error: adminError } = await supabase
            .from('admin')
            .insert([
                {
                    username: 'admin',
                    password_hash: adminPasswordHash
                }
            ]);
        
        if (adminError && adminError.message && !adminError.message.includes('duplicate')) {
            console.error('❌ Admin insertion failed:', adminError);
        } else {
            console.log('✅ Admin user created');
        }
        
        // Insert sample repair services
        const { error: servicesError } = await supabase
            .from('repair_services')
            .insert([
                {
                    name: 'Tire Puncture Repair',
                    description: 'Fix punctured tires and replace tubes if needed',
                    special_instructions: 'Please specify tire size if known',
                    price: 150.00
                },
                {
                    name: 'Brake Adjustment',
                    description: 'Adjust and align brake pads for optimal performance',
                    special_instructions: 'Check brake cable tension',
                    price: 200.00
                },
                {
                    name: 'Chain Lubrication',
                    description: 'Clean and lubricate bicycle chain',
                    special_instructions: 'Use appropriate chain lubricant',
                    price: 100.00
                },
                {
                    name: 'Gear Adjustment',
                    description: 'Adjust derailleur and gear shifting',
                    special_instructions: 'Test all gear combinations',
                    price: 250.00
                }
            ]);
        
        if (servicesError && servicesError.message && !servicesError.message.includes('duplicate')) {
            console.error('❌ Services insertion failed:', servicesError);
        } else {
            console.log('✅ Sample repair services created');
        }
        
        // Insert mechanic charge
        const { error: mechanicError } = await supabase
            .from('service_mechanic_charge')
            .insert([
                {
                    amount: 200.00
                }
            ]);
        
        if (mechanicError && mechanicError.message && !mechanicError.message.includes('duplicate')) {
            console.error('❌ Mechanic charge insertion failed:', mechanicError);
        } else {
            console.log('✅ Mechanic charge set');
        }
        
        // Insert time slots
        const timeSlots = [
            { start_time: '06:00', end_time: '08:00' },
            { start_time: '08:00', end_time: '10:00' },
            { start_time: '10:00', end_time: '12:00' },
            { start_time: '12:00', end_time: '14:00' },
            { start_time: '14:00', end_time: '16:00' },
            { start_time: '16:00', end_time: '18:00' },
            { start_time: '18:00', end_time: '20:00' },
            { start_time: '20:00', end_time: '22:00' }
        ];
        
        const { error: timeSlotsError } = await supabase
            .from('time_slots')
            .insert(timeSlots);
        
        if (timeSlotsError && timeSlotsError.message && !timeSlotsError.message.includes('duplicate')) {
            console.error('❌ Time slots insertion failed:', timeSlotsError);
        } else {
            console.log('✅ Time slots created');
        }
        
        // Insert sample bicycles
        const { error: bicyclesError } = await supabase
            .from('bicycles')
            .insert([
                {
                    name: 'Mountain Bike Pro',
                    model: 'MTB-2024',
                    description: 'Professional mountain bike for off-road adventures',
                    daily_rate: 300.00,
                    weekly_rate: 1500.00,
                    delivery_charge: 100.00,
                    specifications: JSON.stringify({
                        frame: 'Aluminum',
                        wheels: '26 inch',
                        gears: '21-speed'
                    })
                },
                {
                    name: 'City Cruiser',
                    model: 'CC-2024',
                    description: 'Comfortable city bike for daily commuting',
                    daily_rate: 200.00,
                    weekly_rate: 1000.00,
                    delivery_charge: 80.00,
                    specifications: JSON.stringify({
                        frame: 'Steel',
                        wheels: '28 inch',
                        gears: '7-speed'
                    })
                }
            ]);
        
        if (bicyclesError && bicyclesError.message && !bicyclesError.message.includes('duplicate')) {
            console.error('❌ Bicycles insertion failed:', bicyclesError);
        } else {
            console.log('✅ Sample bicycles created');
        }
        
        // Insert sample coupons
        const { error: couponsError } = await supabase
            .from('coupons')
            .insert([
                {
                    code: 'WELCOME10',
                    description: 'Welcome discount for new users',
                    discount_type: 'percentage',
                    discount_value: 10.00,
                    min_amount: 500.00,
                    max_discount: 200.00,
                    applicable_items: JSON.stringify(['repair_services', 'rental_services']),
                    usage_limit: 1
                },
                {
                    code: 'FIRST50',
                    description: 'First rental discount',
                    discount_type: 'fixed',
                    discount_value: 50.00,
                    min_amount: 200.00,
                    applicable_items: JSON.stringify(['rental_services']),
                    usage_limit: 1
                }
            ]);
        
        if (couponsError && couponsError.message && !couponsError.message.includes('duplicate')) {
            console.error('❌ Coupons insertion failed:', couponsError);
        } else {
            console.log('✅ Sample coupons created');
        }
        
        // Insert contact settings
        const { error: contactError } = await supabase
            .from('contact_settings')
            .insert([
                {
                    type: 'phone',
                    value: '+91 98765 43210'
                },
                {
                    type: 'email',
                    value: 'support@cyclebees.com'
                },
                {
                    type: 'link',
                    value: 'https://cyclebees.com'
                }
            ]);
        
        if (contactError && contactError.message && !contactError.message.includes('duplicate')) {
            console.error('❌ Contact settings insertion failed:', contactError);
        } else {
            console.log('✅ Contact settings created');
        }
        
        console.log('✅ Sample data inserted successfully!');
        
    } catch (error) {
        console.error('❌ Sample data insertion failed:', error);
    }
}

// Run the setup
setupDatabase(); 