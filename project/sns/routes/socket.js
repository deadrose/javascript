/**
 * Created by comahead on 2014-03-18.
 */
exports.active = function(io, client, parseCookie, sessionStore) {
    io.set('authorization', function(data, accept) {
        if(data.headers.cookie) {
            var cookies = parseCookie(data.headers.cookie);
            if(cookies.session) {
                sessionStore.get(cookies.session, function(error, session) {
                    if(session && session.auth) {
                        data.userId = session.auth.userId;
                        accept(null, null);
                    } else {
                        accept('ERROR', true);
                    }
                });
            }
        } else {
            accept('ERROR', false);
        }
    });

    io.sockets.on('connection', function(socket) {
        var userId = socket.handshakes.userId;

        client.lpush('sockets:' + userId, socket.id);
        socket.emit('success');

        socket.on('disconnect', function(){
            client.lrem('sockets:' + userId, 0, socket.id); // 0는 전부 제거
        });
    });

    // 사용자 정의 메서드
    io.sockets.sockets.emitTo = function (userId, name, message) {
        // 푸시 요청을 수행합니다.
        client.lrange('sockets:' + userId, 0, -1, function (error, data) {
            if (data) {
                data.forEach(function (item) {
                    if (io.sockets.sockets[item]) {
                        io.sockets.sockets[item].emit(name, message);
                    }
                });
            }
        });
    };
};