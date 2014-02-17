
define('analytics/settealium',['pubsub', 
        'fwinfo', 
        'underscore', 
        'backbone', 
        'user-manager', 
        'jquery'],
        function(PubSub, FwInfo, _, Backbone, UserManager, $) {
    var _curPage= {}, _queue= [],
        _utag= function(method, data) {
            _queue.push([method, data]);
        };
    function utagtrack(typ, dat) {
        for (var p in dat){
            if (dat.hasOwnProperty(p) && dat[p]){
                dat[p]= (''+dat[p]).toLowerCase();
            }
        }
        window.utag.track(typ, dat);
    }
    function _buildPipes(detail) {
        //if clickName includes pipe already, sub in all pipe-delimited fields
        if(-1 != detail.indexOf("|")) {
            var notApplicable = "n/a",
                pipeSegments = [
                    _setTealium.data.contenttype || notApplicable,
                    _setTealium.data.section || notApplicable,
                    detail
                ];
            detail = pipeSegments.join("|");
            //ensure detail ends in pipe followed by either number or n/a
            if(!(/[|](\d+|n\/a)$/).test(detail))
                detail += "|" + notApplicable;
        }
        return detail;
    }
    var _setTealiumClass= Backbone.Model.extend({
        initialize: function() {
            this.data = {};
            this.clickName="";
            this.clickPage="";
            PubSub.on('analytics:pageload', function(e) {_setTealium.page_load(e);});
            PubSub.on('heattrack', function(e) {_setTealium.heattrack(e);});
            PubSub.on('page:load', function(e) {_setTealium.page_load(e);});
            //PubSub.on('page:load', function(e) {_setTealium.store_firefly_data(e);});
            PubSub.on('site:refresh', function(e) {_setTealium.site_refresh(e);});
            PubSub.on('slide:change', function(e) {_setTealium.slide_change(e);});
            PubSub.on('user:logout', function(e) {_setTealium.clear_user_data(e);});
            PubSub.on('uotrack', function(e) {_setTealium.uotrack(e);});
            PubSub.on('video:load', function(e) {_setTealium.video_load(e);});
            PubSub.on('vitrack', function(e) {_setTealium.vitrack(e);});
            if (window.utag){
                this.ready();
            }
        },
        ready: function() {
            _.defer(function() {
                for (var j= 0; j < _queue.length; j++){
                    utagtrack.apply(window.utag, _queue[j]);
                }
                _queue= [];
                _utag = function(method, data) {
                    utagtrack(method, data);
                    window.s_ut.prop41= ''; /* prevent uotrack from contaminating exit link tracking */
                };
            });
        },
        relevant_data: function(pageinfo, eventtype) {
            if (!pageinfo.aws) pageinfo.aws= 'undefined';
            if (!pageinfo.ssts) pageinfo.ssts= 'bugpages'; 
            var cstlist= pageinfo.aws.replace(/\/\/*$/,'').split('/'),
                halfHour= new Date(1800000 * parseInt(new Date().getTime()/1800000, 10)),
                h= halfHour.getHours(),
                hashvalue=location.hash.match(/\bht=([^&]*)/) && RegExp.$1, 
                cspvalue = window.location.search.match(/[?&]csp=([^&]*)/i) && RegExp.$1,
                sstslist= pageinfo.ssts.split('/');
            this.clickName=(function(hash, sess) {return hash||sess;})(hashvalue, FwInfo.getandclearsessionvalue('clickName'));
            this.clickPage= FwInfo.getandclearsessionvalue('clickPage');

            return {
                assetid: pageinfo.assetid,
                atyponuserid: _setTealium.data.atypon_id,
                blogname: pageinfo.blogname||pageinfo.blognamebackup||'', /* using two values to work around an inconsistency in core -- right solution would be for core to always put the name of the blog in front_attrs sitename instead of sometimes using front_attrs topic_name (like on-politics) */
                byline: pageinfo.byline||'',
                category: cstlist[0],
                clickName: this.clickName,
                clickPage: this.clickPage,
                contenttype: pageinfo.contenttype,
                cst: cstlist.slice(0,3).join(':'),
                dayofweek: 'sunday monday tuesday wednesday thursday friday saturday'.split(' ')[new Date().getDay()],
                eventtype: eventtype,
                gcionid: document.cookie.match(/\bGCIONID=([^;]*)/) && RegExp.$1,
                halfhour: (1+(h+11)%12)+':'+(function(h) {return h.substr(h.length-2);})('0'+halfHour.getMinutes())+(h>11 ?' pm' :' am'),
                linkTrackVars: 'prop1',
                pathName:pageinfo.pathName||'',
                prevpath: FwInfo.getandclearsessionvalue('prevpath'),
                published_date: pageinfo.published_date||'',
                referrerhost:(hashvalue)?document.referrer.split('/')[2]:"",
                refreshed: FwInfo.getandclearsessionvalue('refreshed'),
                searchkeywords: pageinfo.searchkeywords,
                section: sstslist[0],
                ssts: sstslist.join(':'),
                subcategory: cstlist.slice(0,2).join(':'),
                subsection: sstslist.slice(0,2).join(':'),
                templatetype: pageinfo.templatetype,
                topic: sstslist.slice(0,3).join(':'),
                typeofday: ((new Date().getDay()+8)%7>1) ?'weekday' :'weekend',
                user_status: $.cookie("userLicenseType") || "",
                coreuserid: _setTealium.data.core_user_id,
                videoincluded:pageinfo.videoincluded||"no",
                taxonomykeywords:pageinfo.taxonomykeywords||'',
                gallerytitle:pageinfo.gallerytitle||'',
                galleryindex:pageinfo.galleryindex||'',
                queryparamtrack:cspvalue||'',
                viralVideoDomain : "",
                videoContentProvider : "",
                videoFulllengthUrl : "",
                videoName: "",
                videoPlayerName : "",
                keywords: "",
                videoDuration: "",
                milestonetrack : "",
                noinitialanalytics:pageinfo.noinitialanalytics||''
            };
            //Fields need to be re-added once firefly data becomes available again via usermanager
            //atypon_zip: _setTealium.data.atypon_zip || "",
            //atypon_age: _setTealium.data.atypon_age || "",
            //atypon_gender: _setTealium.data.atypon_gender || "",
            //firefly_paywall_status: _setTealium.data.firefly_paywall_status || ""
        },            
        //used on USCP sites where firefly events actually happen
        //store_firefly_data: function(e) {
            //var fireflyViewsCookie = firefly.getFireflyViewsCookie();
            //if(firefly.userInfo) {
                //var userInfo = firefly.userInfo;
                //_setTealium.data.atypon_zip = userInfo.zipCode;
                //_setTealium.data.atypon_age = userInfo.birthYear;
                //_setTealium.data.atypon_gender = userInfo.gender;
                //if(firefly.userInfo.hasMarketAccess)
                    //_setTealium.data.firefly_paywall_status = "authorized";
            //}

            //if(fireflyViewsCookie && "authorized" != _setTealium.data.firefly_paywall_status) {
                //if(0 === fireflyViewsCookie.viewCount)
                    //_setTealium.data.firefly_paywall_status = "nothitpaywall";
                //else if(fireflyViewsCookie.viewsRemaining < 1) {
                    //_setTealium.data.firefly_paywall_status = "nofreearticlesremaining";
                //} else if(fireflyViewsCookie.viewsRemaining >= 1) {
                    //_setTealium.data.firefly_paywall_status = fireflyViewsCookie.viewsRemaining;
                //}
            //}
        //},
        clear_user_data: function(e) {
            var cookiedomain = window.site_vars.base_url;
            _setTealium.data = {};
            $.cookie("sessionKey", undefined,{path: "/", domain:cookiedomain});
            $.cookie("atyponid", undefined,{path: "/", domain:cookiedomain});
        },
        page_load: function(detail) {
            var data,
                cookiedomain = window.site_vars.base_url,
                coreUserPromise = UserManager.getCoreUserInfo();

            if(!detail.noinitialanalytics) {
                _curPage = data = _setTealium.relevant_data(detail, 'page:load');
                _setTealium.data.contenttype = data.contenttype;
                _setTealium.data.section = data.section;

                FwInfo.setsessionvalue('prevpath', document.location.pathname);

                if("loggingIn" === UserManager.getLoginStatus()) {
                    coreUserPromise.done(function(atyponData) {

                        _setTealium.data.atypon_id = data.atyponuserid = atyponData.AtyponId;
                        _setTealium.data.core_user_id = data.coreuserid = atyponData.CoreUserId;
                        
                        $.cookie("sessionKey", atyponData.AtyponSessionKey,{path: "/", domain:cookiedomain});
                        $.cookie("atyponid", atyponData.AtyponId,{path: "/", domain:cookiedomain});

                        _utag('view', data);
                    });
                }
                else
                    _utag('view', data);
            }
            _.defer(function(){
                if (window.s_ut && window.s_ut.getPPVSetup) {
                    window.s_ut.getPPVSetup();
                }
            });
        },
        uotrack: function(detail) {
            if ('string' != typeof detail) {
                console.error('uotrack has been given a non-string event argument', detail);
                detail= (detail||{}).prop41 || 'somethingbad';
            } 
            var vars= detail.match(/{% *[a-z0-9_]* *%}/gi);
            if (vars) {
                for (var j=0; j<vars.length; j++){
                    var v= vars[j];
                    var name= v.match(/{% *([a-z0-9_]*) *%}/) && RegExp.$1;
                    detail= detail.replace(v, _curPage[name]);
                }
            }
            detail = _buildPipes(detail);
            var data= {clickName: detail, eventtype: 'uotrack', linkTrackEvents: 'None', linkTrackVars: 'prop41'};
            _utag('link', data);
        },
        vitrack: function(detail) {
            if ('string' != typeof detail) {
                console.error('vitrack has been given a non-string event argument', detail);
                detail= (detail||{}).prop9 || 'somethingbad';
            } 
             
            var data= {milestonetrack: detail, eventtype: 'vitrack', linkTrackEvents: 'None', linkTrackVars: 'prop9'};
            _utag('link', data);
        },
        site_refresh: function(refresh_info) {
            FwInfo.setsessionvalue('refreshed', refresh_info);
        },
        heattrack: function(clickName) {
            clickName = _buildPipes(clickName);
            FwInfo.setsessionvalue('clickName', clickName);
            FwInfo.setsessionvalue('clickPage', location.href);
        },
        slide_change: function(detail) {
            var data= _curPage, cstlist, sstslist;
            try {
                cstlist= detail.cst.split('/');
                sstslist= detail.ssts.split('/');
            } catch (er) {
                console.error('Invalid page', er.stack || er.stacktrace || er.message);
                return;
            }
            data.byline = "";
            data.clickName= FwInfo.getandclearsessionvalue('clickName');
            data.contenttype= detail.contenttype;
            data.videoincluded = detail.videoincluded ||"no";
            data.gallerytitle= detail.gallery_title;
            data.galleryindex= detail.gallery_index;
            data.assetid= detail.gallery_id;
            data.eventtype= 'slide:change';
            data.templatetype= '';
            data.category= cstlist[0];
            data.cst= cstlist.slice(0,3).join(':');
            data.published_date = detail.publishedDate||'';
            data.refreshed="";
            data.section= sstslist[0];
            data.ssts= sstslist.join(':');
            data.subcategory= cstlist.slice(0,2).join(':');
            data.subsection= sstslist.slice(0,2).join(':');
            data.topic= sstslist.slice(0,3).join(':');
            data.pathName= detail.pathName||'';
            data.viralVideoDomain = "";
            data.videoContentProvider = "";
            data.videoFulllengthUrl = "";
            data.videoName = "";
            data.videoDuration = "";
            data.videoPlayerName = "";
            data.keywords =  "";
            data.milestonetrack = "";
            _utag('view', data);
        },
        video_load : function(detail) {
            var data = _curPage,
                hashvalue=location.hash.match(/\bht=([^&]*)/) && RegExp.$1;

            data.byline = "";
            data.clickName= hashvalue || FwInfo.getandclearsessionvalue('clickName');
            data.clickPage=  FwInfo.getandclearsessionvalue('clickPage');
            data.category = detail.category || '';
            data.cst = detail.cst || '';
            data.assetid = detail.assetid || '';
            data.published_date = detail.publishedDate||'';
            data.refreshed = '';
            data.section = detail.section || '';
            data.ssts = detail.ssts || '';
            data.subcategory = detail.subcategory || '';
            data.subsection = detail.subsection || '';
            data.topic = detail.topic || '';
            data.videoPlayerName = detail.videoplayername || '';
            data.prevpath= FwInfo.getandclearsessionvalue('prevpath');
            data.completion = detail.completion || '';
            data.keywords = detail.keywords || '';
            data.taxonomykeywords = detail.keywords || '';
            data.contenttype = detail.contenttype || '';
            data.videoName = detail.videoName || '';
            data.videoDuration = detail.videoDuration || '';
            data.eventtype = detail.eventtype || '';
            data.pathName = detail.pathName || '';
            data.videoContentID = detail.contentid || '';
            data.viralVideoDomain = detail.viralVideoDomain || '';
            data.videoContentProvider = detail.videocontentprovider || '';
            data.templatetype = detail.templatetype || '';
            data.noinitialanalytics = false;
            data.videoincluded = "yes";
            data.videoFulllengthUrl = detail.videoFulllengthUrl || '';
            _utag('view', data);
            FwInfo.setsessionvalue('prevpath', document.location.pathname);
        }
    });
    var _setTealium= new _setTealiumClass();
    return _setTealium;
});
