/**
 * Created by comahead on 2014-03-18.
 */
var http = require("http"),
    nconf = require("nconf"),
    redis = require("redis"),
    express = require("express"),
    mongojs = require("mongojs"),
    everyauth = require("everyauth"),
    socket_io = require("socket.io");

var customAuth = require("./routes/auth"),
    customFriend = require("./routes/friend"),
    customGlobal = require("./routes/global"),
    customMain = require("./routes/main"),
    customPost = require("./routes/post"),
    customReply = require("./routes/reply"),
    customSocket = require("./routes/socket");

var db = mongojs.connect('SocialNode', ['users', 'posts']);
var redisClient = redis.createClient();
process.on('exit', function() {
    redisClient.quit();
});

var sessionStore = new express.session.MemoryStore({ reapInterval: 60000 * 10});

nconf.file('config.json');


var app = express();
var server = http.createServer(app);

// 기본 모듈을 실행합니다.
customGlobal.active(nconf);
customAuth.active(everyauth, db);

// 서버를 설정합니다. 기본 설정
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('comahead'));
app.use(express.session({
    key: 'session',
    store: sessionStore
}));
app.use(everyauth.middleware());
app.use(app.router);
app.use(express.static('/Users/comahead/WebstormProjects/javascript/project/sns/SocialNode/public'));

// ?쒕쾭瑜??ㅼ젙?⑸땲?? 媛쒕컻 紐⑤뱶
app.configure('development', function(){
    app.use(express.errorHandler());
});

// 소켓 서버를 생성합니다.
var io = socket_io.listen(server);
io.set('log level', 2);

customMain.active(app, db);
customPost.active(app, db);
customFriend.active(app, db);
customReply.active(app, db, io.sockets.sockets);
customSocket.active(io, redisClient, sessionStore);


server.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});