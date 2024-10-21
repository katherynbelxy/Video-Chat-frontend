const path = require('path');

module.exports = {
    // Otras configuraciones...
    devServer: {
        port: 3000,
        hot: true,
        https: true, // Asegúrate de que esto esté habilitado si usas HTTPS
        allowedHosts: 'all', // Permitir todos los hosts
        historyApiFallback: true,
    },
};
