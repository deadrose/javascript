/**
 * Created by comahead on 14. 3. 25.
 */
(function () {
    var _core = {};
    var arrayProto = Array.prototype,
        objectProto = Object.prototype,
        toString = objectProto.toString,
        hasOwn = objectProto.hasOwnProperty,
        arraySlice = arrayProto.slice,
        win = window,
        doc = win.document,
        emptyFn = function () {
        },
        each = function (obj, cb, ctx) {
            if (!obj) {
                return obj;
            }
            var i;
            if (obj && obj.push) {
                if (obj.forEach) {
                    if (obj.forEach(cb, ctx) === false) {
                        return;
                    }
                } else {
                    for (i = 0; i < obj.length; i++) {
                        if (cb.call(ctx || obj, obj[i], i, obj) === false) {
                            return;
                        }
                    }
                }
            } else {
                for (i in obj) {
                    if (hasOwn.call(obj, i)) {
                        if (cb.call(obj, obj[i], i, obj) === false) {
                            return;
                        }
                    }
                }
            }
            return obj;
        },
        extend = function (obj) {
            each(arraySlice.call(arguments, 1), function (source) {
                each(source, function (val, key) {
                    obj[key] = source[key];
                });
            });
            return obj;
        };

    _core.each = each;
    _core.extend = extend;

    if (typeof Function.prototype.bind === 'undefined') {
        Function.prototype.bind = function () {
            var __method = this,
                args = arraySlice.call(arguments),
                object = args.shift();

            return function (context) {
                var local_args = args.concat(arraySlice.call(arguments));
                if (this !== window) {
                    local_args.push(this);
                }
                return __method.apply(object, local_args);
            };
        };
    }

    extend(_core, {
        emptyFn: emptyFn,
        browser: (function () {
            var detect = {},
                na = win.navigator,
                ua = na.userAgent,
                match;

            detect.isMobile = typeof orientation !== 'undefined';
            detect.isRetina = 'devicePixelRatio' in window && window.devicePixelRatio > 1;
            detect.isAndroid = ua.indexOf('android') !== -1;
            detect.isOpera = win.opera && win.opera.buildNumber;
            detect.isWebKit = /WebKit/.test(ua);
            detect.isTouch = !!('ontouchstart' in window);

            match = /(msie) ([\w.]+)/.exec(ua.toLowerCase()) || /(trident)(?:.*rv.?([\w.]+))?/.exec(ua.toLowerCase()) || ['', null, -1];
            detect.isIE = !detect.isWebKit && !detect.isOpera && match[1] !== null;
            detect.isIE6 = detect.isIE && /MSIE [56]/i.test(ua);
            detect.isIE7 = detect.isIE && /MSIE [567]/i.test(ua);
            detect.isOldIE = detect.isIE && /MSIE [5678]/i.test(ua);
            detect.version = parseInt(match[2], 10);

            detect.isChrome = (ua.indexOf('Chrome') !== -1);
            detect.isGecko = (ua.indexOf('Firefox') !== -1);
            detect.isMac = (ua.indexOf('Mac') !== -1);
            detect.isAir = ((/adobeair/i).test(ua));
            detect.isIDevice = /(iPad|iPhone)/.test(ua);
            detect.isSafari = (/Safari/).test(ua);
            detect.isIETri4 = (detect.isIE && ua.indexOf('Trident/4.0') !== -1);

            return detect;
        }()),

        is: function (o, typeName) {
            if (o === null) {
                return typeName === 'null';
            }

            if (o && (o.nodeType === 1 || o.nodeType === 9)) {
                return typeName === 'element';
            }

            var s = toString.call(o),
                type = s.match(/\[object (.*?)\]/)[1].toLowerCase();

            if (type === 'number') {
                if (isNaN(o)) {
                    return typeName === 'nan';
                }
                if (!isFinite(o)) {
                    return typeName === 'infinity';
                }
            }

            return type === typeName;
        },

        isEmpty: function (value, allowEmptyString) {
            return (value === null) || (value === undefined) || (!allowEmptyString ? value === '' : false) || (this.is(value, 'array') && value.length === 0);
        },

        isFunction: function (value) {
            return _core.is(value, 'function');
        },

        isArray: function (value) {
            return value && (value.constructor === Array || !!value.push);
        },

        toArray: function (value) {
            return arraySlice.apply(value, arraySlice.call(arguments, 1));
        },

        getUniqId: function (len) {
            len = len || 32;
            //return Number(String(Math.random() * 10).replace(/\D/g, ''));
            var rdmString = "";
            for (; rdmString.length < len; rdmString += Math.random().toString(36).substr(2));
            return  rdmString.substr(0, len);
        },

        nextSeq: (function () {
            var seq = 0;
            return function (step) {
                step = step || 1;
                return (seq += step);
            };
        }()),

        contains: function (value, find) {
            for (var i = 0, len = value.length; i < len; i++) {
                if (value[i] === find) {
                    return true;
                }
            }
            return false;
        }
    });

    (function () {
        var isFn = _core.isFunction,
            F = _core.emptyFn,
            RootClass = _core.emptyFn,
            classExtend,
            ignoreNames = ['superclass', 'members', 'statics'];

        function wrap(k, fn, supr) {
            return function () {
                var tmp = this.callParent, ret;

                this.callParent = supr.prototype[k];
                ret = undefined;
                try {
                    ret = fn.apply(this, arguments);
                } finally {
                    this.callParent = tmp;
                }
                return ret;
            };
        }

        function inherits(what, o, supr) {
            each(o, function (v, k) {
                what[k] = isFn(v) && isFn(supr.prototype[k]) ? wrap(k, v, supr) : v;
            });
        }


        function classExtend(attr) {
            var supr = this,
                statics, mixins, singleton, instance;

            if (isFn(attr)) {
                attr = attr();
            }

            singleton = attr.$singleton || false;
            statics = attr.$statics || false;
            mixins = attr.$mixins || false;

            // ���� ��ü
            function constructor() {
                if (singleton && instance) {
                    return instance;
                } else {
                    instance = this;
                }
                var args = arraySlice.call(arguments);
                if (this.initialize) {
                    this.initialize.apply(this, args);
                } else {
                    supr.prototype.initialize && supr.prototype.initialize.apply(this, args);
                }
            }

            function Class() {
                constructor.apply(this, arguments);
            }

            F.prototype = supr.prototype;
            Class.prototype = new F;
            Class.prototype.constructor = Class;
            Class.superclass = supr.prototype;
            Class.extend = classExtend;

            if (singleton) {
                Class.getInstance = function () {
                    if (!instance) {
                        instance = new Class();
                    }
                    return instance;
                };
            }

            Class.prototype.suprMethod = function (name) {
                var args = arraySlice.call(arguments, 1);
                return supr.prototype[name].apply(this, args);
            };

            Class.mixins = function (o) {
                if (!o.push) {
                    o = [o];
                }
                var proto = this.prototype;
                each(o, function (value) {
                    each(value, function (item, key) {
                        proto[key] = item;
                    });
                });
            };
            mixins && Class.mixins.call(Class, mixins);

            Class.members = function (o) {
                inherits(this.prototype, o, supr);
            };
            attr && Class.members.call(Class, attr);

            Class.statics = function (o) {
                o = o || {};
                for (var k in o) {
                    if (!_core.contains(ignoreNames, k)) {
                        this[k] = o[k];
                    }
                }
                return Class;
            };
            Class.statics.call(Class, supr);
            statics && Class.statics.call(Class, statics);


            return Class;
        }

        RootClass.extend = classExtend;
        _core.Class = RootClass;
    })();

    win.WebPainter = _core;

})();

