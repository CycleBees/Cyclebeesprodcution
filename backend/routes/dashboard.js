const express = require('express');
const { authenticateToken, requireAdmin, requireUser } = require('../middleware/auth');
const router = express.Router();

// Database connection
const supabase = require('../database/supabase-connection');

// Legacy SQLite connection (commented for rollback)
// const sqlite3 = require('sqlite3').verbose();
// const dbPath = process.env.DB_PATH || './database/cyclebees.db';
// const db = new sqlite3.Database(dbPath);

// ==================== DASHBOARD ROUTES ====================

// 1. Get dashboard overview statistics
router.get('/overview', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Get all statistics in parallel
        const [
            { count: userCount },
            { count: repairCount },
            { count: rentalCount },
            { count: pendingRepairCount },
            { count: pendingRentalCount },
            { count: todayCount }
        ] = await Promise.all([
            // Total users count
            supabase.from('users').select('*', { count: 'exact', head: true }),
            // Total repair requests count
            supabase.from('repair_requests').select('*', { count: 'exact', head: true }),
            // Total rental requests count
            supabase.from('rental_requests').select('*', { count: 'exact', head: true }),
            // Pending repair requests count
            supabase.from('repair_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            // Pending rental requests count
            supabase.from('rental_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            // Today's requests count
            (async () => {
                const today = new Date().toISOString().split('T')[0];
                const { count: repairToday } = await supabase
                    .from('repair_requests')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', `${today}T00:00:00`)
                    .lt('created_at', `${today}T23:59:59`);
                
                const { count: rentalToday } = await supabase
                    .from('rental_requests')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', `${today}T00:00:00`)
                    .lt('created_at', `${today}T23:59:59`);
                
                return { count: (repairToday || 0) + (rentalToday || 0) };
            })()
        ]);

        // Get total revenue (completed requests)
        const { data: completedRepairs } = await supabase
            .from('repair_requests')
            .select('total_amount')
            .eq('status', 'completed');

        const { data: completedRentals } = await supabase
            .from('rental_requests')
            .select('total_amount')
            .eq('status', 'completed');

        const totalRevenue = (completedRepairs || []).reduce((sum, req) => sum + (req.total_amount || 0), 0) +
                           (completedRentals || []).reduce((sum, req) => sum + (req.total_amount || 0), 0);

        res.json({
            success: true,
            data: {
                totalUsers: userCount || 0,
                totalRepairRequests: repairCount || 0,
                totalRentalRequests: rentalCount || 0,
                pendingRepairRequests: pendingRepairCount || 0,
                pendingRentalRequests: pendingRentalCount || 0,
                totalRevenue: totalRevenue,
                todayRequests: todayCount || 0
            }
        });
    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 2. Get user management data
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let query = supabase
            .from('users')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);
        
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        }
        
        const { data: users, error, count } = await query;
        
        if (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch users'
            });
        }
        
        res.json({
            success: true,
            data: {
                users: users || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    pages: Math.ceil((count || 0) / parseInt(limit))
                }
            }
        });
        
    } catch (error) {
        console.error('Error in GET /dashboard/users:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 3. Get user details with activity
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get user details
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        
        if (userError || !user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Get user's repair requests with time slots
        const { data: repairRequests, error: repairError } = await supabase
            .from('repair_requests')
            .select(`
                *,
                time_slots!repair_requests_time_slot_id_fkey (
                    start_time,
                    end_time
                )
            `)
            .eq('user_id', id)
            .order('created_at', { ascending: false });
        
        if (repairError) {
            console.error('Error fetching user repair requests:', repairError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user repair requests'
            });
        }
        
        // Get user's rental requests with bicycle details
        const { data: rentalRequests, error: rentalError } = await supabase
            .from('rental_requests')
            .select(`
                *,
                bicycles!rental_requests_bicycle_id_fkey (
                    name,
                    model
                )
            `)
            .eq('user_id', id)
            .order('created_at', { ascending: false });
        
        if (rentalError) {
            console.error('Error fetching user rental requests:', rentalError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user rental requests'
            });
        }
        
        // Calculate user statistics
        const totalRepairRequests = repairRequests?.length || 0;
        const totalRentalRequests = rentalRequests?.length || 0;
        const completedRepairRequests = repairRequests?.filter(r => r.status === 'completed').length || 0;
        const completedRentalRequests = rentalRequests?.filter(r => r.status === 'completed').length || 0;
        const totalSpent = (repairRequests?.filter(r => r.status === 'completed')
            .reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0) || 0) +
            (rentalRequests?.filter(r => r.status === 'completed')
            .reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0) || 0);
        
        res.json({
            success: true,
            data: {
                user,
                activity: {
                    repairRequests: repairRequests || [],
                    rentalRequests: rentalRequests || [],
                    statistics: {
                        totalRepairRequests,
                        totalRentalRequests,
                        completedRepairRequests,
                        completedRentalRequests,
                        totalSpent
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error in GET /dashboard/users/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 4. Get repair analytics
router.get('/analytics/repair', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));
        const startDateStr = startDate.toISOString().split('T')[0];
        
        // Get repair requests by status
        const { data: statusStats, error: statusError } = await supabase
            .from('repair_requests')
            .select('status, total_amount')
            .gte('created_at', `${startDateStr}T00:00:00`);
        
        if (statusError) {
            console.error('Error fetching repair status stats:', statusError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair statistics'
            });
        }
        
        // Process status statistics
        const statusStatsProcessed = {};
        statusStats?.forEach(req => {
            if (!statusStatsProcessed[req.status]) {
                statusStatsProcessed[req.status] = { count: 0, total_amount: 0 };
            }
            statusStatsProcessed[req.status].count++;
            statusStatsProcessed[req.status].total_amount += parseFloat(req.total_amount || 0);
        });
        
        const statusStatsArray = Object.entries(statusStatsProcessed).map(([status, stats]) => ({
            status,
            count: stats.count,
            total_amount: stats.total_amount
        }));
        
        // Get repair requests by date (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        
        const { data: dailyStats, error: dailyError } = await supabase
            .from('repair_requests')
            .select('created_at, total_amount')
            .gte('created_at', `${sevenDaysAgoStr}T00:00:00`);
        
        if (dailyError) {
            console.error('Error fetching repair daily stats:', dailyError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair daily statistics'
            });
        }
        
        // Process daily statistics
        const dailyStatsProcessed = {};
        dailyStats?.forEach(req => {
            const date = req.created_at.split('T')[0];
            if (!dailyStatsProcessed[date]) {
                dailyStatsProcessed[date] = { count: 0, total_amount: 0 };
            }
            dailyStatsProcessed[date].count++;
            dailyStatsProcessed[date].total_amount += parseFloat(req.total_amount || 0);
        });
        
        const dailyStatsArray = Object.entries(dailyStatsProcessed)
            .map(([date, stats]) => ({
                date,
                count: stats.count,
                total_amount: stats.total_amount
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
        
        // Get top repair services
        const { data: topServices, error: topServicesError } = await supabase
            .from('repair_request_services')
            .select(`
                price,
                repair_services!repair_request_services_repair_service_id_fkey (
                    name
                ),
                repair_requests!repair_request_services_repair_request_id_fkey (
                    created_at
                )
            `)
            .gte('repair_requests.created_at', `${startDateStr}T00:00:00`);
        
        if (topServicesError) {
            console.error('Error fetching top repair services:', topServicesError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch top repair services'
            });
        }
        
        // Process top services
        const serviceStats = {};
        topServices?.forEach(service => {
            const serviceName = service.repair_services?.name;
            if (serviceName) {
                if (!serviceStats[serviceName]) {
                    serviceStats[serviceName] = { count: 0, total_revenue: 0 };
                }
                serviceStats[serviceName].count++;
                serviceStats[serviceName].total_revenue += parseFloat(service.price || 0);
            }
        });
        
        const topServicesArray = Object.entries(serviceStats)
            .map(([name, stats]) => ({
                name,
                count: stats.count,
                total_revenue: stats.total_revenue
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        res.json({
            success: true,
            data: {
                period: parseInt(period),
                statusStats: statusStatsArray,
                dailyStats: dailyStatsArray,
                topServices: topServicesArray
            }
        });
        
    } catch (error) {
        console.error('Error in GET /dashboard/analytics/repair:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 5. Get rental analytics
router.get('/analytics/rental', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));
        const startDateStr = startDate.toISOString().split('T')[0];
        
        // Get rental requests by status
        const { data: statusStats, error: statusError } = await supabase
            .from('rental_requests')
            .select('status, total_amount')
            .gte('created_at', `${startDateStr}T00:00:00`);
        
        if (statusError) {
            console.error('Error fetching rental status stats:', statusError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch rental statistics'
            });
        }
        
        // Process status statistics
        const statusStatsProcessed = {};
        statusStats?.forEach(req => {
            if (!statusStatsProcessed[req.status]) {
                statusStatsProcessed[req.status] = { count: 0, total_amount: 0 };
            }
            statusStatsProcessed[req.status].count++;
            statusStatsProcessed[req.status].total_amount += parseFloat(req.total_amount || 0);
        });
        
        const statusStatsArray = Object.entries(statusStatsProcessed).map(([status, stats]) => ({
            status,
            count: stats.count,
            total_amount: stats.total_amount
        }));
        
        // Get rental requests by date (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        
        const { data: dailyStats, error: dailyError } = await supabase
            .from('rental_requests')
            .select('created_at, total_amount')
            .gte('created_at', `${sevenDaysAgoStr}T00:00:00`);
        
        if (dailyError) {
            console.error('Error fetching rental daily stats:', dailyError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch rental daily statistics'
            });
        }
        
        // Process daily statistics
        const dailyStatsProcessed = {};
        dailyStats?.forEach(req => {
            const date = req.created_at.split('T')[0];
            if (!dailyStatsProcessed[date]) {
                dailyStatsProcessed[date] = { count: 0, total_amount: 0 };
            }
            dailyStatsProcessed[date].count++;
            dailyStatsProcessed[date].total_amount += parseFloat(req.total_amount || 0);
        });
        
        const dailyStatsArray = Object.entries(dailyStatsProcessed)
            .map(([date, stats]) => ({
                date,
                count: stats.count,
                total_amount: stats.total_amount
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
        
        // Get top rented bicycles
        const { data: topBicycles, error: topBicyclesError } = await supabase
            .from('rental_requests')
            .select(`
                total_amount,
                bicycles!rental_requests_bicycle_id_fkey (
                    name,
                    model
                )
            `)
            .gte('created_at', `${startDateStr}T00:00:00`);
        
        if (topBicyclesError) {
            console.error('Error fetching top rented bicycles:', topBicyclesError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch top rented bicycles'
            });
        }
        
        // Process top bicycles
        const bicycleStats = {};
        topBicycles?.forEach(rental => {
            const bicycleName = rental.bicycles?.name;
            const bicycleModel = rental.bicycles?.model;
            const key = `${bicycleName} - ${bicycleModel}`;
            
            if (bicycleName) {
                if (!bicycleStats[key]) {
                    bicycleStats[key] = { 
                        name: bicycleName,
                        model: bicycleModel,
                        count: 0, 
                        total_revenue: 0 
                    };
                }
                bicycleStats[key].count++;
                bicycleStats[key].total_revenue += parseFloat(rental.total_amount || 0);
            }
        });
        
        const topBicyclesArray = Object.values(bicycleStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        res.json({
            success: true,
            data: {
                period: parseInt(period),
                statusStats: statusStatsArray,
                dailyStats: dailyStatsArray,
                topBicycles: topBicyclesArray
            }
        });
        
    } catch (error) {
        console.error('Error in GET /dashboard/analytics/rental:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 6. Get recent activity
router.get('/recent-activity', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const limitNum = parseInt(limit);
        
        // Get recent repair requests
        const { data: repairActivity, error: repairError } = await supabase
            .from('repair_requests')
            .select(`
                id,
                status,
                total_amount,
                created_at,
                users!repair_requests_user_id_fkey (
                    full_name,
                    phone
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limitNum);
        
        if (repairError) {
            console.error('Error fetching recent repair activity:', repairError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch recent activity'
            });
        }
        
        // Get recent rental requests
        const { data: rentalActivity, error: rentalError } = await supabase
            .from('rental_requests')
            .select(`
                id,
                status,
                total_amount,
                created_at,
                users!rental_requests_user_id_fkey (
                    full_name,
                    phone
                ),
                bicycles!rental_requests_bicycle_id_fkey (
                    name
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limitNum);
        
        if (rentalError) {
            console.error('Error fetching recent rental activity:', rentalError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch recent activity'
            });
        }
        
        // Transform repair activity
        const repairActivityTransformed = repairActivity?.map(activity => ({
            type: 'repair',
            id: activity.id,
            status: activity.status,
            total_amount: activity.total_amount,
            created_at: activity.created_at,
            user_name: activity.users?.full_name,
            user_phone: activity.users?.phone
        })) || [];
        
        // Transform rental activity
        const rentalActivityTransformed = rentalActivity?.map(activity => ({
            type: 'rental',
            id: activity.id,
            status: activity.status,
            total_amount: activity.total_amount,
            created_at: activity.created_at,
            user_name: activity.users?.full_name,
            user_phone: activity.users?.phone,
            bicycle_name: activity.bicycles?.name
        })) || [];
        
        // Combine and sort by date
        const allActivity = [...repairActivityTransformed, ...rentalActivityTransformed]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limitNum);
        
        res.json({
            success: true,
            data: allActivity
        });
        
    } catch (error) {
        console.error('Error in GET /dashboard/recent-activity:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 7. Batch API endpoint for mobile app (reduces multiple API calls)
router.get('/batch', authenticateToken, requireUser, async (req, res) => {
    try {
        const { include } = req.query;
        const includes = include ? include.split(',') : [];
        
        const batchData = {};

        if (includes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please specify what data to include (e.g., ?include=services,timeSlots,promotional)'
            });
        }

        // Get repair services
        if (includes.includes('services')) {
            const { data: services, error: servicesError } = await supabase
                .from('repair_services')
                .select('*')
                .eq('is_active', true)
                .order('name');
            
            if (!servicesError) {
                batchData.services = services || [];
            }
        }

        // Get time slots
        if (includes.includes('timeSlots')) {
            const { data: slots, error: slotsError } = await supabase
                .from('time_slots')
                .select('*')
                .eq('is_active', true)
                .order('start_time');
            
            if (!slotsError) {
                batchData.timeSlots = slots || [];
            }
        }

        // Get mechanic charge
        if (includes.includes('mechanicCharge')) {
            const { data: charge, error: chargeError } = await supabase
                .from('service_mechanic_charge')
                .select('*')
                .eq('is_active', true)
                .order('id', { ascending: false })
                .limit(1)
                .single();
            
            if (!chargeError) {
                batchData.mechanicCharge = charge;
            }
        }

        // Get promotional cards
        if (includes.includes('promotional')) {
            const { data: cards, error: cardsError } = await supabase
                .from('promotional_cards')
                .select('*')
                .eq('is_active', true)
                .order('display_order');
            
            if (!cardsError) {
                batchData.promotional = cards || [];
            }
        }

        // Get user's recent requests
        if (includes.includes('recentRequests')) {
            const { data: requests, error: requestsError } = await supabase
                .from('repair_requests')
                .select(`
                    *,
                    time_slots!repair_requests_time_slot_id_fkey (
                        start_time,
                        end_time
                    )
                `)
                .eq('user_id', req.user.userId)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (!requestsError) {
                batchData.recentRequests = requests || [];
            }
        }

        // Get available bicycles
        if (includes.includes('bicycles')) {
            const { data: bicycles, error: bicyclesError } = await supabase
                .from('bicycles')
                .select('*')
                .eq('is_available', true)
                .order('name');
            
            if (!bicyclesError) {
                batchData.bicycles = bicycles || [];
            }
        }

        res.json({
            success: true,
            data: batchData
        });

    } catch (error) {
        console.error('Batch API error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router; 