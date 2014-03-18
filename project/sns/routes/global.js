/**
 * Created by comahead on 2014-03-18.
 */
exports.active = function(nconf) {
   Object.defineProperties(String.prototype, {
       isEmptyString: {
           value: function() {
               return this.trim() === '';
           }
       }
   });

   Object.defineProperties(Array.prototype, {
       contains: {
           value: function (data) {
               return this.indexOf(data) != -1;
           }
       },
       remove: {
           value: function (data) {
               var index;
               if ((index = this.indexOf(data)) > -1) { this.removeAt(index); }
               return this;
           }
       },
       removeAt: {
           value: function (index) {
               this.splice(index, 1);
               return this;
           }
       }
   });

   // 기본함수를 추출
   var parse = require('express/node_modules/cookie').parse;
   var parseSC = require('express/node_modules/connect/lib/utils').parseSignedCookies;

   Object.defineProperties(global, {
       parseCookie: {
           value: function (cookie) {
               return parseSC(parse(cookie), 'comahead');
           }
       },
       getCode: {
           value: function (code) {
               return {
                   code: code,
                   message: nconf.get(code)
               };
           }
       },
       responseWithSuccess: {
           value: function (response, code) {
               response.json(getCode(code), 200);
           }
       },
       responseWithError: {
           value: function (response, code) {
               response.json(getCode(code), 400);
           }
       },
       isLogin: {
           value: function (request, response, successCallback, failCallback) {
               if (request.user) {
                   successCallback(request.user);
               } else {
                   if (failCallback) {
                       failCallback();
                   } else {
                       responseWithError('error:1');
                   }
               }
           }
       }
   });
};