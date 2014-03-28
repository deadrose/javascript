/**
 * Created by comahead on 14. 3. 28.
 * WebPaint core
 */
var WpCore = (function () {
    var hasOwn = Object.prototype.hasOwnProperty,
        arraySlice = Array.prototype.slice,
        isFn = function (value) {
            return typeof value === 'function';
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

    /**
     * 상속처리
     * @param desc
     * @param src
     * @param supr
     */
    function inherits(desc, src, supr) {
        each(src, function (val, key) {
            desc[key] = isFn(val) && isFn(supr.prototype[key]) ? wrap(val, key, supr) : val;
        });
    }

    /**
     * 오버리이딩
     * @param fn
     * @param name
     * @param supr
     * @returns {Function}
     */
    function wrap(fn, name, supr) {
        return function () {
            var tmp = this.callParent, ret;

            this.callParent = supr.prototype[name];
            try {
                ret = fn.apply(this, arguments);
            } finally {
                this.callParent = tmp;
            }
            return ret;
        };
    }

    /**
     * 기본클래스
     * @constructor
     */
    var BaseClass = function () {
    };
    /**
     * 상속 함수
     * @param attrs
     * @returns {Klass}
     */
    BaseClass.extend = function classExtend(attrs) {
        var supr = this,
            statics = attrs.$statics || supr.$statics || {},
            singleton = !!attrs.$singleton,
            name = attrs.$name || 'Unknown Class',
            F = function () {
                if(autoRunParent && this.initialize) { this.initialize(); }
            };

        delete attrs.$statics;
        delete attrs.$singleton;
        //delete attrs.$autoRunParent;

        var Klass = function () {
            if (this.initialize) {
                return this.initialize.apply(this, arguments);
            }
            if (supr.prototype.initialize) {
                return supr.prototype.initialize.apply(this, arguments);
            }
        };
        F.prototype = supr.prototype;
        Klass.prototype = new F;
        Klass.prototype.constructor = Klass;
        Klass.extend = classExtend;
        inherits(Klass.prototype, attrs, supr);
        return Klass;
    };

    var UIBase = BaseClass.extend({
        $name: 'UIBase',
        initialize: function () {
            this.callParent();
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

    return {
        BaseClass: BaseClass,
        UIBase: UIBase,
        extend: extend,
        each: each,
        isFn: isFn
    };
})();
