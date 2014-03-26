/*!
 * @author 김승일
 * @email comahead@vi-nyl.com
 * @description 라이브러리
 */
(function (context, $, undefined) {
    "use strict";
    /* jshint expr: true, validthis: true */
    /* global _core, alert, escape, unescape */

    var frameworkName = 'jsa';
    var $root = $(document.documentElement).addClass('js');
    ('ontouchstart' in context) && $root.addClass('touch');
    ('orientation' in context) && $root.addClass('mobile');

    /**
     * @namespace
     * @name _core
     * @description root namespace of hib site
     */


    /**
     * @namespace
     * @name _core
     * @description 현대자동차 통합 브랜드 웹 공통 기능 스크립트
     */

    /**
     * @namespace
     * @name _core
     * @description _core 단축명
     */
    var _core = context[ frameworkName ] || (context[ frameworkName ] = {});

    var arrayProto = Array.prototype,
        objectProto = Object.prototype,
        toString = objectProto.toString,
        hasOwn = objectProto.hasOwnProperty,
        arraySlice = arrayProto.slice,
        doc = context.document,
        tmpInput = doc.createElement('input'),
        tmpNode = doc.createElement('div'),
        emptyFn = function () {},
        each = function (obj, cb, ctx) {
            if (!obj) { return obj; }
            var i;
            if (obj && obj.push) {
               if (obj.forEach) {
                   if (obj.forEach(cb, ctx) === false) { return; }
               } else {
                   for (i = 0; i < obj.length; i++) {
                       if (cb.call(ctx || obj, obj[i], i, obj) === false) { return; }
                   }
               }
            } else {
                for(i in obj) {
                    if (hasOwn.call(obj, i)) {
                        if (cb.call(obj, obj[i], i, obj) === false) { return; }
                    }
                }
            }
            return obj;
        },
        extend = function(obj) {
            each(arraySlice.call(arguments, 1), function(source) {
                each(source, function(val, key) {
                    obj[key] = source[key];
                });
            });
            return obj;
        };

    _core.name = frameworkName;
    _core.each = each;
    _core.extend = extend;

    if (typeof Function.prototype.bind === 'undefined') {
        /**
         * 함수내의 컨텐스트를 지정
         * @param {Object} context 컨텍스트
         * @param {Mixed} ... 두번째 인자부터는 실제로 싱행될 함수로 전달된다.
         * @example
         * function Test() {
		 *		alert(this.name);
		 * }.bind({name: 'axl rose'});
         *
         * Test(); -> alert('axl rose');
         */
        Function.prototype.bind = function () {
            var __method = this,
                args = arraySlice.call(arguments),
                object = args.shift();

            return function (context) {
                // bind로 넘어오는 인자와 원본함수의 인자를 병합하여 넘겨줌.
                var local_args = args.concat(arraySlice.call(arguments));
                if (this !== window) { local_args.push(this); }
                return __method.apply(object, local_args);
            };
        };
    }

    /**
     * jQuery 객체
     * @class
     * @name $
     */

    /**
     * value값을 URI인코딩하여 반환
     * @function
     * @name $#encodeURI
     * @return {String} 인코딩된 문자열
     */
    $.fn.encodeURI = function(value) {
        if (arguments.length === 0) {
            return encodeURIComponent($.trim(this.val()));
        } else {
            return this.val(encodeURIComponent(value));
        }
    };

    /**
     * value값의 앞뒤 스페이스문자 또는 old ie인경우에 placeholder를 제거하여 실제 값만 반환
     * @function
     * @name $#trimVal
     * @return {String} 문자열
     */
    $.fn.trimVal = (function() {
        var supportPlaceholder = ('placeholder' in tmpInput);

        return supportPlaceholder ? function(value) {
            if (arguments.length === 0) { return $.trim(this.val()); }
            else { return this.val($.trim(value)); }
        } : function(value) {
            if (arguments.length === 0) {
                if (this.val() === this.attr('placeholder')) {
                    return '';
                }
                return $.trim(this.val());
            } else {
                value = $.trim(value) || this.attr('placeholder');
                return this.val(value);
            }
        };
    })();

    /**
     * 체크여부를 지정할 때, changed 이벤트를 발생시킨다.(연결된 label에 on클래스를 토글링하고자 할 때 사용)
     * @function
     * @name $#checked
     * @param {Boolean} checked 체크여부
     * @param {Boolean} isBubble 버블링 여부
     * @returns {jQuery}
     * @fires $#changed
     * @example
     * // 먼저 changed 이벤트 바인딩
     * $('input:checkbox').on('changed', function(e, isChecked) { $(this).parent()[isChecked?'addClass':'removeClass']('on'); });
     * ..
     * // checked 값을 변경
     * $('input:checkbox').checked(true); // 해당체크박스의 부모에 on클래스가 추가된다.
     */
    $.fn.checked = function(checked, isBubble) {
        return this.each(function() {
            if (this.type !== 'checkbox' && this.type !== 'radio') { return; }
            /**
             * @event $#changed
             * @type {object}
             * @peoperty {boolean} checked - 체크 여부
             */
            $(this).prop('checked', checked)[isBubble === false ? 'triggerHandler' : 'trigger']('checkedchanged', [checked]);
        });
    };

    /**
     * 클래스 치환
     * @function
     * @name $#replaceClass
     * @param {String} old 대상클래스
     * @param {String} newCls 치환클래스
     * @returns {jQuery}
     */
    $.fn.replaceClass = function(old, newCls) {
        return this.each(function() {
            $(this).removeClass(old).addClass(newCls);
        });
    };

    /**
     * 레이어 표시 담당:
     * - 단순히 show를 하는게 아니라, 레이어가 표시되기전에 beforeshow이벤트를, 표시된 후에 show이벤트를 발생시켜준다.
     * - 레이어를 띄운 버튼을 보관한다. 닫을때, 버튼에 어떠한 액션을 취하고자 할 때 유용
     * @function
     * @name $#showLayer
     * @param {Element|jQuery} options.button (Optional) 버튼
     * @param {Function} options.onShow (Optional) 표시될 때 실행될 함수
     */
    $.fn.showLayer = function(options, isBubble) {
        options = extend({
            onShow: _core.emptyFn,
            opener: null
        }, options);

        return this.each(function() {
            var $this = $(this),
                trigger = [isBubble === false ? 'triggerHandler' : 'trigger'],
                evt;
            if (options.opener) {
                $this.data('opener', options.opener);
                $(options.opener).attr({'aria-pressed': 'true', 'aria-expand': 'true'});
            }

            $this[trigger](evt = $.Event('layerbeforeshow'));
            if (evt.isDefaultPrevented()) { return; }

            // 표시될 때 d_open 클래스 추가
            $this.addClass('d-open').show()[trigger]('layershow');
            options.onShow.call($this[0]);
        });
    };

    /**
     * 레이어 숨김 담당:
     * - 단순히 hide를 하는게 아니라, 숨겨진 후에 hide이벤트를 발생시켜준다.
     * @function
     * @name $#hideLayer
     * @param {Boolean} options.focusOpener (Optional) 숨겨진 후에 버튼에 포커스를 줄것인지 여부
     * @param {Function} options.onHide (Optional) 숨겨진 후에 실행될 함수
     */
    $.fn.hideLayer = function(options, isBubble) {
        options = extend({
            onHide: _core.emptyFn,
            focusOpener: false
        }, options);

        return this.each(function() {
            var $this = $(this);
            $this.removeClass('d-open').hide()[isBubble === false ? 'triggerHandler' : 'trigger']('layerhide');
            options.onHide.call($this[0]);

            // 숨겨진 후에 열었던 원래버튼에 포커스를 강제로 준다.
            if ($this.data('opener')) {
                var $btn = $( $this.data('opener') );
                $btn.attr({'aria-pressed': 'false', 'aria-expand': 'false'});
                if (options.focusOpener === true) {
                    $btn.focus();
                }
            }
        });
    };

    /**
     * 아무것도 안하는 빈함수
     * @function
     * @name $#noop
     * @example
     * $(this)[ isDone ? 'show' : 'noop' ](); // isDone이 true에 show하되 false일때는 아무것도 안함.
     */
    $.fn.noop = function() {
        return this;
    };

    /**
     * 체크된 항목의 값을 배열에 담아서 반환
     * @function
     * @name $#checkedValues
     * @return {Array}
     */
    $.fn.checkedValues = function() {
        var results = [];
        this.each(function() {
            if ((this.type === 'checkbox' || this.type === 'radio') && this.checked === true) {
                results.push(this.value);
            }
        });
        return results;
    };

    /**
     * 같은 레벨에 있는 다른 row에서 on를 제거하고 현재 row에 on 추가
     * @function
     * @name $#activeItem
     * @param {String} cls 활성 클래스명
     * @return {jQuery}
     */
    $.fn.activeItem = function(cls) {
        cls = cls || 'on';
        return this.addClass(cls).siblings().removeClass(cls).end();
    };

    /**
     * timeStart("name")로 name값을 키로하는 타이머가 시작되며, timeEnd("name")로 해당 name값의 지난 시간을 로그에 출력해준다.
     * @memberOf _core
     * @name timeStart
     * @function
     *
     * @param {String} name 타이머의 키값
     * @param {Boolean} reset 리셋(초기화) 여부
     *
     * @example
     * _core.timeStart('animate');
     * ...
     * _core.timeEnd('animate'); -> animate: 10203ms
     */
    _core.timeStart = function(name, reset) {
        if (!name) { return; }
        var time = +new Date,
            key = "KEY" + name.toString();

        this.timeCounters || (this.timeCounters = {});
        if (!reset && this.timeCounters[key]) { return; }
        this.timeCounters[key] = time;
    };

    /**
     * timeStart("name")에서 지정한 해당 name값의 지난 시간을 로그에 출력해준다.
     * @memberOf _core
     * @name timeEnd
     * @function
     *
     * @param {String} name 타이머의 키값
     * @return {Number} 걸린 시간
     *
     * @example
     * _core.timeStart('animate');
     * ...
     * _core.timeEnd('animate'); -> animate: 10203ms
     */
    _core.timeEnd = function(name) {
        if (!this.timeCounters) { return null; }

        var time = +new Date,
            key = "KEY" + name.toString(),
            timeCounter = this.timeCounters[key],
            diff, label;

        if (timeCounter) {
            diff = time - timeCounter;
            label = name + ": " + diff + "ms";
            // 이 콘솔은 디버깅을 위한 것이므로 지우지 말것.
            console.log('[' + name + '] ' + label + 'ms');
            delete this.timeCounters[key];
        }
        return diff;
    };

    /**
     * 네임스페이스 공간을 생성하고 객체를 설정<br>
     * js의 네이티브에서 제공하지 않는 기능이지만,<br>
     * 객체리터럴을 이용하여 여타 컴파일 언어의 네임스페이스처럼 쓸 수 있다.
     *
     * @function
     * @memberOf _core
     * @name namespace
     *
     * @param {String} name 네임스페이스명
     * @param {Object} obj {Optional) 지정된 네임스페이스에 등록할 객체, 함수 등
     * @return {Object} 생성된 네임스페이스
     *
     * @example
     * _core.namesapce('_core.widget.Tabcontrol', TabControl)
     *
     * ex) _core.namespace('_core.widget.Control', function() {}) 를 네이티브로 풀어서 작성한다면 다음과 같다.
     *
     * var _core = _core || {};
     * _core.ui = _core.ui || {};
     * _core.widget.Control = _core.widget.Control || function() {};
     */
    _core.namespace = function (name, obj) {
        if (typeof name !== 'string') {
            obj && (name = obj);
            return name;
        }
        var root = context,
            names = name.split('.'),
            isSet = arguments.length === 2,
            i, item;

        if (isSet) {
            for(i = -1; item = names[++i]; ) {
                root = root[item] || (root[item] = (i === names.length - 1 ? obj : {}));
            }
        } else { // isGet
            for(i = -1; item = names[++i]; ) {
                if (item in root) { root = root[item] }
                else { throw Error(name + '은(는) 정의되지 않은 네임스페이스입니다.'); }
            }
        }

        return root;
    };

    /**
     * common를 루트로 하여 네임스페이스를 생성하여 새로운 속성을 추가하는 함수
     *
     * @function
     * @memberOf _core
     * @name addon
     *
     * @param {String} name .를 구분자로 해서 common를 시작으로 하위 네임스페이스를 생성. 없으면 common에 추가된다.
     * @param {Object|Function} object
     * @param {Boolean} isExecFn (Optional) object값이 함수형일 때 실행한 값을 설정할 것인가 여부
     *
     * @example
     * _core.addon('', [], {});
     * _core.
     */
    _core.addon = function (name, object, isExecFn) {
        if (typeof name !== 'string') {
            object = name; name = '';
        }

        var root = _core,
            names = name ? name.replace(/^_core\.?/, '').split('.') : [],
            ln = names.length - 1,
            leaf = names[ln];

        if (isExecFn !== false && typeof object === 'function' && !hasOwn.call(object, 'classType')) {
            object = object.call(root);
        }

        for (var i = 0; i < ln; i++) {
            root = root[names[i]] || (root[names[i]] = {});
        }

        return (leaf && (root[leaf] ? extend(root[leaf], object) : (root[leaf] = object))) || extend(root, object), object;
    };

    /**
     * _core.addon 를 통해 정의된 모듈을 변수에 담아서 사용하고자 할 경우
     *
     * @function
     * @memberOf _core
     * @name use
     *
     * @param {String} name 네임스페이스
     * @return {Object} 함수를 실행한 결과값
     *
     * @example
     * _core.addon('test', function() {
	*	 return {
	*		init: function() {
	*			 alert(0);
	*		}
	*	});
	 * var test = _core.use('test'); 
	 * test.init()	=> alert(0)
	 */
    _core._prefix = '_core.';

    _core.addon(/** @lends _core */ {
        /**
         * document jQuery wrapper
         */
        $doc: $(document),
        /**
         * window jQuery wrapper
         */
        $win: $(window),
        /**
         * 빈 함수
         * @function
         * @example
         * var func = _core.emptyFn
         */
        emptyFn: emptyFn,

        /**
         * 임시 노드: css3스타일의 지원여부와 html을 인코딩/디코딩하거나 노드생성할 때  사용
         */
        tmpNode: tmpNode,

        /**
         * html5 속성의 지원여부를 체크할 때 사용
         * @example
         * is = 'placeholder' in _core.tmpInput;  // placeholder를 지원하는가
         */
        tmpInput: tmpInput,

        /**
         * 터치기반 디바이스 여부
         */
        isTouch: !!('ontouchstart' in window),

        /**
         * 객체 자체에 주어진 이름의 속성이 있는지 조회
         *
         * @param {Object} obj 객체
         * @param {String} name 키 이름
         * @return {Boolean} 키의 존재 여부
         */
        hasOwn: function (obj, name) {
            return hasOwn.call(obj, name);
        },

        /**
         * 브라우저의 Detect 정보: 되도록이면 Modernizr 라이브러리를 사용할 것을 권함
         *
         * @example
         * _core.browser.isOpera // 오페라
         * _core.browser.isWebKit // 웹킷
         * _core.browser.isIE // IE
         * _core.browser.isIE6 // IE56
         * _core.browser.isIE7 // IE567
         * _core.browser.isOldIE // IE5678
         * _core.browser.version // IE의 브라우저
         * _core.browser.isChrome // 크롬
         * _core.browser.isGecko // 파이어폭스
         * _core.browser.isMac // 맥OS
         * _core.browser.isAir // 어도비 에어
         * _core.browser.isIDevice // 아이폰, 아이패드
         * _core.browser.isSafari // 사파리
         * _core.browser.isIETri4 // IE엔진
         */
        browser: (function () {
            var detect = {},
                win = context,
                na = win.navigator,
                ua = na.userAgent,
                match;

            detect.isMobile = typeof orientation !== 'undefined';
            detect.isRetina = 'devicePixelRatio' in window && window.devicePixelRatio > 1;
            detect.isAndroid = ua.indexOf('android') !== -1;
            detect.isOpera = win.opera && win.opera.buildNumber;
            detect.isWebKit = /WebKit/.test(ua);
            detect.isTouch = !!('ontouchstart' in window);

            match = /(msie) ([\w.]+)/.exec(ua.toLowerCase()) || /(trident)(?:.*rv.?([\w.]+))?/.exec(ua.toLowerCase()) || ['',null,-1];
            detect.isIE = !detect.isWebKit && !detect.isOpera && match[1] !== null;		//(/MSIE/gi).test(ua) && (/Explorer/gi).test(na.appName);
            detect.isIE6 = detect.isIE && /MSIE [56]/i.test(ua);
            detect.isIE7 = detect.isIE && /MSIE [567]/i.test(ua);
            detect.isOldIE = detect.isIE && /MSIE [5678]/i.test(ua);
            detect.version = parseInt(match[2], 10);		// 사용법: if (browser.isIE && browser.version > 8) { // 9이상인 ie브라우저

            detect.isChrome = (ua.indexOf('Chrome') !== -1);
            detect.isGecko = (ua.indexOf('Firefox') !==-1);
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

        /**
         * 주어진 인자가 빈값인지 체크
         *
         * @param {Object} value 체크할 문자열
         * @param {Boolean} allowEmptyString (Optional: false) 빈문자를 허용할 것인지 여부
         * @return {Boolean}
         */
        isEmpty: function (value, allowEmptyString) {
            return (value === null) || (value === undefined) || (!allowEmptyString ? value === '' : false) || (this.is(value, 'array') && value.length === 0);
        },

        /**
         * 배열인지 체크
         *
         * @function
         * @param {Object} value 체크할 값
         * @return {Boolean}
         */
        isArray: function (value) {
            return value && (value.constructor === Array || !!value.push);
        },

        /**
         * 날짜형인지 체크
         * @param {Object} value 체크할 값
         * @return {Boolean}
         */
        isDate: function (value) {
            return toString.call(value) === '[object Date]';
        },

        /**
         * JSON 객체인지 체크
         *
         * @function
         * @param {Object} value 체크할 값
         * @return {Boolean}
         */
        isObject: (toString.call(null) === '[object Object]') ? function (value) {
            return value !== null && value !== undefined && toString.call(value) === '[object Object]' && value.ownerDocument === undefined;
        } : function (value) {
            return toString.call(value) === '[object Object]';
        },

        /**
         * 함수형인지 체크
         *
         * @function
         * @param {Object} value 체크할 값
         * @return {Boolean}
         */
        isFunction: (typeof document !== 'undefined' && typeof document.getElementsByTagName('body') === 'function') ? function (value) {
            return toString.call(value) === '[object Function]';
        } : function (value) {
            return typeof value === 'function';
        },

        /**
         * 숫자 타입인지 체크.
         * @param {Object} value 체크할 값
         * @return {Boolean}
         */
        isNumber: function (value) {
            return typeof value === 'number' && isFinite(value);
        },

        /**
         * 숫지인지 체크하되 .를 허용
         * @param {Object} value 예: 1, '1', '2.34'
         * @return {Boolean}
         */
        isNumeric: function (value) {
            return !isNaN(parseFloat(value)) && isFinite(value);
        },

        /**
         * 문자형인지 체크
         * @param {Object} value 체크할 값
         * @return {Boolean}
         */
        isString: function (value) {
            return typeof value === 'string';
        },

        /**
         * 불린형인지 체크
         *
         * @param {Object} value 체크할 값
         * @return {Boolean}
         */
        isBoolean: function (value) {
            return typeof value === 'boolean';
        },

        /**
         * 엘리먼트인지 체크
         * @param {Object} value 체크할 값
         * @return {Boolean}
         */
        isElement: function (value) {
            return value ? value.nodeType === 1 : false;
        },

        /**
         * 텍스트노드인지 체크
         * @param {Object} value 체크할 값
         * @return {Boolean}
         */
        isTextNode: function (value) {
            return value ? value.nodeName === "#text" : false;
        },

        /**
         * 정의된 값인지 체크
         * @param {Object} value 체크할 값
         * @return {Boolean}
         */
        isDefined: function (value) {
            return typeof value !== 'undefined';
        },

        /**
         * 주어진 값을 배열로 변환
         *
         * @param {Mixed} value 배열로 변환하고자 하는 값
         * @return {Array}
         *
         * @example
         * _core.toArray('abcd"); => ["a", "b", "c", "d"]
         * _core.toArray(arguments);  => arguments를 객체를 array로 변환하여 Array에서 지원하는 유틸함수(slice, reverse ...)를 쓸수 있다.
         */
        toArray: function (value) {
            return arraySlice.apply(value, arraySlice.call(arguments, 1));
        },

        /**
         * 15자의 숫자로 이루어진 유니크한 값 생성
         *
         * @return {String}
         */
        getUniqId: function (len) {
        	len = len || 32;
            //return Number(String(Math.random() * 10).replace(/\D/g, ''));
		    var rdmString = "";
		    for( ; rdmString.length < len; rdmString  += Math.random().toString(36).substr(2));
		    return  rdmString.substr(0, len);
        },

        /**
         * 순번으로 유니크값 을 생성해서 반환
         * @function
         * @return {Number}
         */
        nextSeq: (function() {
            var seq = 0;
            return function(step) {
                step = step || 1;
                return (seq += step);
            };
        }())

    });

    /**
     * 문자열 관련 유틸 함수 모음
     *
     * @namespace
     * @name _core.string
     * @description
     */
    _core.addon('string', function () {
        var escapeChars = {
                '&': '&amp;',
                '>': '&gt;',
                '<': '&lt;',
                '"': '&quot;',
                "'": '&#39;'
            },
            unescapeChars = (function (escapeChars) {
                var results = {};
                each(escapeChars, function (v, k) {
                    results[v] = k;
                });
                return results;
            })(escapeChars),
            escapeRegexp = /[&><'"]/g,
            unescapeRegexp = /(&amp;|&gt;|&lt;|&quot;|&#39;|&#[0-9]{1,5};)/g,
            tagRegexp = /<\/?[^>]+>/gi,
            scriptRegexp = /<script[^>]*>([\\S\\s]*?)<\/script>/img;

        return /** @lends _core.string */{
        	trim: function(value) {
        		return value ? value.replace(/^\s+|\s+$/g, "") : value;
        	},
            /**
             * 정규식이나 검색문자열을 사용하여 문자열에서 텍스트를 교체
             *
             * @param {String} value 교체를 수행할 문자열
             * @param {RegExp|String} find 검색할 문자열이나 정규식 패턴
             * @param {String} rep 대체할 문자열
             * @return {String} 대체된 결과 문자열
             *
             * @example
             * _core.replaceAll("a1b2c3d", /[0-9]/g, ''); => "abcd"
             */
            replaceAll: function (value, find, rep) {
                if (find.constructor === RegExp) {
                    return value.replace(new RegExp(find.toString().replace(/^\/|\/$/gi, ""), "gi"), rep);
                }
                return value.split(find).join(rep);
            },

            /**
             * 주어진 문자열의 바이트길이 반환
             *
             * @param {String} value 길이를 계산할 문자열
             * @return {Number}
             *
             * @example
             * _core.byteLength("동해물과"); => 8
             */
            byteLength: function (value) {
                var l = 0;
                for (var i=0, len = value.length; i < len; i++) {
                    l += (value.charCodeAt(i) > 255) ? 2 : 1;
                }
                return l;
            },

            /**
             * 주어진 문자열을 지정된 길이(바이트)만큼 자른 후, 꼬리글을 덧붙여 반환
             *
             * @param {String} value 문자열
             * @param {Number} length 잘라낼 길이
             * @param {String} truncation (Optional: '...') 꼬리글
             * @return {String} 결과 문자열
             *
             * @example
             * _core.string.cutByByte("동해물과", 3, "..."); => "동..."
             */
            cutByByte: function (value, length, truncation) {
                var str = value,
                    chars = this.charsByByte(value, length);

                truncation || (truncation = '');
                if (str.length > chars) {
                    return str.substring(0, chars) + truncation;
                }
                return str;
            },

            /**
             * 주어진 바이트길이에 해당하는 char index 반환
             *
             * @param {String} value 문자열
             * @param {Number} length 제한 문자수
             * @return {Number} chars count
             */
            charsByByte: function (value, length) {
                var str = value,
                    l = 0, len = 0, i = 0;
                for (i=0, len = str.length; i < len; i++) {
                    l += (str.charCodeAt(i) > 255) ? 2 : 1;
                    if (l > length) { return i; }
                }
                return i;
            },

            /**
             * 첫글자를 대문자로 변환하고 이후의 문자들은 소문자로 변환
             *
             * @param {String} value 문자열
             * @return {String} 결과 문자열
             *
             * @example
             * _core.string.capitalize("abCdEfg"); => "Abcdefg"
             */
            capitalize: function (value) {
                return value ? value.charAt(0).toUpperCase() + value.substring(1) : value;
            },

            /**
             * 카멜 형식으로 변환
             *
             * @param {String} value 문자열
             * @return {String} 결과 문자열
             *
             * @example
             * _core.string.capitalize("ab-cd-efg"); => "abCdEfg"
             */
            camelize: function (value) {
                return value ? value.replace(/(\-|_|\s)+(.)?/g, function(a, b, c) {
                    return (c ? c.toUpperCase() : '');
                }) : value
            },

            /**
             * 대쉬 형식으로 변환
             *
             * @param {String} value 문자열
             * @return {String} 결과 문자열
             *
             * @example
             * _core.string.dasherize("abCdEfg"); => "ab-cd-efg"
             */
            dasherize: function (value) {
                return value ? value.replace(/[_\s]+/g, '-').replace(/([A-Z])/g, '-$1').replace(/-+/g, '-').toLowerCase() : value;
            },

            /**
             * 첫글자를 소문자로 변환
             * @param {String} value
             * @returns {string}
             */
            toFirstLower: function (value) {
                return value ? value.replace(/^[A-Z]/, function(s) { return s.toLowerCase(); }) : value;
            },

            /**
             * 주어진 문자열을 지정한 수만큼 반복하여 조합
             *
             * @param {String} value 문자열
             * @param {Number} cnt 반복 횟수
             * @return {String} 결과 문자열
             *
             * @example
             * _core.string.repeat("ab", 4); => "abababab"
             */
            repeat: function (value, cnt, sep) {
                sep || (sep = '');
                var result = [];

                for (var i = 0; i < cnt; i++) {
                    result.push(value);
                }
                return result.join(sep);
            },

            /**
             * 특수기호를 HTML ENTITY로 변환
             *
             * @param {String} value 특수기호
             * @return {String} 결과 문자열
             *
             * @example
             * _core.string.escapeHTML('<div><a href="#">링크</a></div>'); => "&lt;div&gt;&lt;a href=&quot;#&quot;&gt;링크&lt;/a&gt;&lt;/div&gt;"
             */
            escapeHTML: function (value) {
                return value ? (value+"").replace(escapeRegexp, function (m) {
                    return escapeChars[m];
                }) : value;
            },

            /**
             * HTML ENTITY로 변환된 문자열을 원래 기호로 변환
             *
             * @param {String} value 문자열
             * @return {String} 결과 문자열
             *
             * @example
             * _core.string.unescapeHTML('&lt;div&gt;&lt;a href=&quot;#&quot;&gt;링크&lt;/a&gt;&lt;/div&gt;');  => '<div><a href="#">링크</a></div>'
             */
            unescapeHTML: function (value) {
                return value ? (value+"").replace(unescapeRegexp, function (m) {
                    return unescapeChars[m];
                }) : value;
            },

            /**
             * string === value이면 other를,  string !== value 이면 value를 반환
             *
             * @param {String} value
             * @param {String} these
             * @param {String} other
             * @return {String}
             *
             * @example
             * _core.string.toggle('ASC", "ASC", "DESC"); => "DESC"
             * _core.string.toggle('DESC", "ASC", "DESC"); => "ASC"
             */
            toggle: function (value, these, other) {
                return these === value ? other : value;
            },

            /**
             * 주어진 문자열에 있는 {인덱스} 부분을 인수로 대테하여 반환
             *
             * @param {String} format 문자열
             * @param {String} ... 대체할 문자열
             * @return {String} 결과 문자열
             *
             * @example
             * _core.string.format("{0}:{1}:{2} {0}", "a", "b", "c");  => "a:b:c a"
             */
            format: function (format) {
                var args = _core.toArray(arguments).slice(1);

                return format.replace(/{([0-9]+)}/g, function (m, i) {
                    return args[i];
                });
            },

            /**
             * 주어진 문자열에서 HTML를 제거
             *
             * @param {String} value 문자열
             * @return {String}
             */
            stripTags: function (value) {
                return value.replace(tagRegexp, '');
            },

            /**
             * 주어진 문자열에서 스크립트를 제거
             *
             * @param {String} value 문자열
             * @return {String}
             */
            stripScripts: function (value) {
                return value.replace(scriptRegexp, '');
            }

        };
    });


    /**
     * @namespace
     * @name _core.uri
     * @description
     */
    _core.addon('uri', /** @lends _core.uri */{

        /**
         * 주어진 url에 쿼리스츠링을 조합
         *
         * @param {String} url
         * @param {String:Object} string
         * @return {String}
         *
         * @example
         * _core.uri.urlAppend("board.do", {"a":1, "b": 2, "c": {"d": 4}}); => "board.do?a=1&b=2&c[d]=4"
         * _core.uri.urlAppend("board.do?id=123", {"a":1, "b": 2, "c": {"d": 4}}); => "board.do?id=123&a=1&b=2&c[d]=4"
         */
        addToQueryString: function (url, string) {
            if (_core.is(string, 'object')) {
                string = _core.object.toQueryString(string);
            }
            if (!_core.isEmpty(string)) {
                return url + (url.indexOf('?') === -1 ? '?' : '&') + string;
            }

            return url;
        },

        /**
         * 쿼리스트링을 객체로 변환
         *
         * @param {String} query
         * @return {Object}
         *
         * @example
         * _core.uri.parseQuery("a=1&b=2"); => {"a": 1, "b": 2}
         */
        parseQuery: function (query) {
            if (!query) {
                return {};
            }
            if (query.length > 0 && query.charAt(0) === '?') { query = query.substr(1); }

            var params = (query + '').split('&'),
                obj = {},
                params_length = params.length,
                tmp = '',
                i;

            for (i = 0; i < params_length; i++) {
                tmp = params[i].split('=');
                obj[decodeURIComponent(tmp[0])] = decodeURIComponent(tmp[1]).replace(/[+]/g, ' ');
            }
            return obj;
        },

        /**
         * url를 파싱하여 host, port, protocol 등을 추출
         *
         * @function
         * @param {String} str url 문자열
         * @return {Object}
         *
         * @example
         * _core.uri.parseUrl("http://www._core.com:8080/list.do?a=1&b=2#comment");
         * => {scheme: "http", host: "www._core.com", port: "8080", path: "/list.do", query: "a=1&b=2"…}
         */
        parseUrl: (function() {
            var o = {
                strictMode: false,
                key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
                q: {
                    name: "queryKey",
                    parser: /(?:^|&)([^&=]*)=?([^&]*)/g
                },
                parser: {
                    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
                    loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/\/?)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
                }
            };

            return function (str) {
                if (str.length > 2 && str[0] === '/' && str[1] === '/') {
                    str = window.location.protocol + str;
                }
                var m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
                    uri = {}, i = 14;
                while (i--) { uri[o.key[i]] = m[i] || ""; }
                return uri;
            };
        })(),

        /**
         * 주어진 url에서 해쉬문자열 제거
         *
         * @param {String} url url 문자열
         * @return {String} 결과 문자열
         *
         * @example
         * _core.uri.removeHash("list.do#comment"); => "list.do"
         */
        removeHash: function (url) {
            return url ? url.replace(/.*(?=#[^\s]+$)/, '') : url;
        }
    });

    /**
     * 숫자관련 유틸함수 모음
     *
     * @namespace
     * @name _core.number
     * @description
     */
    _core.addon('number', /** @lends _core.number */{
        /**
         * 주어진 수를 자릿수만큼 앞자리에 0을 채워서 반환
         *
         * @param {String} value
         * @param {Number} size (Optional: 2)
         * @param {String} character (Optional: '0')
         * @return {String}
         *
         * @example
         * _core.number.zeroPad(2, 3); => "002"
         */
        zeroPad: function (value, size, character) {
            var result = String(value);
            character = character || "0";
            size || (size = 2);

            while (result.length < size) {
                result = character + result;
            }
            return result;
        },

        /**
         * 세자리마다 ,를 삽입
         *
         * @param {Number} value
         * @return {String}
         *
         * @example
         * _core.number.addComma(21342); => "21,342"
         */
        addComma: function (value) {
            value += '';
            var x = value.split('.'),
                x1 = x[0],
                x2 = x.length > 1 ? '.' + x[1] : '',
                re = /(\d+)(\d{3})/;

            while (re.test(x1)) {
                x1 = x1.replace(re, '$1' + ',' + '$2');
            }
            return x1 + x2;
        },

        /**
         * min ~ max사이의 랜덤값 반환
         *
         * @param {Number} min 최소값
         * @param {Number} max 최대값
         * @return {Number} 랜덤값
         */
        random: function (min, max) {
            if (max === null) {
                max = min;
                min = 0;
            }
            return min + Math.floor(Math.random() * (max - min + 1));
        },

        /**
         * 상하한값을 반환. value가 min보다 작을 경우 min을, max보다 클 경우 max를 반환
         *
         * @param {Number} value
         * @param {Number} min 최소값
         * @param {Number} max 최대값
         * @return {Number}
         */
        limit: function (value, min, max) {
            if (value < min) { return min; }
            else if (value > max) { return max; }
            return value;
        }
    });

    function nativeCall(f) {
        return f ? function(obj) {
            return f.apply(obj, arraySlice.call(arguments, 1));
        } : false;
    }
    /**
     * 배열관련 유틸함수
     * @namespace
     * @name _core.array
     */
    _core.addon('array', /** @lends _core.array */{
        /**
         *
         * @returns {*}
         */
    	append: function () {
    		var args = arraySlice.call(arguments);
    		arrayProto.push.apply.apply(args);
    		return args[0];
    	},
        /**
         * 콜백함수로 하여금 요소를 가공하는 함수
         *
         * @param {Array} obj 배열
         * @param {Function} cb 콜백함수
         * @param {Object} (optional) 컨텍스트
         * @return {Array}
         *
         * @example
         * _core.array.map([1, 2, 3], function(item, index) {
		 *		return item * 10;
		 * });
         * => [10, 20, 30]
         */
        map: nativeCall(arrayProto.map) || function (obj, cb, ctx) {
            var results = [];
            if (!_core.is(obj, 'array') || !_core.is(cb, 'function')) { return results; }
            // vanilla js~
            for(var i =0, len = obj.length; i < len; i++) {
                results[results.length] = cb.call(ctx||obj, obj[i], i, obj);
            }
            return results;
        },

        /**
         *
         */
        every: nativeCall(arrayProto.every) || function(arr, cb, ctx) {
            var isTrue = true;
            if (!_core.is(arr, 'array') || !_core.is(cb, 'function')) { return isTrue; }
            each(arr, function(v, k) {
                if (cb.call(ctx||this, v, k) !== true) {
                    return isTrue = false, false;
                }
            });
            return isTrue;
        },

        /**
         *
         */
        any: nativeCall(arrayProto.any) || function(arr, cb, ctx) {
            var isTrue = false;
            if (!_core.is(arr, 'array') || !_core.is(cb, 'function')) { return isTrue; }
            each(arr, function(v, k) {
                if (cb.call(ctx||this, v, k) === true) {
                    return isTrue = true, false;
                }
            });
            return isTrue;
        },

        /**
         * 배열 요소의 순서를 섞어주는 함수
         *
         * @param {Array} obj 배열
         * @return {Array} 순서가 섞인 새로운 배열
         */
        shuffle: function (obj) {
            var rand,
                index = 0,
                shuffled = [],
                number = _core.number;

            each(obj, function (value, k) {
                rand = number.random(index++);
                shuffled[index - 1] = shuffled[rand], shuffled[rand] = value;
            });
            return shuffled;
        },

        /**
         * 콜백함수로 하여금 요소를 걸려내는 함수
         *
         * @param {Array} obj 배열
         * @param {Function} cb 콜백함수
         * @param {Object} (optional) 컨텍스트
         * @return {Array}
         *
         * @example
         * _core.array.filter([1, '일', 2, '이', 3, '삼'], function(item, index) {
		 *		return typeof item === 'string';
		 * });
         * => ['일','이','삼']
         */
        filter: nativeCall(arrayProto.filter) || function (obj, cb, ctx) {
            var results = [];
            if (!_core.is(obj, 'array') || !_core.is(cb, 'function')) { return results; }
            for(var i =0, len = obj.length; i < len; i++) {
                cb.call(ctx||obj, obj[i], i, obj) && (results[results.length] = obj[i]);
            }
            return results;
        },

        /**
         * 주어진 배열에 지정된 값이 존재하는지 체크
         *
         * @param {Array} obj 배열
         * @param {Function} cb 콜백함수
         * @return {Array}
         *
         * @example
         * _core.array.include([1, '일', 2, '이', 3, '삼'], '삼');  => true
         */
        include: function (arr, value, b) {
            return _core.array.indexOf(arr, value, b) > -1;
        },

        /**
         * 주어진 인덱스의 요소를 반환
         *
         * @param {Array} obj 배열
         * @param {Function} cb 콜백함수
         * @return {Array}
         *
         * @example
         * _core.array.indexOf([1, '일', 2, '이', 3, '삼'], '일');  => 1
         */
        indexOf: nativeCall(arrayProto.indexOf) || function (arr, value, b) {
            for (var i = 0, len = arr.length; i < len; i++) {
                if ( (b !== false && arr[i] === value) || (b === false && arr[i] == value) ) { return i; }
            }
            return -1;
        },

        /**
         * 주어진 배열에서 index에 해당하는 요소를 삭제
         *
         * @param {Array} value 배열
         * @param {Number} index 삭제할 인덱스
         * @return {Array} 지정한 요소가 삭제된 배열
         */
        remove: function (value, index) {
            if (!_core.is(value, 'array')) { return value; }
            return value.slice(index, 1);
        },

        /**
         * 주어진 배열에서 가장 큰 요소를 반환
         *
         * @param {Array} array 배열
         * @return {Mix}
         */
        max: function( array ) {
            return Math.max.apply( Math, array );
        },

        /**
         * 주어진 배열에서 가장 작은 요소를 반환
         *
         * @param {Array} array 배열
         * @return {Mix}
         */
        min: function( array ) {
            return Math.min.apply( Math, array );
        }
    });

    /**
     * JSON객체 관련 유틸함수
     * @namespace
     * @name _core.object
     */
    _core.addon('object', /** @lends _core.object */{

        /**
         * 개체의 열거가능한 속성 및 메서드 이름을 배열로 반환
         *
         * @param {Object} obj 리터럴 객체
         * @return {Array} 객체의 열거가능한 속성의 이름이 포함된 배열
         *
         * @example
         * _core.object.keys({"name": "Axl rose", "age": 50}); => ["name", "age"]
         */
        keys: function (obj) {
            var results = [];
            each(obj, function (v, k) {
                results.push(k);
            });
            return results;
        },

        /**
         * 개체의 열거가능한 속성의 값을 배열로 반환
         *
         * @param {Object} obj 리터럴 객체
         * @return {Array} 객체의 열거가능한 속성의 값들이 포함된 배열
         *
         * @example
         * _core.object.values({"name": "Axl rose", "age": 50}); => ["Axl rose", 50]
         */
        values: function (obj) {
            var results = [];
            each(obj, function (v) {
                results.push(v);
            });
            return results;
        },

        /**
         * 콜백함수로 하여금 요소를 가공하는 함수
         *
         * @param {JSON} obj 배열
         * @param {Function} cb 콜백함수
         * @return {JSON}
         *
         * @example
         * _core.object.map({1; 'one', 2: 'two', 3: 'three'}, function(item, key) {
		 *		return item + '__';
		 * });
         * => {1: 'one__', 2: 'two__', 3: 'three__'}
         */
        map: function(obj, cb) {
            if (!_core.is(obj, 'object') || !_core.is(cb, 'function')) { return obj; }
            var results = {};
            each(obj, function(v, k) {
                results[k] = cb(obj[k], k, obj);
            });
            return results;
        },

        /**
         * 요소가 있는 json객체인지 체크
         *
         *
         * @param {Object} obj json객체
         * @return {Boolean} 요소가 하나라도 있는지 여부
         */
        hasItems: function (obj) {
            if (!_core.is(obj, 'object')) {
                return false;
            }

            var has = false;
            each(obj, function(v) {
                return has = true, false;
            });
            return has;
        },


        /**
         * 객체를 쿼리스크링으로 변환
         *
         * @param {Object} obj 문자열
         * @param {Boolean} isEncode (Optional) URL 인코딩할지 여부
         * @return {String} 결과 문자열
         *
         * @example
         * _core.object.toQueryString({"a":1, "b": 2, "c": {"d": 4}}); => "a=1&b=2&c[d]=4"
         */
        toQueryString: function (params, isEncode) {
            if (typeof params === 'string') {
                return params;
            }
            var queryString = '',
                encode = isEncode === false ? function (v) {
                    return v;
                } : encodeURIComponent;

            each(params, function (value, key) {
                if (typeof (value) === 'object') {
                    each(value, function (innerValue, innerKey) {
                        if (queryString !== '') {
                            queryString += '&';
                        }
                        queryString += encode(key) + '[' + encode(innerKey) + ']=' + encode(innerValue);
                    });
                } else if (typeof (value) !== 'undefined') {
                    if (queryString !== '') {
                        queryString += '&';
                    }
                    queryString += encode(key) + '=' + encode(value);
                }
            });
            return queryString;
        },

        /**
         * 주어진 배열를 키와 요소를 맞바꾸어 반환
         *
         * @param {Array} obj 배열
         * @return {Object}
         *
         * @example
         * _core.object.travere({1:a, 2:b, 3:c, 4:d]);
		 * => {a:1, b:2, c:3, d:4}
		 */
        traverse: function (obj) {
            var result = {};
            each(obj, function (item, index) {
                result[item] = index;
            });
            return result;
        },

        /**
         * 주어진 리터럴에서 index에 해당하는 요소를 삭제
         *
         * @param {Array} value 리터럴
         * @param {Number} key 삭제할 키
         * @return 지정한 요소가 삭제된 리터럴
         */
        remove: function (value, key) {
            if (!_core.is(value, 'object')) { return value; }
            value[key] = null;
            delete value[key];
            return value;
        }
    });


    /**
     * 날짜관련 유틸함수
     * @namespace
     * @name _core.date
     */
    _core.addon('date', function () {
        var months = "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(","),
            fullMonths = "January,Febrary,March,April,May,June,July,Augst,September,October,November,December".split(",");


        function compare(d1, d2) {
            return d1.getTime() > d2.getTime() ? -1 : (d1.getTime() === d2.getTime() ? 0 : 1);
        }

        return /** @lends _core.date */{
            MONTHS_NAME: months,
            MONTHS_FULLNAME: fullMonths,

            /**
             * 날짜형식을 지정한 포맷의 문자열로 변환
             *
             * @param {Date} formatDate
             * @param {String} formatString} 포맷 문자열
             * @return {String} 결과 문자열
             *
             * @example
             * _core.date.format(new Date(), "yy:MM:dd");
             * =>
             */
            format: function (formatDate, formatString) {
                formatString || (formatString = 'yyyy-MM-dd');
                if (formatDate instanceof Date) {
                    var yyyy = formatDate.getFullYear(),
                        yy = yyyy.toString().substring(2),
                        M = formatDate.getMonth() + 1,
                        MM = M < 10 ? "0" + M : M,
                        MMM = this.MONTHS_NAME[M - 1],
                        MMMM = this.MONTHS_FULLNAME[M - 1],
                        d = formatDate.getDate(),
                        dd = d < 10 ? "0" + d : d,
                        h = formatDate.getHours(),
                        hh = h < 10 ? "0" + h : h,
                        m = formatDate.getMinutes(),
                        mm = m < 10 ? "0" + m : m,
                        s = formatDate.getSeconds(),
                        ss = s < 10 ? "0" + s : s,
                        x = h > 11 ? "PM" : "AM",
                        H = h % 12;

                    if (H === 0) {
                        H = 12;
                    }
                    return formatString.replace(/yyyy/g, yyyy).replace(/yy/g, yy).replace(/MMMM/g, MMMM).replace(/MMM/g, MMM).replace(/MM/g, MM).replace(/M/g, M).replace(/dd/g, dd).replace(/d/g, d).replace(/hh/g, hh).replace(/h/g, h).replace(/mm/g, mm).replace(/m/g, m).replace(/ss/g, ss).replace(/s/g, s).replace(/!!!!/g, MMMM).replace(/!!!/g, MMM).replace(/H/g, H).replace(/x/g, x);
                } else {
                    return "";
                }
            },

            /**
             * date가 start와 end사이인지 여부
             *
             * @param {Date} date 날짜
             * @param {Date} start 시작일시
             * @param {Date} end 만료일시
             * @return {Boolean}
             */
            between: function (date, start, end) {
                return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
            },

            /**
             * 날짜 비교
             *
             * @function
             * @param {Date} date1 날짜1
             * @param {Date} date2 날짜2
             * @return {Number} -1: date1가 이후, 0: 동일, 1:date2가 이후
             */
            compare: compare,

            /**
             * 년월일이 동일한가
             *
             * @param {Date} date1 날짜1
             * @param {Date} date2 날짜2
             * @return {Boolean}
             */
            equalsYMH: function(a, b) {
                var ret = true;
                if (!a || !a.getDate || !b || !b.getDate) { return false; }
                each(['getFullYear', 'getMonth', 'getDate'], function(fn) {
                    ret = ret && (a[fn]() === b[fn]());
                    if (!ret) { return false; }
                });
                return ret;
            },

            /**
             * value날짜가 date이후인지 여부
             *
             * @param {Date} value 날짜
             * @param {Date} date
             * @return {Boolean}
             */
            isAfter: function (value, date) {
                return compare(value, date || new Date()) === 1;
            },

            /**
             * value날짜가 date이전인지 여부
             *
             * @param {Date} value 날짜
             * @param {Date} date
             * @return {Boolean}
             */
            isBefore: function (value, date) {
                return compare(value, date || new Date()) === -1;
            },

            /**
             * 주어진 날짜 형식의 문자열을 Date객체로 변환
             *
             * @function
             * @param {String} dateStringInRange 날짜 형식의 문자열
             * @return {Date}
             */
            parseDate: (function() {
                var isoExp = /^\s*(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?\s*$/;
                return function (dateStringInRange) {
                    var date, month, parts;

                    if (dateStringInRange instanceof Date) {
                        return dateStringInRange;
                    }

                    dateStringInRange = dateStringInRange.replace(/[^\d]+/g, '');
                    date = new Date(dateStringInRange);
                    if (!isNaN(date)) {
                        return date;
                    }

                    date = new Date(NaN);
                    parts = isoExp.exec(dateStringInRange);

                    if (parts) {
                        month = +parts[2];
                        date.setFullYear(parts[1]|0, month - 1, parts[3]|0);
                        date.setHours(parts[4]|0);
                        date.setMinutes(parts[5]|0);
                        date.setSeconds(parts[6]|0);
                        if (month != date.getMonth() + 1) {
                            date.setTime(NaN);
                        }
                    }
                    return date;
                };
            })(),

            /**
             * 주어진 년월의 일수를 반환
             *
             * @param {Number} year 년도
             * @param {Number} month 월
             * @return {Date}
             */
            daysInMonth: function(year, month) {
                var dd = new Date(year|0, month|0, 0);
                return dd.getDate();
            },

            /**
             * 주어진 시간이 현재부터 몇시간 이전인지 표현(예: -54000 -> 54초 이전)
             *
             * @function
             * @param {Date|Interval} time 시간
             * @return {String}
             *
             * @example
             * _core.date.prettyTimeDiff(new Date() - 51811); -> "52초 이전"
             */
            prettyTimeDiff: (function() {
                var ints = {
                    '초': 1,
                    '분': 60,
                    '시': 3600,
                    '일': 86400,
                    '주': 604800,
                    '월': 2592000,
                    '년': 31536000
                };

                return function(time) {

                    time = +new Date(time);

                    var gap = ((+new Date()) - time) / 1000,
                        amount, measure;

                    for (var i in ints) {
                        if (gap > ints[i]) { measure = i; }
                    }

                    amount = gap / ints[measure];
                    amount = gap > ints.day ? (Math.round(amount * 100) / 100) : Math.round(amount);
                    amount += measure + ' 이전';

                    return amount;
                };
            }()),
            /**
             * 주어진 시간이 현재부터 몇시간 이전인지 표현(예: -54000 -> 54초 이전)
             *
             * @function
             * @param {Date|Interval} time 시간
             * @return {String}
             *
             * @example
             * _core.date.timeDiff(new Date() - 51811); -> "00:00:52"
             */
            timeDiff: function(t1, t2) {
                var zeroPad = _core.number.zeroPad;
                var amount = (t1.getTime() - t2.getTime()) / 1000,
                    days = 0,
                    hours = 0,
                    mins = 0,
                    secs = 0;

                days=Math.floor(amount/86400);
                amount=amount%86400;
                hours=Math.floor(amount/3600);
                amount=amount%3600;
                mins=Math.floor(amount/60);
                amount=amount%60;
                secs=Math.floor(amount);

                return zeroPad(hours) + ':' + zeroPad(mins) + ':' + zeroPad(secs);
            }
        };
    });


    /**
     * prototype 을 이용한 클래스 생성
     * @namespace
     * @name _core.Class
     * @example
     * var Person = Class({
	*	$extend: Object, // 상속받을 부모클래스
	*	$singleton: true, // 싱글톤 여부
	*	$statics: { // 클래스 속성 및 함수 
	*		live: function() {} // Person.live(); 으로 호출
	*	}, 
	*	$mixins: [Animal, Robot], // 특정 클래스에서 메소드들을 빌려오고자 할 때 해당 클래스를 지정(다중으로도 가능),
	*	initialize: function(name) {
	*		this.name = name;
	*	},
	*	say: function(job) {
	*		alert("I'm Person: " + job);
	*	},
	*	run: function() {
	*		alert("i'm running...");
	*	}
	*`});
     *
     * var Man = Class({
	*	$extend: Person,
	*	initialize: function(name, age) {
	*		this.supr(name);  // Person(부모클래스)의 initialize메소드를 호출 or this.suprMethod('initialize', name);
	*		this.age = age;
	*	},
	*	// say를 오버라이딩함
	*	say: function(job) {
	*		this.suprMethod('say', 'programer'); // 부모클래스의 say 메소드 호출 - 첫번째인자는 메소드명, 두번째부터는 해당 메소드로 전달될 인자

	*		alert("I'm Man: "+ job);
	*	}
	* });
     * var man = new Man('kim', 20);
     * man.say('freeman');  // 결과: alert("I'm Person: programer"); alert("I'm Man: freeman");
     * man.run(); // 결과: alert("i'm running...");
     */


    _core.addon('Class', function () {
        var isFn = _core.isFunction,
            emptyFn = _core.emptyFn,
            include = _core.array.include,
            ignoreNames = ['superclass', 'members', 'statics'];


        // 부모클래스의 함수에 접근할 수 있도록 .supr 속성에 부모함수를 래핑하여 설정
        function wrap(k, fn, supr) {
            return function () {
                var tmp = this.supr, undef, ret;

                this.supr = supr.prototype[k];
                ret = undefined;
                try {
                    ret = fn.apply(this, arguments);
                } finally {
                    this.supr = tmp;
                }
                return ret;
            };
        }

        // 속성 중에 부모클래스에 똑같은 이름의 함수가 있을 경우 래핑처리
        function inherits(what, o, supr) {
            each(o, function(v, k) {
                what[k] = isFn(v) && isFn(supr.prototype[k]) ? wrap(k, v, supr) : v;
            });
        }

        /**
         * 클래스 정의
         *
         * @memberOf _core.Class
         *
         * @param {String} ns (Optional) 네임스페이스
         * @param {Object} attr 속성
         * @return {Class}
         */
        return function (attr) {
            var supr, statics, mixins, hooks, singleton, Parent, instance;

            if (isFn(attr)) {
                attr = attr();
            }

            // 생성자 몸체
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

            supr = attr.$extend || emptyFn;
            singleton = attr.$singleton || false;
            statics = attr.$statics || false;
            mixins = attr.$mixins || false;
            hooks = attr.$hooks || false;

            Parent = emptyFn;
            Parent.prototype = supr.prototype;

            Class.prototype = new Parent;
            Class.prototype.constructor = Class;

            /**
             * 메소드 내에서 부모클래스에 접근할 때 사용
             * @memberOf _core.Class
             * @property
             */
            Class.superclass = supr.prototype;
            Class.classType = Class;

            if (singleton) {
                /**
                 * 싱글톤 클래스일 경우 싱글톤 인스턴스를 반환
                 * @memberOf _core.Class
                 * @property
                 */
                Class.getInstance = function () {
                    if (!instance) {
                        instance = new Class();
                    }
                    return instance;
                };
            }

            /**
             * 부모클래스의 메소드를 호출할 수 있는 래핑함수
             * @memberOf _core.Class
             * @name suprMethod
             * @function
             * @param {String} name 호출하고자 하는 부모함수명
             * @return {Mix} 부모함수의 반환값
             * @example
             * this.suprMethod('show', true);  -> 부모클래스의 show(true) 메소드 호출
             */
            Class.prototype.suprMethod = function(name) {
                var args = arraySlice.call(arguments, 1);
                return supr.prototype[name].apply(this, args);
            };

            /**
             * func의 컨텍스트를 this로 지정
             * @memberOf _core.Class
             * @name proxy
             * @function
             * @param {function} function 함수
             * @return {Function}
             * @example
             * function test() {
			 *		alert(this.name);
			 * }
             * var Person = Class({
			 *		initialize: function() {
			 *			this.name = 'axl rose',
			 *			this.proxy(test)();  // = test.bind(this)와 동일, test함수의 컨텍스틑 this로 지정 -> 결과: alert('axl rose');
			 *		}
			 * });
             */
            Class.prototype.proxy = function (func) {
                var _this = this;
                return function () {
                    func.apply(_this, arraySlice.call(arguments));
                };
            };


            /**
             * 여러 클래스를 mixins방식으로 merge
             * @memberOf _core.Class
             * @name mixins
             * @function
             * @param {function} o 객체
             * @example
             * var A = Class({
			 *		funcA: function() { ... }
			 * });
             * var B = Class({
			 *		funcB: function() { ... }
			 * });
             * var Person = Class({
			 *		initialize: function() {
			 *			...
			 *		}
			 * });
             * Person.mixins([A, B]);
             * var person = new Person();
             * person.funcA();
             * person.funcB();
             */
            Class.mixins = function (o) {
                if (!o.push) { o = [o]; }
                var proto = this.prototype;
                each(o, function (value, index) {
                    each(value, function (item, key) {
                        proto[key] = item;
                    });
                });
            };
            mixins && Class.mixins.call(Class, mixins);


            /**
             * 클래스에 메소드  추가
             * @memberOf _core.Class
             * @name members
             * @function
             * @param {function} o 객체
             * @example
             * var Person = Class({
			 *		initialize: function() {
			 *			...
			 *		}
			 * });
             * Person.members({
			 *		newFunc: function() { ... }
			 * });
             * var person = new Person();
             * person.newFunc();
             */
            Class.members = function (o) {
                inherits(Class.prototype, o, supr);
            };
            attr && Class.members.call(Class, attr);

            /*
             * 클래스함수 추가함수
             * @memberOf _core.Class
             * @name statics
             * @function
             * @param {function} o 객체
             * @example
             * var Person = Class({
             *		initialize: function() {
             *			...
             *		}
             * });
             * Person.statics({
             *		staticFunc: function() { ... }
             * });
             * Person.staticFunc();
             */
            Class.statics = function (o) {
                o = o || {};
                for (var k in o) {
                    if (!include(ignoreNames, k)) {
                        Class[k] = o[k];
                    }
                }
                return Class;
            };
            Class.statics.call(Class, supr);
            statics && Class.statics.call(Class, statics);

            return Class;
        };
    });

    _core.addon( /** @lends _core */{
        /**
         * 설정 값들이 들어갈 리터럴
         *
         * @private
         * @type {Object}
         */
        configs: {},

        /**
         * 설정값을 꺼내오는 함수
         *
         * @param {String} name 설정명. `.`를 구분값으로 단계별로 값을 가져올 수 있다.
         * @param {Object} def (Optional) 설정된 값이 없을 경우 사용할 기본값
         * @return {Object} 설정값
         */
        getConfig: function (name, def) {
            var root = _core.configs,
                names = name.split('.'),
                pair = root;

            for (var i = 0, len = names.length; i < len; i++) {
                if (!(pair = pair[names[i]])) {
                    return def;
                }
            }
            return pair;
        },

        /**
         * 설정값을 지정하는 함수
         *
         * @param {String} name 설정명. `.`를 구분값으로 단계를 내려가서 설정할 수 있다.
         * @param {Object} value 설정값
         * @return {Object} 설정값
         */
        setConfig: function (name, value) {
            var root = _core.configs,
                names = name.split('.'),
                len = names.length,
                last = len - 1,
                pair = root;

            for (var i = 0; i < last; i++) {
                pair = pair[names[i]] || (pair[names[i]] = {});
            }
            return (pair[names[last]] = value);
        },

        /**
         * 템플릿 생성
         *
         * @param {String} text 템플릿 문자열
         * @param {Object} data 템플릿 문자열에서 변환될 데이타
         * @param {Object} settings 옵션
         * @return tempalte 함수
         *
         * @example
         * var tmpl = _core.template('&lt;span>&lt;%=name%>&lt;/span>');
         * var html = tmpl({name: 'Axl rose'}); => &lt;span>Axl rose&lt;/span>
         * $('div').html(html);
         */
        template: function (str, data) {
            var m,
                src = 'var __src = [], escapeHTML=_core.string.escapeHTML; with(value||{}) { __src.push("';
            str = $.trim(str);
            src += str.replace(/\r|\n|\t/g, " ")
                .replace(/<%(.*?)%>/g, function(a, b) { return '<%' + b.replace(/"/g, '\t') + '%>'; })
                .replace(/"/g, '\\"')
                .replace(/<%(.*?)%>/g, function(a, b) { return '<%' + b.replace(/\t/g, '"') + '%>'; })
                .replace(/<%=(.+?)%>/g, '", $1, "')
                .replace(/<%-(.+?)%>/g, '", escapeHTML($1), "')
                .replace(/(<%|%>)/g, function(a, b) { return b === '<%' ? '");' : '__src.push("'});

            src+='"); }; return __src.join("")';

            var f = new Function('value', 'data', src);
            if ( data ) {
                return f( data );
            }
            return f;
        }
    });


    /**
     * @namespace
     * @name _core.valid
     * @description 밸리데이션 함수 모음
     */
    _core.addon('valid', function () {
        var trim = $.trim,
            isString = _core.isString,
            isNumber = _core.isNumber,
            isElement = _core.isElement;

        return /** @lends _core.valid */{
            empty: _core.isEmpty,
            /**
             * 필수입력 체크
             *
             * @param {String} str
             * @return {Boolean} 빈값이면 false 반환
             */
            require: function (str) {
                isString(str) || (isElement(str) && (str = str.value));
                return !!str;
            },
            /**
             * 유효한 이메일형식인지 체크
             *
             * @param {String} str
             * @return {Boolean}
             */
            email: function (str) {
                isString(str) || (isElement(str) && (str = str.value));
                return (str = trim(str)) ? (/\w+([-+.]\w+)*@\w+([-.]\w+)*\.[a-zA-Z]{2,4}$/).test(str) : false;
            },
            /**
             * 한글인지 체크
             *
             * @param {String} str
             * @return {Boolean}
             */
            kor: function (str) {
                isString(str) || (isElement(str) && (str = str.value));
                return (str = trim(str)) ? (/^[가-힝]+$/).test(str) : false;
            },
            /**
             * 영문 체크
             *
             * @param {String} str
             * @return {Boolean}
             */
            eng: function (str) {
                isString(str) || (isElement(str) && (str = str.value));
                return (str = trim(str)) ? (/^[a-zA-Z]+$/).test(str) : false;
            },
            /**
             * 숫자 체크
             *
             * @param {String} str
             * @return {Boolean}
             */
            num: function (str) {
                isString(str) || (isElement(str) && (str = str.value));
                return (str = trim(str)) ? isNumber(str) : false;
            },
            /**
             * 유효한 url형식인지 체크
             *
             * @param {String} str
             * @return {Boolean}
             */
            url: function (str) {
                isString(str) || (isElement(str) && (str = str.value));
                return (str = trim(str)) ? (/^https?:\/\/([\w\-]+\.)+/).test(str) : false;
            },
            /**
             * 특수기호 유무 체크
             *
             * @param {String} str
             * @return {Boolean}
             */
            special: function (str) {
                isString(str) || (isElement(str) && (str = str.value));
                return (str = trim(str)) ? (/^[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]+$/).test(str) : false;
            },
            /**
             * 유효한 전화번호형식인지 체크
             *
             * @param {String} str
             * @return {Boolean}
             */
            phone: function (str) {
                isString(str) || (isElement(str) && (str = str.value));
                return (str = trim(str)) ? (/^\d{1,3}-\d{3,4}-\d{4}$/).test(str) : false;
            },
            /**
             * 유효한 yyyy-MM-dd형식인지 체크
             *
             * @param {String} str
             * @return {Boolean}
             */
            dateYMD: function (str) {
                isString(str) || (isElement(str) && (str = str.value));
                return (str = trim(str)) ? (/^\d{4}-\d{2}-\d{2}$/).test(str) : false;
            },
            /**
             * 유효한 yyyy-MM-dd hh:mm:ss형식인지 체크
             *
             * @param {String} str
             * @return {Boolean}
             */
            dateYMDHMS: function (str) {
                isString(str) || (isElement(str) && (str = str.value));
                return (str = trim(str)) ? (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/).test(str) : false;
            },
            /**
             * 유효한 주민번호인지 체크
             *
             * @param {String} strSsn1 앞주민번호.
             * @param {String} strSsn2 (Optional) 뒷주민번호. 값이 없으면 strSsn1만으로 체크
             * @return {Boolean}
             */
            SSN: function (sid1, sid2) {
                var num = sid1 + (sid2 ? sid2 : ""),
                    pattern = /^(\d{6})-?(\d{7})$/,
                    sum = 0,
                    last, mod,
                    bases = "234567892345";

                if (!pattern.test(num)) { return false; }
                num = RegExp.$1 + RegExp.$2;

                last = num.charCodeAt(12) - 0x30;

                for (var i = 0; i < 12; i++) {
                    if (isNaN(num.substring(i, i + 1))) { return false; }
                    sum += (num.charCodeAt(i) - 0x30) * (bases.charCodeAt(i) - 0x30);
                }
                mod = sum % 11;
                return ((11 - mod) % 10 === last) ? true : false;
            },
            /**
             * 유효한 외국인주민번호인지 체크
             *
             * @param {String} strSsn1 앞주민번호.
             * @param {String} strSsn2 (Optional) 뒷주민번호. 값이 없으면 strSsn1만으로 체크
             * @return {Boolean}
             */
            FgnSSN: function (sid1, sid2) {
                var num = sid1 + (sid2 ? sid2 : ""),
                    pattern = /^(\d{6})-?(\d{7})$/,
                    sum = 0,
                    odd, buf,
                    multipliers = "234567892345".split("");

                if (!pattern.test(num)) { return false; }
                num = RegExp.$1 + RegExp.$2;

                buf = _core.toArray(num);
                odd = buf[7] * 10 + buf[8];

                if (odd % 2 !== 0) { return false; }

                if ((buf[11] !== 6) && (buf[11] !== 7) && (buf[11] !== 9)) { return false; }

                for (var i = 0; i < 12; i++) { sum += (buf[i] *= multipliers[i]); }

                sum = 11 - (sum % 11);
                if (sum >= 10) { sum -= 10; }

                sum += 2;
                if (sum >= 10) { sum -= 10; }

                if (sum !== buf[12]) { return false; }

                return true;
            },


            run: function(frm, validators) {
                var isValid = true;
                each(validators, function(v, k) {

                });
                return isValid;
            }
        };
    });

    /**
     * @namespace
     * @name _core.css
     * @description 벤더별 css명칭 생성
     */
    _core.addon('css', function() {

        var _tmpDiv = _core.tmpNode,
            _prefixes = ['Webkit', 'Moz', 'O', 'ms', 'Khtml'],
            _style = _tmpDiv.style,
            _noReg = /^([0-9]+)[px]+$/,
            _vendor = (function () {
                var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
                    transform,
                    i = 0,
                    l = vendors.length;

                for ( ; i < l; i++ ) {
                    transform = vendors[i] + 'ransform';
                    if ( transform in _style ) return vendors[i].substr(0, vendors[i].length-1);
                }

                return false;
            })(),
            string  = _core.string;

        function prefixStyle(name) {
            if ( _vendor === false ) return false;
            if ( _vendor === '' ) return name;
            return _vendor + string.capitalize(name);
        }

        return /** @lends _core.css */{
            supportTransition: _vendor !== false,
            /**
             * 현재 브라우저의 css prefix명 (webkit or Moz or ms or O)
             * @function
             * @return {String}
             */
            vendor: _vendor,
            /**
             * 주어진 css속성을 지원하는지 체크
             *
             * @param {String} cssName 체크하고자 하는 css명
             * @return {Boolean} 지원여부
             */
            hasCSS3: function (name) {
                var a = _prefixes.length;
                if (name in _style) { return true; }
                name = string.capitalize(name);
                while (a--) {
                    if (_prefixes[a] + name in _style) {
                        return true;
                    }
                }
                return false;
            },

            /**
             * 주어진 css명 앞에 현재 브라우저에 해당하는 prefix를 붙여준다.
             *
             * @function
             * @param {String} cssName css명
             * @return {String}
             * @example
             * _core.css.prefixStyle('transition'); // => webkitTransition
             */
            prefixStyle: prefixStyle,
            get: function(el, style) {
                if (!el || !_core.is(el, 'element')) { return null; }
                var value;
                if (el.currentStyle) {
                    value = el.currentStyle[ string.camelize(style) ];
                } else {
                    value = window.getComputedStyle(el, null)[ string.camelize(style) ];
                }
                if(_noReg.test(value)) {
                    return parseInt(RegExp.$1, 10);
                }
                return value;
            }
        };
    });
    
    _core.addon('class', {
        has: function(el, c) {
            if (!el || !_core.is(el, 'element')) { return false; }
            var classes = el.className;
            if (!classes) { return false; }
            if (classes == c){ return true; }
            return classes.search("\\b" + c + "\\b") !== -1;
        },
        add: function(el, c) {
            if (!el || !_core.is(el, 'element')) { return; }
            if (this.has(el, c)) { return; }
            if (el.className) { c = " " + c; }
            return el.className += c, this;
        },
        remove: function(el, c) {
            if (!el || !_core.is(el, 'element')) { return; }
            return el.className = el.className.replace(new RegExp("\\b" + c + "\\b\\s*", "g"), ""), this;
        },
        replace: function(el, c, n) {
            if (!el || !_core.is(el, 'element')) { return null; }
            return this.remove(el, c), this.add(el, n), this;
        }
    });

    /**
     * el, 40, 50, top: function(f, t) { return 300-f*5 + 'px'; }
     */
    _core.addon('animate', function(el, frames, timePerFrame, animation, whendone) {
       var frame = 0,
           time = 0,
           isPause = false,
           intervalId = setInterval(displayNextFrame, timePerFrame);

        function displayNextFrame () {
            if (!isPause && frame >= frames) {
                clearInterval(intervalId);
                if (whendone) {
                    whendone(el);
                }

                each(animation, function(cssprop) {
                    try {
                        el.style[ cssprop ] = animation[ cssprop ](frame, time);
                    } catch(e) {}
                });
                frame += 1;
                time += timePerFrame;
            }
        }

        return {
            stop: function() {
                clearInterval(intervalId), intervalId = null;
            },
            pause: function() {
                isPause = true;
            },
            resume: function() {
                isPause = false;
            }
        }
    }, false);

    /**
     * @namespace
     * @name _core.util
     */
    _core.addon('util', function() {

        return /** @lends _core.util */{
            /**
             * png Fix
             */
            pngFix: function () {
                var s, bg;
                $('img[@src*=".png"]', document.body).each(function () {
                    this.css('filter', 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src=\'' + this.src + '\', sizingMethod=\'\')');
                    this.src = _core.getSite() + _core.Urls.getBlankImage() || '/resource/images/_core/blank.gif';
                });
                $('.pngfix', document.body).each(function () {
                    var $this = $(this);

                    s = $this.css('background-image');
                    if (s && /\.(png)/i.test(s)) {
                        bg = /url\("(.*)"\)/.exec(s)[1];
                        $this.css('background-image', 'none');
                        $this.css('filter', "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + bg + "',sizingMethod='scale')");
                    }
                });
            },

            /**
             * 페이지에 존재하는 플래쉬의 wmode모드를 opaque로 변경
             */
            wmode: function () {
                $('object').each(function () {
                    var $this;
                    if (this.classid.toLowerCase() === 'clsid:d27cdb6e-ae6d-11cf-96b8-444553540000' || this.type.toLowerCase() === 'application/x-shockwave-flash') {
                        if (!this.wmode || this.wmode.toLowerCase() === 'window') {
                            this.wmode = 'opaque';
                            $this = $(this);
                            if (typeof this.outerHTML === 'undefined') {
                                $this.replaceWith($this.clone(true));
                            } else {
                                this.outerHTML = this.outerHTML;
                            }
                        }
                    }
                });
                $('embed[type="application/x-shockwave-flash"]').each(function () {
                    var $this = $(this),
                        wm = $this.attr('wmode');
                    if (!wm || wm.toLowerCase() === 'window') {
                        $this.attr('wmode', 'opaque');
                        if (typeof this.outerHTML === 'undefined') {
                            $this.replaceWith($this.clone(true));
                        } else {
                            this.outerHTML = this.outerHTML;
                        }
                    }
                });
            },

            /**
             * 팝업. (_core.openPopup으로도 사용가능)
             * @param {string} url 주소
             * @param {number=} width 너비.
             * @param {number=} height 높이.
             * @param {opts=} 팝업 창 모양 제어 옵션.
             */
            openPopup: function (url, width, height, opts) {
                opts = extend({

                }, opts);
                width = width || 600;
                height = height || 400;
                //var winCoords = _core.util.popupCoords(width, height),
                var target = opts.target || '',
                    feature = 'app_, ',
                    tmp = [];

                delete opts.name;
                for(var key in opts) {
                    tmp.push(key + '=' + opts[ key ]);
                }
                _core.browser.isSafari && tmp.push('location=yes');
                tmp.push('height='+height);
                tmp.push('width='+width);
                /* + ', top=' + winCoords.top + ', left=' + winCoords.left;*/
                feature += tmp.join(', ');

                window.open(
                    url,
                    target,
                    feature
                );
            },

            /**
             * 팝업의 사이즈를 $el 사이즈에 맞게 조절
             */
            resizePopup: function($el) {
                if (!($el instanceof jQuery)) { $el = $($el); }
                window.resizeTo($el.width(), $el.height());
            },

            /**
             * 팝업의 사이즈에 따른 화면상의 중앙 위치좌표를 반환
             * @param {number} w 너비.
             * @param {number} h 높이.
             * @return {JSON} {left: 값, top: 값}
             */
            popupCoords: function (w, h) {
                var wLeft = window.screenLeft ? window.screenLeft : window.screenX,
                    wTop = window.screenTop ? window.screenTop : window.screenY,
                    wWidth = window.outerWidth ? window.outerWidth : document.documentElement.clientWidth,
                    wHeight = window.outerHeight ? window.outerHeight : document.documentElement.clientHeight;

                return {
                    left: wLeft + (wWidth / 2) - (w / 2),
                    top: wTop + (wHeight / 2) - (h / 2) - 25
                };
            },

            /**
             * data-src에 있는 이미지주소를 실제로 불러들인 다음, 주어진 사이즈내에서 자동으로 리사이징 처리
             * @param {jQuery} $imgs
             * @param {Number} wrapWidth 최대 너비 값
             * @param {Number} wrapHeight 최대 높이 값
             * @param {Function} [onError] (optional) 이미지를 불어오지 못했을 경우 실행할 콜백함수
             * @return {Boolean} true 불러들인 이미지가 있었는지 여부
             */
            lazyLoadImage: function ($imgs, wrapWidth, wrapHeight, onError) {
                var hasLazyImage = false;
                var dataSrcAttr = 'data-src';

                $imgs.filter('img[data-src]').each(function(i) {
                    var $img = $(this);
                    wrapWidth = wrapWidth || $img.parent().width();
                    wrapHeight = wrapHeight || $img.parent().height();

                    // 이미지가 로드되면, 실제 사이즈를 체크해서 가로이미지인지 세로이미지인지에 따라 기준이 되는 width, height에 지정한다.
                    $img.one('load', function() {
                        $img.removeAttr('width height').css({'width':'auto', 'height':'auto'});
                        if ($img.attr('data-no-height') === 'true' && this.width > wrapWidth) {
                            $img.css('width', wrapWidth);
                        } else if ($img.attr('data-no-width') === 'true' && this.height > wrapHeight) {
                            $img.css('height', wrapWidth);
                        } else {
                            var isHoriz = this.width > this.height;
                            if ( isHoriz ) { // 가로로 긴 이미지
                                $img.css('width', Math.min(this.width, wrapWidth));
                            } else { // 세로로 긴 이미지
                                $img.css('height', Math.min(this.height, wrapHeight));
                            }
                        }
                    }).attr('src', $img.attr('data-src')).removeAttr('data-src');
                });
                return hasLazyImage;
            },

            /**
             * 도큐먼트의 높이를 반환
             * @return {Number}
             */
            getDocHeight: function() {
                var doc = document,
                    bd = doc.body,
                    de = doc.documentElement;

                return Math.max(
                    Math.max(bd.scrollHeight, de.scrollHeight),
                    Math.max(bd.offsetHeight, de.offsetHeight),
                    Math.max(bd.clientHeight, de.clientHeight)
                );
            },

            /**
             * 도큐먼트의 너비를 반환
             * @return {Number}
             */
            getDocWidth: function() {
                var doc = document,
                    bd = doc.body,
                    de = doc.documentElement;
                return Math.max(
                    Math.max(bd.scrollWidth, de.scrollWidth),
                    Math.max(bd.offsetWidth, de.offsetWidth),
                    Math.max(bd.clientWidth, de.clientWidth)
                );
            },

            /**
             * 창의 너비를 반환
             * @return {Number}
             */
            getWinWidth : function() {
                var w = 0;
                if (self.innerWidth) {
                    w = self.innerWidth;
                } else if (document.documentElement && document.documentElement.clientHeight) {
                    w = document.documentElement.clientWidth;
                } else if (document.body) {
                    w = document.body.clientWidth;
                }
                return w;
            },

            /**
             * 창의 높이를 반환
             * @return {Number}
             */
            getWinHeight : function() {
                var w = 0;
                if (self.innerHeight) {
                    w = self.innerHeight;
                } else if (document.documentElement && document.documentElement.clientHeight) {
                    w = document.documentElement.clientHeight;
                } else if (document.body) {
                    w = document.body.clientHeight;
                }
                return w;
            }
        };
    });
    _core.openPopup = _core.util.openPopup;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    var $win = _core.$win,
        $doc = _core.$doc,
        Class = _core.Class,
        dateUtil = _core.date,
        stringUtil = _core.string,
        numberUtil = _core.number,
        View;		// ui.View

    _core.addon('Handler', function(){

        return Class({
            initialize: function(el) {
                if (!_core.is(el, 'element')) { return null; }

                this.el = el;
            },
            on: document.addEventListener ? function(eventType, handler) {
                this.el.addEventListener(eventType, handler, false);
            } : function(eventType, handler) {
                if(this._find(eventType, handler) != -1) { return; }

                var elemement = this.el;
                var wrappedHandler = function(e) {
                    e = e || window.event;

                    var event = {
                        originalEvent: e,
                        type: e.type,
                        target: e.srcElement,
                        currentTarget: this.el,
                        relatedTarget: e.fromElement ? e.fromElement : e.toElement,
                        eventPhase: (e.srcElement == this.el) ? 2 : 3,
                        clientX: e.clientX, clientY: e.clientY,
                        screenX: e.screenX, screenY: e.screenY,
                        altKey: e.altKey, ctrlKey: e.ctrlKey,
                        shiftKey: e.shiftKey, charCode: e.keyCode, which: e.keyCode,
                        stopPropagation: function(){ this.originalEvent.cancelBubble = true; },
                        preventDefault: function(){ this.originalEvent.returnValue = false;},
                        isDefaultPrevented: function(){ return this.originalEvent.returnValue == false; }
                    };
                    if (Function.prototype.bind) {
                        handler.call(this.el, event);
                    } else {
                        this.el._currentHandler = handler;
                        this.el._currentHandler(event);
                        this.el._currentHandler = null, delete el._currentHandler;
                    }
                };
                this.el.attachEvent("on" + eventType, wrappedHandler);

                var h = {
                    element: this.el,
                    eventType: eventType,
                    handler:handler,
                    wrappedHandler: wrappedHandler
                };
                var d = elemement.document || elemement;
                var w = d.parentWindow;
                var id = this.cid;

                (w._allHandlers || (w._allHandlers = {}))[id] = h;
                (elemement._handlers || (elemement._handlers = [])).push(id);
                if (!w._onunlodHandlerRegistered) {
                    w._onunloadHandlerRegistered = true;
                    w.attachEvent('onunload', this._removeAllHandlers);
                }
            },

            off: function(eventType, handler) {
                var i = this._find(eventType, handler);
                if (i === -1) { return; }

                var element = this.el,
                    d = element.document || element,
                    w = d.parentWindow,
                    handlerId = element._handlers[i],
                    h = w._allHandlers[handlerId];

                element.detachEvent("on" + eventType, h.wrappedHandler);
                element._handlers.splice(i, 1);
                delete  w._allHandlers[handlerId];
            },

            _find: function(eventType, handler) {
                var element = this.el,
                    handlers = element._handlers,
                    d, w;
                if(!handlers) { return -1; }

                d = element.document || element;
                w = d.parentWindow;

                for(var i = handlers.length - 1; i >= 0; i--) {
                    var handlerId = handlers[i];
                    var h = w._allHandlers[handlerId];
                    if (h.eventType == eventType && h.handler == handler) {
                        return i;
                    }
                }
                return -1;
            },

            _removeAllHandlers: function() {
                var w = this;
                for(var id in w._allHandlers) {
                    var h = w._allHandlers[id];
                    h.element.detachEvent("on" + h.eventType, h.wrappedHandler);
                    delete w._allHandlers[id];
                }
            }

        });
    });

    /*
     * @namespace
     * @name _core.EVENTS
     */
    _core.addon('EVENTS', {
        ON_BEFORE_SHOW: 'beforeshow',
        ON_SHOW: 'show',
        ON_BEFORE_HIDE: 'beforehide',
        ON_HIDE: 'hide'
    });


    _core.addon( /** @lends _core */{
        /**
         * 작성된 클래스를 jQuery의 플러그인으로 사용할 수 있도록 바인딩시켜 주는 함수
         *
         * @param {Class} klass 클래스
         * @param {String} name 플러그인명
         *
         * @example
         * // 클래스 정의
         * var Slider = _core.Class({
		 *   initialize: function(el, options) { // 생성자의 형식을 반드시 지킬 것..(첫번째 인수: 대상 엘리먼트, 두번째
		 *   인수: 옵션값들)
		 *   ...
		 *   },
		 *   ...
		 * });
         * _core.bindjQuery(Slider, 'hibSlider');
         * // 실제 사용시
         * $('#slider').hibSlider({count: 10});
         */
        bindjQuery: function (Klass, name) {
            var old = $.fn[name];

            $.fn[name] = function (options) {
                var a = arguments,
                    args = arraySlice.call(a, 1),
                    me = this,
                    returnValue = this;

                this.each(function() {
                    var $this = $(this),
                        methodValue,
                        instance;

                    if ( !(instance = $this.data(name)) || (a.length === 1 && typeof options !== 'string')) {
                        instance && (instance.destroy(), instance = null);
                        $this.data(name, (instance = new Klass(this, extend({}, $this.data(), options), me)));
                    }

                    if (typeof options === 'string' && _core.is(instance[options], 'function')) {
                        try {
                            methodValue = instance[options].apply(instance, args);
                        } catch(e) {
                            console.log('[jQuery bind error] ' + e);
                        }

                        if (/*methodValue !== instance && */methodValue !== undefined) {
                            returnValue = methodValue;
                            return false;
                        }
                    }
                });
                return returnValue;
            };

            // 기존의 모듈로 복구
            $.fn[name].noConflict = function() {
                $.fn[name] = old;
                return this;
            };
        }
    });


    _core.addon('Listener', function () {
        /**
         * 이벤트 리스너
         * @class
         * @name _core.Listener
         */
        var Listener = Class( /** @lends _core.Listener# */ {
            /**
             * 생성자
             */
            initialize: function () {
                this._listeners = $({});
            },

            /**
             * 이벤트 핸들러 등록
             * @param {Object} name 이벤트명
             * @param {Object} cb 핸들러
             */
            on: function () {
                var lsn = this._listeners;
                lsn.on.apply(lsn, arguments);
                return this;
            },

            /**
             * 한번만 실행할 이벤트 핸들러 등록
             * @param {Object} name 이벤트명
             * @param {Object} cb 핸들러
             */
            once: function () {
                var lsn = this._listeners;
                lsn.once.apply(lsn, arguments);
                return this;
            },

            /**
             * 이벤트 핸들러 삭제
             * @param {Object} name 삭제할 이벤트명
             * @param {Object} cb (Optional) 삭제할 핸들러. 이 인자가 없을 경우 name에 등록된 모든 핸들러를 삭제.
             */
            off: function () {
                var lsn = this._listeners;
                lsn.off.apply(lsn, arguments);
                return this;
            },

            /**
             * 이벤트 발생
             * @param {Object} name 발생시킬 이벤트명
             */
            trigger: function () {
                var lsn = this._listeners;
                lsn.trigger.apply(lsn, arguments);
                return this;
            }
        });

        return Listener;
    });


    /**
     * @namespace
     * @name _core.PubSub
     * @description 발행/구독 객체: 상태변화를 관찰하는 옵저버(핸들러)를 등록하여, 상태변화가 있을 때마다 옵저버를 발행(실행)
     * 하도록 하는 객체이다.
     * @example
     * // 옵저버 등록
     * _core.PubSub.on('customevent', function() {
	 *	 alert('안녕하세요');
	 * });
     *
     * // 등록된 옵저버 실행
     * _core.PubSub.trigger('customevent');
     */
    _core.addon('PubSub', function () {

        var PubSub = new _core.Listener();
        PubSub.attach = PubSub.on;
        PubSub.unattach = PubSub.off;

        return PubSub;
    });

    /**
     *
     * @param name
     * @param attr
     * @returns {*}
     */
    _core.ui = function(/*String*/name, /*Object*/attr) {
        var bindName = attr.bindjQuery,
            Klass;

        delete attr.bindjQuery;

        _core.extend(attr, {
            $extend: _core.ui.View,
            name: name
        });

         _core.addon('views.' + name, (Klass = _core.Class(attr)));
        if (bindName) {
            _core.bindjQuery(Klass, bindName);
        }
        return Klass;
    };


    /**
     * @namespace
     * @name _core.ui
     */
    View = _core.addon('ui.View', function () {
        var isFn = _core.isFunction,
            execObject = function(obj, ctx) {
                return isFn(obj) ? obj.call(ctx) : obj;
            };

        /**
         * 모든 UI요소 클래스의 최상위 클래스로써, UI클래스를 작성함에 있어서 편리한 기능을 제공해준다.
         * @class
         * @name _core.ui.View
         *
         * @example
         *
         * var Slider = Class({
		 *		$extend: _core.ui.View,
		 *		// 기능1) events 속성을 통해 이벤트핸들러를 일괄 등록할 수 있다. ('이벤트명 selector': '핸들러함수명')
		 *	events: {
		 *		click ul>li.item': 'onItemClick',		// this.$el.on('click', 'ul>li.item', this.onItemClick.bind(this)); 를 자동 수행
		 *		'mouseenter ul>li.item>a': 'onMouseEnter'	// this.$el.on('mouseenter', 'ul>li.item>a', this.onMouseEnter.bind(this)); 를 자동 수행
		 *	},
		 *	// 기능2) selectors 속성을 통해 지정한 selector에 해당하는 노드를 주어진 이름의 멤버변수에 자동으로 설정해 준다.
		 *	selectors: {
		 *		box: 'ul',			// this.$box = this.$el.find('ul') 를 자동수행
		 *		items: 'ul>li.item',	// this.$items = this.$el.find('ul>li.item') 를 자동수행
		 *		prevBtn: 'button.prev', // this.$prevBtn = this.$el.find('button.prev') 를 자동 수행
		 *		nextBtn: 'button..next' // this.$nextBtn = this.$el.find('button.next') 를 자동 수행
		 *	},
		 *	initialize: function(el, options) {
		 *	this.supr(el, options);	// 기능4) this.$el, this.options가 자동으로 설정된다.
		 *	},
		 *	onItemClick: function(e) {
		 *		...
		 *	},
		 *	onMouseEnter: function(e) {
		 *		...
		 *	}
		 * });
         *
         * new _core.ui.Slider('#slider', {count: 10});
         */
        var View = Class(/** @lends _core.ui.View# */{
            $statics: {
                _instances: [] // 모든 인스턴스를 갖고 있는다..
            },
            /**
             * 생성자
             * @param {String|Element|jQuery} el 해당 엘리먼트(노드, id, jQuery 어떤 형식이든 상관없다)
             * @param {Object} options 옵션값
             * @return {Mixes} false 가 반환되면, 이미 해당 엘리먼트에 해당 모듈이 빌드되어 있거나 disabled 상태임을 의미한다.
             */
            initialize: function (el, options) {
                options || (options = {});

                var me = this,
                    eventPattern = /^([a-z]+) ?([^$]*)$/i,
                    moduleName, superClass;

                if (!me.name) {
                    throw new Error('클래스의 이름이 없습니다');
                }

                moduleName = me.moduleName = _core.string.toFirstLower(me.name);
                me.$el = el instanceof jQuery ? el : $(el);

                // 강제로 리빌드 시킬 것인가 /////////////////////////////////////////////////////////////////////////////////////////////////
                if (options.rebuild === true) {
                    try { me.$el.data(moduleName).destroy(); } catch(e) {}
                    me.$el.removeData(moduleName);
                } else {
                    // 이미 빌드된거면 false 반환 - 중복 빌드 방지
                    if (me.$el.data(moduleName) ) {
                        return false;
                    }
                    me.$el.data(moduleName, this);
                }
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                // disabled상태면 false 반환
                if (me.$el.hasClass('disabled') || me.$el.attr('data-readony') === 'true' || me.$el.attr('data-disabled') === 'true') {
                    return false;
                }

                View._instances.push(me);
                superClass = me.constructor.superclass;
                me.el = me.$el[0];													// 원래 엘리먼트도 변수에 설정
                me.options = _core.extend({}, superClass.defaults, me.defaults, me.$el.data(), options);			// 옵션 병합
                me.cid = me.moduleName + '_' + _core.nextSeq();					// 객체 고유 키
                me.subViews = {};														// 하위 컨트롤를 관리하기 위함
                me._eventNamespace = '.' + me.cid;	// 객체 고유 이벤트 네임스페이스명

                me.updateSelectors();
		
                // events 속성 처리
                // events: {
                //	'click ul>li.item': 'onItemClick', //=> this.$el.on('click', 'ul>li.item', this.onItemClick); 으로 변환
                // }
                me.options.events = _core.extend({},
                    execObject(me.events, me),
                    execObject(me.options.events, me));
                _core.each(me.options.events, function (value, key) {
                    if (!eventPattern.test(key)) { return false; }

                    var name = RegExp.$1,
                        selector = RegExp.$2,
                        args = [name],
                        func = isFn(value) ? value : (isFn(me[value]) ? me[value] : _core.emptyFn);

                    if (selector) { args[args.length] = $.trim(selector); }

                    args[args.length] = function () {
                        func.apply(me, arguments);
                    };
                    me.on.apply(me, args);
                });

                // options.on에 지정한 이벤트들을 클래스에 바인딩
                _core.each(me.options.on || {}, function (value, key) {
                    me.on(key, value);
                });
                ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            },

            /**
             * this.selectors를 기반으로 엘리먼트를 조회해서 멤버변수에 겍팅
             * @returns {_core.ui.View}
             */
            updateSelectors: function () {
                var me = this;
                // selectors 속성 처리
                // selectors: {
                //  box: 'ul',			// => this.$box = this.$el.find('ul');
                //  items: 'ul>li.item'  // => this.$items = this.$el.find('ul>li.item');
                // }
                me.options.selectors = _core.extend({},
                    execObject(me.constructor.superclass.selectors, me),
                    execObject(me.selectors, me),
                    execObject(me.options.selectors, me));
                _core.each(me.options.selectors, function (value, key) {
                    if (typeof value === 'string') {
                        me['$' + key] = me.$el.find(value);
                    } else if (value instanceof jQuery) {
                        me['$' + key] = value;
                    } else {
                        me['$' + key] = $(value);
                    }
                    me.subViews['$' + key] = me['$' + key];
                });
                ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                return me;                
            },

            /**
             * this.$el하위에 있는 엘리먼트를 조회
             * @param {String} selector 셀렉터
             * @returns {jQuery}
             */
            $: function (selector) {
                return this.$el.find(selector);
            },

            /**
             * 파괴자
             */
            destroy: function () {
                var me = this;

                me.$el.off(me._eventNamespace);

                // me.subviews에 등록된 자식들의 파괴자 호출
                _core.each(me.subViews, function(item, key) {
                    if (key.substr(0, 1) === '$') {
                        item.off(me._eventNamespace);
                    } else {
                        item.destroy && item.destroy();
                    }
                });
            },

            /**
             * 옵션 설정함수
             *
             * @param {String} name 옵션명
             * @param {Mixed} value 옵션값
             */
            setOption: function(name, value) {
                this.options[name] = value;
            },

            /**
             * 옵션값 반환함수
             *
             * @param {String} name 옵션명
             * @param {Mixed} def 옵션값이 없을 경우 기본값
             * @return {Mixed} 옵션값
             */
            getOption: function(name, def) {
                return (name in this.options && this.options[name]) || def;
            },

            /**
             * 인자수에 따라 옵션값을 설정하거나 반환해주는 함수
             *
             * @param {String} name 옵션명
             * @param {Mixed} value (Optional) 옵션값: 없을 경우 name에 해당하는 값을 반환
             * @return {Mixed}
             * @example
             * $('...').tabs('option', 'startIndex', 2);
             */
            option: function(name, value) {
                if (typeof value === 'undefined') {
                    return this.getOption(name);
                } else {
                    this.setOption(name, value);
                    this.triggerHandler('optionchange', [name, value]);
                }
            },

            /**
             * 이벤트명에 현재 클래스 고유의 네임스페이스를 붙여서 반환 (ex: 'click mousedown' -> 'click.MyClassName mousedown.MyClassName')
             * @private
             * @param {String} eventNames 네임스페이스가 없는 이벤트명
             * @return {String} 네임스페이스가 붙어진 이벤트명
             */
            _normalizeEventNamespace: function(eventNames) {
                if (eventNames instanceof $.Event) {
                    return eventNames;
                }

                var me = this,
                    m = (eventNames || "").split( /\s/ );
                if (!m || !m.length) {
                    return eventNames;
                }

                var name, tmp = [], i;
                for(i = -1; name = m[++i]; ) {
                    if (name.indexOf('.') === -1) {
                        tmp.push(name + me._eventNamespace);
                    } else {
                        tmp.push(name);
                    }
                }
                return tmp.join(' ');
            },

            /**
             * 현재 클래스의 이벤트네임스페이스를 반환
             * @return {String} 이벤트 네임스페이스
             */
            getEventNamespace: function() {
                return this._eventNamespace;
            },


            /**
             * me.$el에 이벤트를 바인딩
             */
            on: function() {
                var args = arraySlice.call(arguments);
                args[0] = this._normalizeEventNamespace(args[0]);

                this.$el.on.apply(this.$el, args);
                return this;
            },

            /**
             * me.$el에 등록된 이벤트를 언바인딩
             */
            off: function() {
                var args = arraySlice.call(arguments);
                this.$el.off.apply(this.$el, args);
                return this;
            },

            /**
             * me.$el에 일회용 이벤트를 바인딩
             */
            one: function() {
                var args = arraySlice.call(arguments);
                args[0] = this._normalizeEventNamespace(args[0]);

                this.$el.one.apply(this.$el, args);
                return this;
            },

            /**
             * me.$el에 등록된 이벤트를 실행
             */
            trigger: function() {
                var args = arraySlice.call(arguments);
                this.$el.trigger.apply(this.$el, args);
                return this;
            },

            /**
             * me.$el에 등록된 이벤트 핸들러를 실행
             */
            triggerHandler: function() {
                var args = arraySlice.call(arguments);
                this.$el.triggerHandler.apply(this.$el, args);
                return this;
            },

            /**
             * 해당 엘리먼트에 바인딩된 클래스 인스턴스를 반환
             * @return {Class}
             * @example
             * var tabs = $('div').Tabs('instance');
             */
            instance: function() {
                return this;
            },

            /**
             * 해당 클래스의 소속 엘리먼트를 반환
             * @return {jQuery}
             */
            getElement: function() {
                return this.$el;
            }
        });

        return View;
    });


})(window, jQuery, window.jsa);

(function($, jsa, ui, undefined) {
    var $win = jsa.$win,
        $doc = jsa.$doc;

})(jQuery, window.jsa, window.jsa.ui);