(function (wp) {

    var WebPainter = window.WebPainter,
        Class = WebPainter,
        UIClass;

    UIClass = WebPainter.UIClass = WebPainter.Class.extend({
        name: 'UIClass',
        initialize: function () {
            console.log(111111111);
            this._listeners = {};
        },
        on: function (name, callback) {
            (this._listeners[name] || (this._listeners[name] = [])).push(callback);
        },
        trigger: function (name) {
            if (!this._listeners[name]) {
                return;
            }
            var args = arraySlice.call(arguments),
                name = args.shift();

            for (var i = 0, item; item = this._listeners[name][++i];) {
                item.apply(this, args);
            }
        },
        off: function (name, callback) {
            if (!this._listeners[name]) {
                return;
            }
            if (!callback) {
                delete this._listeners[name];
                return;
            }
            var idx = this._listeners[name].indexOf(callback);
            this._listeners[name] = this._listeners[name].splice(idx, 1);
        },
        one: function (name, callback) {
            var me = this,
                args = arraySlice.call(this._listeners, 1);
            this.on(name, function () {
                callback.apply(me, args);
                me.off(name);
            });
        }
    });

    WebPainter.History = UIClass.extend({
        initialize: function () {
            this._actions = [];
        },
        push: function (val) {
            this._actions.push(val)
        },
        undo: function () {
            this.trigger('undo', this._actions.shift());
        }
    });

    WebPainter.PaintTool = UIClass.extend({
       initialize: function(){
           this.callParent();
       }
    });

    WebPainter.PenTools = WebPainter.PaintTool.extend({

    });

    WebPainter.App = UIClass.extend({
        defaults: {
            defaultColor: 'rgb(0, 0, 0, 1)'
        },
        initialize: function (id, options) {
            var opts = extend({}, this.defaults, options);
            this.options = opts;

            this.callParent();

            this._canvas = document.querySelector(id);
            this._ctx = this._canvas.getContext('2d');

            this._history = new WebPainter.History();
            this._pens = new WebPainter.PenTools();

            this.color = opts.defaultColor;
            this.lineWidth = opts.defaultLineWidth;
        }
    });

})(WebPainter);
