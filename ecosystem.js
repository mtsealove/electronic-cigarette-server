module.exports = {
    apps: [{
        name: "server",
        script: "./src/index.js",
        env_production: {
            NODE_ENV: "production",
            NAVER_ACCESS_KEY: "FZhq1LlN4H6OfD4oeVAx",
            NAVER_URL:"ncp:sms:kr:279701661657:vape",
            NAVER_API_KEY: "FZhq1LlN4H6OfD4oeVAx",
            NAVER_SECRET_KEY: "KXEYsY24mr1NtcC8o01dUntathhB70EdDnnOWYGe",
            DB_HOST: "3.34.83.95",
            DB_PW: "Locker0916*",
            DB_SECRET: "realbuyrealbuy12",
            DB_USER:"vape_manager",
            DB:"kvape",
        },
        env_development: {
            NODE_ENV: "development"
        }
    }]
}