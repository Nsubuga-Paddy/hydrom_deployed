// ===== APP CONFIGURATION =====

const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: '/api',
        ENDPOINTS: {
            SENSOR_DATA: '/sensor_data',
            DAMS: '/dams',
            PREDICTIONS: '/predictions',
            ALARMS: '/alarms'
        },
        REFRESH_INTERVAL: 10000, // 10 seconds
        TIMEOUT: 5000
    },

    // Chart Configuration
    CHARTS: {
        COLORS: {
            PRIMARY: '#0896FC',
            SECONDARY: '#4db3ff',
            SUCCESS: '#51cf66',
            WARNING: '#ffd43b',
            DANGER: '#ff6b6b',
            INFO: '#17a2b8'
        },
        ANIMATION: {
            DURATION: 1000,
            EASING: 'easeInOutQuart'
        },
        RESPONSIVE: true,
        MAINTAIN_ASPECT_RATIO: false
    },

    // Data Configuration
    DATA: {
        HISTORY_LENGTH: 20,
        DECIMAL_PLACES: 2,
        UNITS: {
            WATER_LEVEL: 'm',  // Changed from 'mm' to 'm' for meters
            DISPATCH: 'MW',
            DISCHARGE: 'm³/s',
            TEMPERATURE: '°C',
            HUMIDITY: '%',
            PRECIPITATION: 'mm'
        }
    },

    // UI Configuration
    UI: {
        SIDEBAR_WIDTH: 280,
        HEADER_HEIGHT: 70,
        ANIMATION_DURATION: 300,
        LOADING_DELAY: 500,
        TOAST_DURATION: 3000
    },

    // Mobile Breakpoints
    BREAKPOINTS: {
        MOBILE: 767,
        TABLET: 991,
        DESKTOP: 1199,
        LARGE_DESKTOP: 1200
    },

    // Default Dam Data (for demo)
    DEMO_DAMS: [
        {
            id: 1,
            name: 'Nalubaale HPP',
            location: 'Jinja, Uganda',
            capacity: 180.0,
            active_vol: 150.0,
            latitude: 0.4471,
            longitude: 33.2022,
            status: 'active'
        },
        {
            id: 2,
            name: 'Kiira HPP',
            location: 'Jinja, Uganda',
            capacity: 200.0,
            active_vol: 160.0,
            latitude: 0.4471,
            longitude: 33.2022,
            status: 'active'
        },
        {
            id: 3,
            name: 'Bujagali HPP',
            location: 'Jinja, Uganda',
            capacity: 250.0,
            active_vol: 200.0,
            latitude: 0.4471,
            longitude: 33.2022,
            status: 'maintenance'
        },
        {
            id: 4,
            name: 'Isimba HPP',
            location: 'Kayunga, Uganda',
            capacity: 183.2,
            active_vol: 150.0,
            latitude: 0.4471,
            longitude: 33.2022,
            status: 'active'
        }
    ],

    // Demo Sensor Data Ranges (in meters now)
    SENSOR_RANGES: {
        WATER_LEVEL: { min: 38, max: 42 },  // Changed from 3800-4200mm to 38-42m
        DISPATCH: { min: 300, max: 400 },
        DISCHARGE: { min: 1000, max: 1600 },
        TEMPERATURE: { min: 15, max: 35 },
        HUMIDITY: { min: 30, max: 90 },
        PRECIPITATION: { min: 0, max: 20 }
    },

    // Alarm Configuration (in meters)
    ALARMS: {
        CRITICAL_WATER_LEVEL: 41,  // Changed from 4100mm to 41m
        WARNING_WATER_LEVEL: 40,   // Changed from 4000mm to 40m
        CRITICAL_DISPATCH: 380,
        WARNING_DISPATCH: 350
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

