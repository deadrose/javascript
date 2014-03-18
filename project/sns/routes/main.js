/**
 * Created by comahead on 2014-03-18.
 */

exports.active = function(app, db) {
    app.get('/', function (request, response) {
        isLogin(request, response, function(user) {

        })
    })
};