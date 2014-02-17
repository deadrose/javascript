/*
 * Disable document.write, except for well formed references to remote scripts
 */
(function() {
    /* These should never be needed:
     var orig= {
     write: document.write,
     writeln: document.writeln
     };
     */
    var onwrite= {};
    var onscript= {};
    document.writeln= (self.console||{}).log || function() {};
    document.write= function() {
        for (var p in onwrite) {
            if (onwrite.hasOwnProperty(p)) {
                try {
                    onwrite[p].apply({}, arguments);
                } catch (e) {}
            }
        }
        var text = Array.prototype.join.call(arguments, '');
        var valid= '<script[^<>]*src=[\'"]?([^\'"<> :/]*:*\/\/[a-z0-9.]*google\.com\/[^\'"<> ]*)[\'"]?[^<>]*>[^<>]*<\/script>';
        var all= new RegExp(valid, 'gi');
        var one= new RegExp(valid, 'i');
        var scripts= text.match(all) || [];
        for (var j= 0; j<scripts.length; j++) {
            scripts[j].match(one);
            $.ajax({
                cache: true,
                dataType: 'script',
                success: function() {
                    for (var p in onscript) {
                        if (onscript.hasOwnProperty(p)) {
                            try {
                                onscript[p].apply({}, arguments);
                            } catch (e) {}
                        }
                    }
                },
                url: RegExp.$1
            });
            text= text.replace(scripts[j], '');
        }
        if (!text.match(/^\s*$/)) {
            try {
                console.log("document.write ignoring ",text);
            } catch (e) {}
        }
    };
    document.addOnWrite= function(name, handler) {
        if ('function' != typeof handler) return;
        if (onwrite[name]) return;
        onwrite[name]= handler;
    };
    document.addOnScript= function(name, handler) {
        if ('function' != typeof handler) return;
        if (onscript[name]) return;
        onscript[name]= handler;
    };
    document.delOnWrite= function(name) {
        if (!delete onwrite[name]) onwrite[name]= undefined;
    };
    document.delOnScript= function(name) {
        if (!delete onscript[name]) onscript[name]= undefined;
    };
})();
