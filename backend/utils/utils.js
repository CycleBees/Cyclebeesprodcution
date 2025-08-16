
// Database connection
const supabase = require('../database/supabase-connection');


// craft OTP message 
const craftOTP = (otp) => {
    return `Use this OTP to Login: ${otp}`
}

// Supabase run function (replaces SQLite runAsync)
const runAsync = async (table, operation, data = {}) => {
    try {
        let result;
        switch (operation) {
            case 'insert':
                result = await supabase.from(table).insert(data);
                break;
            case 'update':
                result = await supabase.from(table).update(data.update).eq(data.where, data.value);
                break;
            case 'delete':
                result = await supabase.from(table).delete().eq(data.where, data.value);
                break;
            case 'select':
                result = await supabase.from(table).select(data.select || '*').eq(data.where, data.value);
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
        return result;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    craftOTP,
    runAsync
}