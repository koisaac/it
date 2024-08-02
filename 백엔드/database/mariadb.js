const maria = require("mysql");

const conn = maria.createConnection({
    host: "jshs-project.duckdns.org",
    port: 3306,
    user: "user1",
    password: "($sil$an$wi$)",
    database: "it",
});
module.exports = conn;
