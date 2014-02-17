
define('fwinfo',['jquery', 'underscore'], function($, _) {
    var _cookieRECdelim = '~',
        _cookieNAMdelim = ':',
        _localcache = null;

    function _unpack_fwutil() {
        if (_localcache) {
            return;
        }
        _localcache = {};
        if (!document.cookie.match(/\bfwutil=([^\;]*)/)) {
            return;
        }
        var pairs = RegExp.$1.split(_cookieRECdelim),
            j, pair, pairs_length = pairs.length,
            pair_length;
        for (j = 0; j < pairs_length; j++) {
            pair = pairs[j].split(_cookieNAMdelim);
            pair_length = pair.length;
            if (2 == pair_length) {
                _localcache[pair[0]] = decodeURIComponent(pair[1]);
            }
        }
    }

    function _repack_fwutil() {
        var c = 'fwutil=', /* cookie string */
            d = '', /* current delimiter */
            p; /* current property name */
        for (p in _localcache) {
            if (_localcache.hasOwnProperty(p)) {
                c += d + p + _cookieNAMdelim + encodeURIComponent(_localcache[p]);
                d = _cookieRECdelim;
            }
        }
        document.cookie = c+';path=/';
    }

    var _fwInfo = {
        //Retrieving  session value either from JS cache or cookie
        setsessionvalue: function(key, value) {
            if (!_localcache) {
                _unpack_fwutil();
            }
            _localcache[key] = value;
            _repack_fwutil();
        },
        getsessionvalue: function(key) {
            if (!_localcache) {
                _unpack_fwutil();
            }
            return _localcache[key];
        },
        getandclearsessionvalue: function(key) {
            var r= _fwInfo.getsessionvalue(key);
            if (!r) return null;
            _fwInfo.setsessionvalue(key, '');
            return r;
        }
    };

    return _fwInfo;
});
