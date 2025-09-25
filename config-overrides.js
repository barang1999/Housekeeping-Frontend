module.exports = function override(config) {
    config.resolve.alias = {
        ...config.resolve.alias,
        'process': 'process/browser'
    };
    return config;
}