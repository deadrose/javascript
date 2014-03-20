/**
 * Created by comahead on 2014-03-18.
 */

exports.active = function(app, db) {
    app.get('/', function (request, response) {
        if(request.user) {
            response.render('index', {
                user: request.user
            });
        } else {
            response.redirect('/login');
        }
    });
};