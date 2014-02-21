/*!
 * Parallax Scroller
 * 
 * @author 김승일
 * @version 1.0(2013-03-11) 최초 생성
 */
(function( $ ) {
	"use strict";
	
	// ======================================== //
	// 익명함수내 전역 변수						//
	// ======================================== //
	var $WINDOW = $( window ),
		REGEXP_FRAME = /\b[^{]+\s*{.*?}/gi, // 각 프레임
		REGEXP_PARTS = /([0-9%px\s,]+)(?:\[(.+?)\])*\s*\{(.*?)\}/, // 프레임에서 key frame, easing, style 분리
		REGEXP_STYLE = /\s*([a-z\-]+)(?:\[([a-z\-]+)\])*\s*:\s*([^px|%]+?)([px|%]*)\s*(?:;|$)/gi; // style 파싱
	
	
	// ======================================== //
	// 유틸 메서드								//
	// ======================================== //
	/**
	 * <pre>
	 * 반복처리 함수
	 * </pre>
	 * 
	 * @function
	 * @param obj {Array, JSON} 배열 혹은 JSON객체
	 * @param fn {Function} 콜백함수
	 */
	function each( obj, fn ) {
		var hasProp = Object.prototype.hasOwnProperty;
		
		if ( obj.push ) {
			for ( var i = 0, ln = obj.length; i < ln; i++ ) {
				if ( fn.call( obj, obj[ i ], i ) === false ) return false;
			}
		} else {
			for ( var k in obj ) {
				if ( hasProp.call( obj, k ) ) {
					if ( fn.call( obj, obj[ k ], k ) === false ) return false;
				}
			}
		}
	}
	
	/**
	 * <pre>
	 * 속성복사 함수
	 * </pre>
	 * 
	 * @function 
	 * @param src {JSON}
	 * @param dest {JSON}
	 */
	function extend () {
	    var args = [].slice.call( arguments ),
	        src = args.shift(),
	        over = args[ args.length - 1 ] === false ? args.pop() : true,
	        obj,
	        hasProp = Object.prototype.hasOwnProperty;
	    
	    while ( obj = args.shift() ) {
	        for( var name in obj ){
	        	if ( ! hasProp.call( obj, name ) || ( !over && ( name in src ) ) ) { continue; }
	            	src[ name ] = obj[ name ];
	        }
	    }
	    
	    return src;
	}
	
	/**
	 * <pre>
	 * ???
	 * </pre>
	 * 
	 * @function
	 * @param c {JSON}
	 * @param d {JSON}
	 */
	function getNumberValue( c, d ) {
		var r;
		if ( c && ( r = c.value ) ) return r | 0;
		if ( d && ( r = d.value ) ) return r | 0;
		return 0;
	};
	
	function calcPercentValue( r, n, v ) {
		switch ( n ) {
		case 'top':
			return $( r ).height() * v / 100;
		};
	};
	
	// ======================================== //
	// RequestAnimationFrame 메서드 지원			//
	// ======================================== //
	if ( ! window.requestAnimationFrame ) {
		window.requestAnimationFrame = (function() {
			var lastTime = 0;
			
			return window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				function( callback ) {
					var currTime = +new Date,
						timeToCall = Math.max( 0, 30 - ( currTime - lastTime ) );
	
					window.setTimeout(function() {
						callback( currTime + timeToCall );
					}, timeToCall);
	
					lastTime = currTime + timeToCall;
				};
		})();
	}
	
	// ======================================== //
	// 이벤트 리스너								//
	// ======================================== //
	/**
	 * <pre>
	 * 이벤트 리스너 클래스
	 * </pre>
	 * 
	 * @class
	 * @name EventListener
	 * @constructor
	 */
	function EventListener() {
		this._listeners = {};
	}

	/** @lends EventListener.prototype */
	extend(EventListener.prototype, {
		/** @constructs */
		constructor: EventListener,

		/**
		 * <pre>
		 * 이벤트 핸들러를 등록
		 * </pre>
		 * 
		 * @function
		 * @param {String} name 이벤트 이름
		 * @param {Function} handler 핸들러 함수
		 */
		on: function( name, handler ) {
			( this._listeners[ name ] || ( this._listeners[ name ] = [] ) ).push( handler );
		},

		/**
		 * <pre>
		 * 이벤트 핸들러를 제거
		 * </pre>
		 * 
		 * @function
		 * @param {String} name 이벤트 이름
		 * @param {Function} [handler] 핸들러 함수
		 */
		off: function( name, handler ) {
			if ( ! handler ) {
				delete this._listeners[ name ];
				return;
			}

			each( this._listeners[ name ], function( value, key ) {
				if ( handler === value ) {
					delete this[ key ];
					return false;
				}
			});
		},

		/**
		 * <pre>
		 * 이벤트 핸들러를 실행
		 * </pre>
		 * 
		 * @function
		 * @param {String} name 이벤트 이름
		 * @param {Array} args 핸들러함수에 넘길 인자들
		 */
		trigger: function( name, args ) {
			var self = this;
			
			if ( ! ( name in this._listeners ) ) {
				return;
			}
			
			each( self._listeners[ name ], function( fn, i ) {
				fn.apply( self, args );
			});
		}
	});
	
	// ======================================== //
	// 모듈 생성자								//
	// ======================================== //
	/**
	 * <pre>
	 * 패럴럭스 스크롤러 클래스
	 * </pre>
	 * 
	 * @class
	 * @name ParallaxScroller
	 * @constructor
	 * @param {Object} [options] 옵션 객체
	 * @param {String} [options.containerSelector=#wrap] 컨테이너 셀렉터
	 * @param {String} [options.itemSelector=.kfa-item] 아이템 셀렉터
	 * @param {String} [options.framesAttribute=data-kfa-frames] 프레임 속성 이름
	 * @param {String} [options.easingAttribute=data-kfa-easing] 이징 속성 이름
	 * @param {Number} [options.scrollSpeed=0.15] 스크롤 속도
	 * @param {Boolean} [options.autoStart=false] 자동 시작 여부
	 */
	function ParallaxScroller( options ) {
		// 옵션 확장
  		var opts = this.options = $.extend({
  			containerSelector: '#wrap',
  			itemSelector: '.kfa-item',
  			framesAttribute: 'data-kfa-frames',
  			easingAttribute: 'data-kfa-easing',
  			scrollSpeed: 0.15,
  			autoStart: false
  		}, options);

  		// 멤버 변수
  		this.$container = $( opts.containerSelector );
  		this.$items = this.$container.find( opts.itemSelector );
  		this.scrollTop = 1;
  		this.beforeScrollTop = -1;
  		this.smoothSrollTop = 1;
  		this.data = [];

  		// 실행 준비
  		this._cacheData();
  		this._bindEvents();

  		// 시작
  		opts.autoStart && this.start();
	};
	
	// ======================================== //
	// 모듈 정적 메서드							//
	// ======================================== //
	/** @lends ParallaxScroller */
	extend(ParallaxScroller, {
		/* inherit EventListener */
		prototype: new EventListener,

		/* static properties */
		animStyles: {
			/**
			 * <pre>
			 * 두 프레임간의 투명도 계산
			 * </pre>
			 * 
			 * @function
			 * @param {jQuery} $target 대상 jQuery 객체
			 * @param {JSON} prevStyle 이전프레임의 스타일
			 * @param {JSON} currStyle 현재프레임의 스타일
			 * @param {Float} per 두 프레임 사이에 위치한 스크롤의 위치값 비율
			 * @return {JSON} 계산된 스타일값
			 */
			opacity: function( $target, prevStyle, currStyle, per ) {
				var n = getNumberValue,
					curr = n( currStyle.opacity ),
					prev = n( prevStyle.opacity ),
					doa = ( curr - prev ),
					cssObj = {};
				
				if ( doa != 0 ) {
					if ( curr < prev ) {
						doa = prev - Math.abs( doa * per );
					} else {
						doa = Math.abs( doa * per );
					}
				} else {
					doa = curr;
				}

				cssObj.opacity = Math.abs( doa );
				cssObj.display = ( doa == 0 ? 'none' : 'block' );
				
				return cssObj;
			},

			/**
			 * <pre>
			 * 두 프레임간의 스타일값 비율 계산
			 * </pre>
			 * 
			 * @private
			 * @function
			 * @param {jQuery} $target 대상 jQuery 객체
			 * @param {JSON} prevStyle 이전프레임의 스타일
			 * @param {JSON} currStyle 현재프레임의 스타일
			 * @param {Float} per 두 프레임 사이에 위치한 스크롤의 위치값 비율
			 * @param {String} name 스타일 이름
			 * @return {JSON} 계산된 스타일값
			 */
			_def: function( $target, prevStyle, currStyle, per, name ) {
				var n = getNumberValue,
					pv = n( prevStyle[ name ] ),
					pu = prevStyle[ name ].unit,
					cv = n( currStyle[ name ] ),
					cu = currStyle[ name ].unit,
					ret = {};
				
				if ( pu === '%' ) {
					pv = calcPercentValue( $WINDOW, name, pv );
					pu = 'px';
				}
				
				if ( cu === '%' ) {
					cv = calcPercentValue( $WINDOW, name, cv );
				}
				
				ret[ name ] = Math.floor( ( cv - pv ) * per + pv ) + pu;
				ret[ name ] = Number( ret[ name ] ) || ret[ name ];
				
				return ret;
			}
		}
	});

	// ======================================== //
	// 모듈 메서드								//
	// ======================================== //
	/** @lends ParallaxScroller.prototype */
	extend(ParallaxScroller.prototype, {
		/** @constructs */
		constructor: ParallaxScroller,

		/**
		 * <pre>
		 * scrollTop 값 반환
		 * </pre>
		 * 
		 * @function
		 * @param {Boolean} isCalc 계산여부
		 * @return {Number} scrollTop
		 */
		getScrollTop: function( isCalc ) {
			if ( isCalc === true ) {
				var speed = this.options.scrollSpeed;
				this.smoothSrollTop += Math.floor( ( this.scrollTop - this.smoothSrollTop ) * speed );
			}

			return this.smoothSrollTop;
		},
		
		/**
		 * <pre>
		 * 이벤트 바인딩
		 * </pre>
		 * 
		 * @private
		 * @function
		 */
		_bindEvents: function() {
			var self = this,
				opts = this.options;
			
			$WINDOW.off( '.parallax' );

			// scroll 이벤트 바인딩
			$WINDOW.on( 'scroll.parallax', function() {
				self.scrollTop = $WINDOW.scrollTop();
			}).trigger( 'scroll.parallax' );
			
			// resize 이벤트 바인딩
			$WINDOW.on( 'resize.parallax', function() {
				//var h = self.$container.height();
				//self.$container.css({ top: '50%', marginTop: -h / 2 });
			}).trigger( 'resize.parallax' );
			
			// 옵션으로 넘어온 이벤트들을 바인딩
			if ( opts.on ) {
				each( opts.on, function( fn, key ){
					self.on( key, fn );
				});
			}
		},

		/**
		 * <pre>
		 * 데이터 캐싱
		 * 필요한 데이타(엘리먼트, 프레임, css정보)를 미리 캐싱하고 data-frame속성을 파싱
		 * </pre>
		 * 
		 * @private
		 * @function
		 */
		_cacheData: function() {
			var framesAttr = this.options.framesAttribute,
				data = this.data,
				$items = this.$items,
				$e, i, d;
			
			if ( this.options.data ) {
				for ( i = 0; d = this.options.data[ i ]; i += 1 ) {
					$e = $( d.target );
					
					if ( $e.css( 'position' ) === 'static' ) {
						 $e.css( 'position', 'absolute' );
					}
					
					data.push({
						target: $e,
						frames: this._parseData({ frames: d.frames })
					});
				}
			} else {
				for ( i = 0; ( $e = $items.eq( i ) )[ 0 ]; i += 1 ) {
					if ( ! $e.attr( framesAttr ) ) {
						continue;
					}
					
					if ( $e.css( 'position' ) === 'static' ) {
						 $e.css( 'position', 'absolute' );
					}
					
					data.push({
						target: $e,
						frames: this._parseData( $e )
					});
				}
			}
		},
		
		/**
		 * 데이터 파싱
		 * 
		 * @param {jQuery|JSON} args 대상 객체 또는 속성 정보
		 * @param {String} [args.frames=''] args가 속성 정보일때 프레임 값 
		 * @param {String} [args.easing=linear] args가 속성 정보일때 이징 값
		 * @param {Number} [args.refkey=0] args가 속성 정보일때 상대 키 값
		 * @returns {Array} 프레임 데이터 배열
		 */
		_parseData: function( args ) {
			var opts = this.options,
				attr = $.extend({
					frames: '',
					easing: 'linear',
					refkey: 0
				}, args instanceof jQuery ? {
					frames: args.attr( opts.framesAttribute ),
					easing: args.attr( opts.easingAttribute ),
					refkey: args.attr( opts.refkeyAttribute )
				} : args),
				frameMatch,	// 0:frame
				partsMatch, // 1:frameKey, 2:frameEasing, 3:frameStyle
				styleMatch, // 1:styleName, 2:styleEasing, 3:styleValue, 4:styleUnit
				easing,
				style,
				combineStyle = {},
				frames = [];
			
			// 각 프레임을 분리
			while ( ( frameMatch = REGEXP_FRAME.exec( attr.frames ) ) ) {
				// 프레임과 스타일 분리
				partsMatch = frameMatch[ 0 ].match( REGEXP_PARTS );
				easing = partsMatch[ 2 ] || attr.easing;
				style = {};
				
				// 스타일문자열 파싱
				while ( ( styleMatch = REGEXP_STYLE.exec( partsMatch[ 3 ] ) ) ) {
					style[ styleMatch[ 1 ] ] = {
						easing: styleMatch[ 2 ] || easing,
						value: styleMatch[ 3 ],
						unit: styleMatch[ 4 ] || ''
					};
				}
				
				// 프레임 배열에 저장
				each( partsMatch[ 1 ].split( ',' ), function( val, i ) {
					frames.push({
						offset: parseInt( val, 10 ),
						easing: easing,
						style: style
					});
				});
			}
			
			// 프레임의 offset값을 기준으로 정렬
			frames.sort( function( a, b ) {
				return a.offset - b.offset;
			});
			
			// 이전 스타일 병합
			each( frames, function( f ) {
                extend( f.style, extend( combineStyle, f.style ), false );
			});

			return frames;
		},

		/**
		 * <pre>
		 * context 설정 함수
		 * </pre>
		 * 
		 * @param {Function} fn fn의 context를 this로 지정
		 */
		context: function(fn) {
			var self = this;
			return function() {
				fn.apply( self, arguments );
			};
		},

		/**
		 * <pre>
		 * 캐싱된 항목을 클백함수로 하나씩 접근
		 * </pre>
		 * 
		 * @param {Function} fn 콜백 반복함수
		 */
		each: function(fn) {
			each( this.data, this.context( fn ) );
		},

		/**
		 * <pre>
		 * 시작
		 * </pre>
		 * 
		 * @function
		 */
		start: function() {
			var self = this;
			
			(function _run() {
				self.getScrollTop( true );
				self.animate();

				requestAnimationFrame( _run );
			})();
		},

		/**
		 * <pre>
		 * 애니메이션 실행
		 * 스크롤이벤트가 발생할 때 각 엘리먼트에 대한 애니메이션 처리
		 * </pre>
		 * 
		 * @function
		 */
		animate: function() {
			var self = this,
				scrollTop = self.getScrollTop();

			if ( self.beforeScrollTop === scrollTop ) {
				return;
			}
			self.beforeScrollTop = scrollTop;

			self.each( function( part, i ) {
				self.setFrame( part );
			});

			this.trigger( 'scrolling', [ scrollTop ] );
		},

		/**
		 * <pre>
		 * 객체에 프레임 적용
		 * 프레임에 해당하는 스타일을 엘리먼트에 적용
		 * </pre>
		 * 
		 * @param {JSON} data 해당 엘리먼트, 프레임정보, 각 프레임에 대한 스타일 정보를 담고 있는 객체
		 */
		setFrame: function( data ) {
			var scrollTop = this.getScrollTop(),
				target = data.target,
				frames = data.frames,
				step = frames.length,
				cssObj = {};

			each( frames, function( f, i ) {
				if ( scrollTop < f.offset ) {
					step = i;
					return false;
				}
			});

			switch ( step ) {
			case 0: // 처음
				cssObj = this.getStyleByFrame( target, frames[ 0 ] );
				break;
			case frames.length: // 끝
				cssObj = this.getStyleByFrame( target, frames[ step - 1 ] );
				break;
			default:
				cssObj = this.getStyleByFrames( target, frames[ step - 1 ], frames[ step ] );
				break;
			}

			target.css( cssObj );
		},

		/**
		 * <pre>
		 * 두 프레임 사이의 스타일값 계산
		 * </pre>
		 * 
		 * @function
		 * @param {jQuery} target 엘리먼트
		 * @param {JSON} prevFrame 이전프레임
		 * @param {JSON} nextFrame 현재프레임
		 * @return {JSON} 계산된 스타일
		 */
		getStyleByFrames: function( target, prevFrame, currFrame ) {
			// (0 - 10) /
			var self = this,
				scrollTop = self.getScrollTop(),
				per = ( scrollTop - prevFrame.offset ) / ( currFrame.offset - prevFrame.offset ),
				prevStyle = prevFrame.style,
				currStyle = currFrame.style,
				styles = ParallaxScroller.animStyles,
				cssObj = {};

			each( prevStyle, function( item, style ) {
				var fn;
				if ( style in styles ) {
					fn = styles[ style ];
				} else {
					fn = styles[ '_def' ];
				}
				extend( cssObj, fn.call( self, target, prevStyle, currStyle, per, style ) );
			});
			
			return cssObj;
		},

		/**
		 * <pre>
		 * 특정 프레임의 스타일 반환
		 * </pre>
		 * 
		 * @function
		 * @param {jQuery} target 엘리먼트
		 * @param {JSON} prevFrame 이전프레임
		 * @param {JSON} nextFrame 현재프레임
		 * @return {JSON} 계산된 스타일
		 */
		getStyleByFrame: function( target, frame ) {
			var style = frame.style,
				cssObj = {};
			
			each( style, function( item, name ) {
				if ( name == 'opacity' ) {
					cssObj[ 'display' ] = ( item.value | 0 ) === 0 ? 'none' : 'block';
				}
				
				cssObj[ name ] = item.value + item.unit;
				cssObj[ name ] = Number( cssObj[ name ] ) || cssObj[ name ];
			});
			
			return cssObj;
		}
	});

	// ======================================== //
	// 전역 변수 등록								//
	// ======================================== //
	window.ParallaxScroller = ParallaxScroller;

})( jQuery );
