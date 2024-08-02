const express = require("express");
const app = express();
const http = require("http");
const port = 3003;
const cors = require("cors");
const crypto = require("crypto");

const conn = require("./database/mariadb");

var session = require("express-session");
var MySQLStore = require("express-mysql-session")(session);

var options = {
    host: "jshs-project.duckdns.org",
    port: 3306,
    user: "user1",
    password: "($sil$an$wi$)",
    database: "it",
};
var sessionStore = new MySQLStore(options);

app.use(
    session({
        key: "session_cookie_name",
        secret: "session_cookie_secret",
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "Lax",
        },
    })
);

conn.connect();
const server = http.createServer(app);
app.use(
    cors({
        origin: true,
        credentials: true,
    })
);
app.use("/public", express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true })); //x-www-form-urlencoded 방식, 그래서 객체 형태로 결과나옴
app.use(express.json()); //json방식

app.get("/", (req, res) => {
    return res.send("a");
});
app.get("/a", (req, res) => {
    return res.json({ test: 10 });
});
app.post("/test", (req, res) => {
    console.log(req.body);
    return res.json(req.body.data);
});

app.get("/getInfo", (req, res) => {
    console.log("get_login");
    console.log(req.session.username);
    if (req.session.username) {
        console.log("true");
        console.log("get_login_end");
        const sql = "select * from user  where user_name = ?";
        const param = [req.session.username];
        conn.query(sql, param, (err, rows, fail) => {
            if (err) {
                console.log("getInfo, err");
                console.log(err);
                return res.json({ login: false });
            }
            if (rows.length > 0) {
                console.log("a");
                var sql_2 =
                    "SELECT id, explanation ,YEAR(date) as year,MONTH(date) as month,DAY(date) as day,HOUR(date) as hour,MINUTE(date) as minute,SECOND(date) as second from TodoList where user_name = ? ORDER BY date ASC  ";
                var param_2 = [req.session.username];
                conn.query(sql_2, param_2, (err, rows, fail) => {
                    if (err) {
                        console.log(err);
                        return { login: true, TodoList: null };
                    }
                    return res.json({ login: true, TodoList: rows });
                });
            } else {
                return res.json({ login: false });
            }
        });
    } else {
        console.log("false");
        console.log("get_login_end");
        return res.json({ login: false });
    }
});

app.get("/login", (req, res) => {
    console.log(req.session.username);
    if (req.session.username) {
        const sql = "select * from user  where user_name = ?";
        const param = [req.session.username];
        conn.query(sql, param, (err, rows, fail) => {
            if (err) {
                console.log("login, err");
                console.log(err);
                return res.json({ login: false });
            }
            if (rows.length > 0) {
                return res.json({ login: true });
            } else {
                return res.json({ login: false });
            }
        });
    } else {
        return res.json({ login: false });
    }
});

app.post("/login", (req, res) => {
    console.log("post_login");
    console.log(req.body.data);
    console.log(req.session.username);
    if (req.session.username) {
        return res.json({ login: true });
    } else {
        const sql = "select * from user where user_name = ? and pasward = ?";

        const param = [
            req.body.data.user_name,
            crypto
                .createHash("sha512")
                .update(req.body.data.pasward)
                .digest("base64"),
        ];
        conn.query(sql, param, (err, rows, fields) => {
            if (err) {
                console.log("login, err");
                return res.json(err);
            }
            if (rows.length > 0) {
                req.session.username = rows[0].user_name;
                req.session.save(() => {
                    console.log("a");
                    return res.json({ login: true });
                });
            } else {
                return res.json({ login: false });
            }
        });
    }
});
app.post("/join", (req, res) => {
    console.log(req.body.data);
    console.log(req.session.userid);
    if (req.session.username) {
        return res.json({ join: false, error: "이미 로그인 되어 있습니다." });
    } else {
        const sql = "select * from user where user_name = ?";
        const param = [req.body.data.user_name];
        conn.query(sql, param, (err, rows, fields) => {
            if (err) {
                return res.json({ join: false, error: err });
            }
            if (rows.length > 0) {
                return res.json({
                    join: false,
                    error: "이미 있는 user_name 입니다",
                });
            } else if (rows.length == 0) {
                const sql_2 =
                    "insert into user (user_name,pasward) values(?,?)";
                const param_2 = [
                    req.body.data.user_name,
                    crypto
                        .createHash("sha512")
                        .update(req.body.data.pasward)
                        .digest("base64"),
                ];
                conn.query(sql_2, param_2, (err, rows, fields) => {
                    if (err) {
                        return res.json({ join: false, error: err });
                    }
                    req.session.username = req.body.data.user_name;
                    req.session.save(() => {
                        return res.json({
                            join: true,
                        });
                    });
                });
            }
        });
    }
});

app.post("/addTodoList", (req, res) => {
    console.log(req.body.postData);
    var is_data_correct = true;
    var ListOfIncorrectData = [];
    if (req.session.username) {
        if (!req.body.postData.date) {
            is_data_correct = false;
            ListOfIncorrectData.push("date");
        }
        if (!req.body.postData.explanation) {
            is_data_correct = false;
            ListOfIncorrectData.push("explanation");
        }
        if (!is_data_correct) {
            return res.json({
                login: true,
                correctData: false,
                ListOfIncorrectData: ListOfIncorrectData,
            });
        }

        const sql =
            "insert into TodoList (date, explanation,user_name) values(?,?,?)";
        const param = [
            req.body.postData.date,
            req.body.postData.explanation,
            req.session.username,
        ];

        conn.query(sql, param, (err, rows, fields) => {
            if (err) {
                return res.json({
                    login: true,
                    correctData: true,
                    queryError: err,
                });
            }
            return res.json({
                login: true,
                correctData: true,
            });
        });
    } else {
        return res.json({ login: false });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ logout: true });
    });
});
server.listen(port, () => {
    console.log("start_s");
});
