(function(juice) {

     var attrs_to_html, apply_tag;

     // TOOD: this function should escape k and v to make sure they're html-safe.
     attrs_to_html = function(attrs) {
         var answer = [];
         juice.foreach(attrs, function(k, v) { answer.push([k, '=', '"', v, '"'].join('')); });
         return answer.join(' ');
     };

     juice.html = {

         // TOOD: this function should escape inner_html and name.
         tag: function(name) {
             var result;
             if (arguments.length === 2) {
                 if (juice.is_object(arguments[1])) {
                     result = ['<', name, ' ', attrs_to_html(arguments[1]), ' />'];
                 }
                 else {
                     result = ['<', name, '>', String(arguments[1]), '</', name, '>'];
                 }
             }
             else if (arguments.length >= 3) {
                 result = ['<', name, ' ', attrs_to_html(arguments[1]), '>', String(arguments[2]), '</', name, '>'];
             }
             else {
                 result = ['<', name, '/>'];
             }
             return result.join("");
         }
     };

     juice.foreach(['a',
                    'b',
                    'button',
                    'div',
                    'fieldset',
                    'h1',
                    'h2',
                    'h3',
                    'img',
                    'input',
                    'label',
                    'legend',
                    'li',
                    'object',
                    'ol',
                    'optgroup',
                    'option',
                    'p',
                    'pre',
                    'select',
                    'span',
                    'sub',
                    'sup',
                    'table',
                    'tbody',
                    'td',
                    'textarea',
                    'tfoot',
                    'th',
                    'thead',
                    'tr',
                    'ul'],
                   function(name) {
                       juice.html[name] = function() {
                           return juice.html.tag.apply(this, [name].concat(juice.args(arguments)));
                       };
                   });

 })(juice);



