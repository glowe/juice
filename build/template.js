(function(juice) {
     juice.template = {};

     var all_tokens, base_context, escape_single_quote_re, raise_syntax_error, reserved, string_re, tag_delims, tokens, whitespace_tokens;

     reserved = {
         'abstract': null,
         'boolean': null, 'break': null, 'byte': null,
         'case': null, 'catch': null, 'char': null, 'const': null, 'continue': null,
         'debugger': null, 'default': null, 'delete': null, 'do': null, 'double': null,
         'else': null, 'elsif': null, 'endfor': null, 'endif': null, 'enum': null, 'export': null, 'extends': null,
         'false': null, 'final': null, 'finally': null, 'float': null, 'for': null, 'function': null,
         'goto': null,
         'if': null, 'implements': null, 'import': null, 'in': null, 'instanceof': null, 'int': null, 'interface': null,
         'long': null,
         'native': null, 'new': null, 'null': null,
         'package': null, 'private': null, 'protected': null, 'public': null,
         'return': null,
         'short': null, 'static': null, 'super': null, 'switch': null, 'synchronized': null,
         'template' : null, 'this': null, 'throw': null, 'throws': null, 'transient': null, 'true': null, 'try': null, 'typeof': null,
         'var': null, 'volatile': null, 'void': null,
         'while': null, 'with': null};

     // Since js2-mode can't handle this inlined sauce, we have to use the object.
     string_re = new RegExp('^(?:"(?:[^"]|(?:["\\/fnrt]|u[0-9a-f]{4}))*?")|' + "^(?:'(?:[^']|(?:['\\/fnrt]|u[0-9a-f]{4}))*?')");

     // Similar js2-mode weakness.
     escape_single_quote_re = new RegExp("([^\\\\']*)'", 'g');

     raise_syntax_error = function(spec) {
         var my_spec = spec;
         my_spec.what = 'syntax_error';
         juice.error.raise('Syntax error', my_spec);
     };

     tag_delims = [
         '{{', '}}', // expr_tags
         '{%', '%}', // stmt_tags
         '{[', ']}'  // macro_tags
     ];

     tokens = [
         '===',
         '!==',
         '||',
         '&&',
         '>=',
         '<=',
         '>',
         '<',
         '+',
         '-',
         '*',
         '/',
         '%',
         '|',
         ',',
         '.',
         '(',
         ')',
         '[',
         ']',
         '{',
         '}',
         '!',
         ':'
     ];

     whitespace_tokens = [' ', '\t', '\f', '\r', '\n'];

     all_tokens = tag_delims.concat(tokens).concat(whitespace_tokens);

     juice.template.scanner = function(string) {
         var
         col, consume_ws,
         first_of,
         in_tag,
         line, lookfor,
         match_tag_delim, match_token, match_token_re,
         pos,
         set_in_tag, slice_string, starts_with, starts_with_delim,
         that, token;

         consume_ws = function() {
             var match, p = 0;
             while (/^[ \t\f]/.test(string.slice(p))) {
                 p++;
                 col++;
             }
             while ((match = /^\r?\n/.exec(string.slice(p)))) {
                 p += match[0].length;
                 line++;
                 col = 0;
             }
             slice_string(p);
         };

         first_of = function(matches) {
             var p = string.length;
             juice.foreach(matches,
                          function(m) {
                              var i = string.indexOf(m);
                              if (i !== -1) {
                                  p = Math.min(i, p);
                              }
                          });
             return p;
         };

         match_tag_delim = function() {
             var i;
             for (i = 0; i < tag_delims.length; i++) {
                 if (string.indexOf(tag_delims[i]) === 0) {
                     col += tag_delims[i].length;
                     return token(tag_delims[i], tag_delims[i]);
                 }
             }
             return null;
         };

         match_token = function() {
             var t = starts_with(string, tokens);
             if (t) {
                 col += t.length;
                 return token(t, t);
             }
             return null;
         };

         match_token_re = function(re, type) {
             var m = re.exec(string);
             if (m) {
                 if (starts_with_delim(string.slice(m[0].length))) {
                     col += m[0].length;
                     return token(type, m[0]);
                 }
             }
             return null;
         };

         slice_string = function(i) {
             string = string.slice(i);
             pos += i;
         };

         starts_with_delim = function(str) {
             return str === '' || starts_with(str, all_tokens);
         };

         starts_with = function(str, prefixes) {
             var i;
             for (i = 0; i < prefixes.length; i++) {
                 if (str.indexOf(prefixes[i]) === 0) {
                     return prefixes[i];
                 }
             }
             return null;
         };

         token = function(type, value) {
             value = value || '';
             var t = {type: type,
                      value: value,
                      line: line,
                      col: (col - value.length),
                      pos: pos,
                      toString: function() {
                          return t.type + ":'" + t.value + "' (" + t.line + ':' + t.col + ')';
                      }};
             slice_string(value.length);
             return t;
         };

         that = {};

         that.in_tag = function(b) {
             in_tag = b;
         };

         that.scan = function() {
             var end, p, match, t;

             if (string.length === 0) {
                 return token('eof');
             }

             if (!in_tag) {
                 if ((t = match_tag_delim())) {
                     return t;
                 }

                 p = 0;
                 end = first_of(tag_delims);
                 while (p < end) {
                     if ((match = /^\r?\n/.exec(string.slice(p)))) {
                         p += match[0].length;
                         line++;
                         col = 0;
                     }
                     else {
                         col++;
                         p++;
                     }
                 }
                 return token('template_literal', string.slice(0, end));
             }

             consume_ws();

             if ((t = match_tag_delim())) {
                 return t;
             }

             if ((t = match_token_re(/^(?:[a-z]|\$)[a-z0-9_\$]*/i, 'name'))) {
                 if (reserved.hasOwnProperty(t.value)) {
                     t.type = t.value;
                 }
                 return t;
             }

             if ((t = match_token_re(/^(?:[0]|[1-9]+[0-9]*)(?:\.[0-9]*)?(?:[eE][+\-]?[0-9]*)?/, 'number'))) {
                 return t;
             }

             if ((t = match_token_re(string_re, 'string'))) {
                 // Trim the string.
                 t.value = t.value.slice(1, t.value.length-1);
                 return t;
             }

             if ((t = match_token())) {
                 return t;
             }

             return raise_syntax_error({line: line, col: col, pos: pos});
         };

         pos = col = 0;
         line = 1;
         in_tag = false;

         return that;
     };

     juice.template.parser = function(macros) {
         var
         base_context = '_o',
         code, code_for_push, collect_pushes, contexts, contextualize,
         escape_literal,
         lookahead,
         match, modified_expr, modifier, modifiers_alias, modifier_invoked,
         parse, peek, peek_further, peek_helper,
         scanner,
         tmpl_prefix,

         // LL(2) grammar
         template,             // : template_chunk 'eof'
         template_chunk,       // : stmt_tag template_chunk_p | expr_tag template_chunk_p | macro_tag template_chunk_p | 'template_literal' template_chunk_p
         template_chunk_p,     // : template_chunk | epsilon
         stmt_tag,             // : '{%' stmt_tag_p '%}'
         stmt_tag_p,           // : call_template_tag | for_tag | if_tag
         call_template_tag,    // : 'template' name invocation
         if_tag,               // : 'if' expr '%}' template_chunk optional_elsif optional_else '{%' 'endif'
         optional_elsif,       // : '{%' 'elsif' expr '%}' template_chunk optional_elsif | epsilon
         optional_else,        // : '{%' 'else' '%}' template_chunk | epsilon
         for_tag,              // : 'for' name optional_for_value 'in' expr '%}' template_chunk '{%' 'endfor'
         optional_for_value,   // : ',' name | epsilon
         expr_tag,             // : '{{' expr optional_modifier '}}'
         optional_modifier,    // : '|' modifier_invocation optional_modifier | epsilon
         modifier_invocation,  // : name modifier_params
         modifier_params,      // : expr modifier_params | epsilon
         expr,                 // : literal expr_p | name expr_p | boolean_expr expr_p| 'null' expr_p | '(' expr ')' expr_p | prefix_operator expr expr_p
         expr_p,               // : infix_operator expr expr_p | invocation expr_p | refinement expr_p | epsilon
         boolean_expr,         // : 'true' | 'false'
         literal,              // : 'number' | 'string' | array_literal | object_literal
         prefix_operator,      // : '+' | '-' | '!'
         infix_operator,       // : '*' | '/' | '%' | '+' | '-' | '>=' | '<=' | '>' | '<' | '===' | '!==' | '||' | '&&'
         invocation,           // : '(' invocation_params ')'
         invocation_params,    // : expr invocation_params_p | epsilon
         invocation_params_p,  // : ',' expr invocation_params_p | epsilon
         refinement,           // : '.' name | '[' expr ']'
         object_literal,       // : '{' object_property ':' expr object_literal_p '}',
         object_property,      // : name | 'string'
         object_literal_p,     // : ',' object_property ':' expr | epsilon
         array_literal,        // : '[' array_literal_p ']'
         array_literal_p,      // : expr array_literal_p_p | epsilon
         array_literal_p_p,    // : ',' expr array_literal_p_p | epsilon
         macro_tag             // : '{[' name ']}'
         ;

         collect_pushes = function() {
             if (code_for_push.length > 0) {
                 code.push('_a.push(' + code_for_push.join(',') + ');');
                 code_for_push = [];
             }
         };

         contextualize = function(n) {
             var i;

             // We never contextualize the juice namespace
             if (n === 'juice') {
                 return n;
             }

             for (i = 0; i < contexts.length; i++) {
                 if (n === contexts[i]) {
                     return n;
                 }
             }
             return base_context + '.' + n;
         };

         escape_literal = function(s) {
             return "'" +
                 s.replace(/\n/g, '\\' + 'n')
             .replace(escape_single_quote_re, "$1\\'") + // " leave this comment here to stop js2-mode craziness!!!
             "'";
         };

         match = function() {
             var expected = juice.args(arguments);

             if (!peek.apply(this, expected)) {
                 raise_syntax_error({expected: expected,
                                     encountered: lookahead[0].value,
                                     pos: lookahead[0].pos,
                                     line: lookahead[0].line,
                                     col: lookahead[0].col});
             }

             var r = lookahead.shift();
             return r;
         };

         modified_expr = function(e, mods) {
             var already_safe, out, my_mods = [];
             modifier_invoked = true;
             juice.foreach(mods,
                          function(m) {
                              if (m.name === 'safe') {
                                  already_safe = true;
                              }
                              else {
                                  my_mods.push(m);
                              }
                          });

             // The make safe modifier has to be named '_'. We keep it
             // short because it's used a lot.
             if (!already_safe) {
                 my_mods.push(modifier('_',  []));
             }

             out = e;
             juice.foreach(my_mods,
                          function(m) {
                              out = modifiers_alias + '.' + m.name + '(' + [out].concat(m.params).join(',') + ')';
                          });

             return out;
         };

         modifier = function(name, params) {
             return {name: name, params: params};
         };

         parse = function(string, template_prefix) {
             var compiled;
             scanner = juice.template.scanner(string);
             code = [];
             code_for_push = [];
             contexts = [];
             lookahead = [];
             modifier_invoked = false;
             tmpl_prefix = template_prefix;

             template();
             collect_pushes();

             compiled = 'var _a = []';
             if (modifier_invoked) {
                 compiled += ', ' + modifiers_alias + ' = juice.modifiers';
             }
             return compiled + ';\n' + code.join('\n') + "\nreturn _a.join('');";
         };

         peek = function() {
             return peek_helper(0, juice.args(arguments));
         };

         peek_further = function() {
             return peek_helper(1, juice.args(arguments));
         };

         peek_helper = function(level, types) {
             var i;

             while (lookahead.length < level + 1) {
                 lookahead.push(scanner.scan());
             }

             for (i = 0; i < types.length; i++) {
                 if (lookahead[level].type === types[i]) {
                     return true;
                 }
             }

             return false;
         };

         template = function() {
             template_chunk();
             match('eof');
         };

         template_chunk = function() {
             if (peek('{%')) {
                 scanner.in_tag(true);
                 if (peek_further('if', 'for', 'template')) {
                     stmt_tag();
                     template_chunk_p();
                 }
             }
             else if (peek('{{')) {
                 expr_tag();
                 template_chunk_p();
             }
             else if (peek('{[')) {
                 macro_tag();
                 template_chunk_p();
             }
             else {
                 code_for_push.push(escape_literal(match('template_literal').value));
                 template_chunk_p();
             }
         };

         template_chunk_p = function() {
             if (peek('{%')) {
                 scanner.in_tag(true);
                 if (peek_further('if', 'for', 'template')) {
                     stmt_tag();
                     template_chunk_p();
                 }
             }
             else if (peek('{{')) {
                 expr_tag();
                 template_chunk_p();
             }
             else if (peek('{[')) {
                 macro_tag();
                 template_chunk_p();
             }
             else if (peek('template_literal')) {
                 code_for_push.push(escape_literal(match('template_literal').value));
                 template_chunk_p();
             }
         };

         stmt_tag = function() {
             match('{%');
             scanner.in_tag(true);
             stmt_tag_p();
             match('%}');
             scanner.in_tag(false);
         };

         stmt_tag_p = function() {
             if (peek('template')) {
                 call_template_tag();
             }
             else if (peek('for')) {
                 for_tag();
             }
             else {
                 if_tag();
             }
         };

         call_template_tag = function() {
             var template_name, c;
             c = code;
             code = [];
             match('template');
             template_name = match('name');
             if (!tmpl_prefix) {
                 juice.error.raise("template tag used, but template prefix not supplied");
             }
             code.push(tmpl_prefix + template_name.value);
             invocation();
             code_for_push.push(code.join(''));
             code = c;
         };

         if_tag = function() {
             collect_pushes();
             match('if');
             code.push('if (');
             expr();
             code.push(') {');
             match('%}');
             scanner.in_tag(false);
             template_chunk();
             collect_pushes();
             code.push('}');
             optional_elsif();
             optional_else();
             match('{%');
             scanner.in_tag(true);
             match('endif');
         };

         optional_elsif = function() {
             if (!peek_further('else', 'endif')) {
                 match('{%');
                 scanner.in_tag(true);
                 match('elsif');
                 code.push('else if (');
                 expr();
                 match('%}');
                 code.push(') {');
                 scanner.in_tag(false);
                 template_chunk();
                 collect_pushes();
                 code.push('}');
                 optional_elsif();
             }
         };

         optional_else = function() {
             if (!peek_further('endif')) {
                 match('{%');
                 scanner.in_tag(true);
                 match('else');
                 code.push('else {');
                 match('%}');
                 scanner.in_tag(false);
                 template_chunk();
                 collect_pushes();
                 code.push('}');
             }
         };

         for_tag = function() {
             var k, c, e, v;
             collect_pushes();
             match('for');
             k = match('name');

             // Inlined optional_for_value
             if (peek(',')) {
                 match(',');
                 v = match('name');
             }

             match('in');

             c = code;
             code = [];
             expr();
             e = code.join('');
             code = c;
             match('%}');
             if (v) {
                 code.push('juice.foreach(' + e + ',function(' + k.value + ', ' + v.value + ') {');
             }
             else {
                 code.push('juice.foreach(' + e + ',function(' + k.value + ') {');
             }
             scanner.in_tag(false);
             contexts.unshift(k.value);
             if (v) {
                 contexts.unshift(v.value);
             }

             template_chunk();
             collect_pushes();
             match('{%');
             scanner.in_tag(true);
             code.push('});');
             contexts.shift();
             if (v) {
                 contexts.shift();
             }
             match('endfor');
         };


         expr_tag = function() {
             var c, e, modifiers;
             match('{{');
             scanner.in_tag(true);
             c = code;
             code = [];
             expr();
             e = code.join('');
             code = c;
             modifiers = optional_modifier();
             match('}}');
             code_for_push.push(modified_expr(e, modifiers));
             scanner.in_tag(false);
         };

         optional_modifier = function() {
             var m, modifiers = [];
             if (!peek('}}')) {
                 match('|');
                 modifiers.push(modifier_invocation());
                 if ((m = optional_modifier())) {
                     modifiers.concat(m);
                 }
             }
             return modifiers;
         };

         modifier_invocation = function() {
             return modifier(match('name').value, modifier_params());
         };

         modifier_params = function() {
             var c, params;
             params = [];
             if (!peek('|', '}}')) {
                 c = code;
                 code = [];
                 expr();
                 params.push(code.join(''));
                 code = c;
                 params.concat(modifier_params());
             }
             return params;
         };

         expr = function() {
             if (peek('number', 'string', '[', '{')) {
                 literal();
             }
             else if (peek('name')) {
                 code.push(contextualize(match('name').value));
             }
             else if (peek('(')) {
                 code.push(match('(').value);
                 expr();
                 code.push(match(')').value);
             }
             else if (peek('null')) {
                 code.push(match('null').value);
             }
             else if (peek('true', 'false')) {
                 // boolean
                 code.push(match('true', 'false').value);
             }
             else if (peek('+', '-', '!')) {
                 prefix_operator();
                 expr();
             }
             expr_p();
         };

         expr_p = function() {
             if (!peek('%}', '}}', '|', ',', ')')) {
                 if (peek('*', '/', '%', '+', '-', '>=', '<=', '>', '<', '===', '!==', '||', '&&')) {
                     infix_operator();
                     expr();
                     expr_p();
                 }
                 else if (peek('(')) {
                     invocation();
                     expr_p();
                 }
                 else if (peek('.', '[')) {
                     refinement();
                     expr_p();
                 }
             }
         };

         literal = function() {
             if (peek('number')) {
                 code.push(match('number').value);
             }
             else if (peek('string')) {
                 code.push(escape_literal(match('string').value));
             }
             else if (peek('[')) {
                 array_literal();
             }
             else {
                 object_literal();
             }
         };

         prefix_operator = function() {
             code.push(match('+', '-', '!').value);
         };

         infix_operator = function() {
             code.push(match('*', '/', '%', '+', '-', '>=', '<=', '>', '<', '===', '!==', '||', '&&').value);
         };

         invocation = function() {
             code.push(match('(').value);
             invocation_params();
             code.push(match(')').value);
         };

         invocation_params = function() {
             if (!peek(')')) {
                 expr();
                 invocation_params_p();
             }
         };

         invocation_params_p = function() {
             if (!peek(')')) {
                 code.push(match(',').value);
                 expr();
                 invocation_params_p();
             }
         };

         refinement = function() {
             if (peek('.')) {
                 code.push(match('.').value);
                 code.push(match('name').value);
             }
             else {
                 code.push(match('[').value);
                 expr();
                 code.push(match(']').value);
             }
         };

         object_literal = function() {
             code.push(match('{').value);
             object_property();
             code.push(match(':').value);
             expr();
             object_literal_p();
             code.push(match('}').value);
         };

         object_property = function() {
             if (peek('name')) {
                 code.push(match('name').value);
             }
             else {
                 code.push(escape_literal(match('string').value));
             }
         };

         object_literal_p = function() {
             if (!peek('}')) {
                 code.push(match(',').value);
                 object_property();
                 code.push(match(':').value);
                 expr();
             }
         };

         array_literal = function() {
             code.push(match('[').value);
             array_literal_p();
             code.push(match(']').value);
         };

         array_literal_p = function() {
             if (!peek(']')) {
                 expr();
                 array_literal_p_p();
             }
         };

         array_literal_p_p = function() {
             if (!peek(']')) {
                 code.push(match(',').value);
                 expr();
                 array_literal_p_p();
             }
         };

         macro_tag = function() {
             var name;
             match('{[');
             scanner.in_tag(true);
             name = match('name');
             if (!macros.hasOwnProperty(name.value)) {
                 juice.error.raise('Unrecognized macro', {encountered: name.value,
                                                          pos: name.pos,
                                                          line: name.line,
                                                          col: name.col,
                                                          what: 'unknown_macro'});
             }
             code_for_push.push(escape_literal(macros[name.value]));
             match(']}');
             scanner.in_tag(false);
         };

         modifiers_alias = juice.newid();

         return {
             parse: function(string, tmpl_prefix) {
                 return new Function([base_context], parse(string, tmpl_prefix));
             },
             parse_src: function(string, tmpl_prefix) {
                 return 'function(' + base_context + ') { ' + parse(string, tmpl_prefix) + ' }';
             }
         };
     };

     juice.template.formatted_error = function(e, source, source_filename) {
         var arrow, encountered, error, type;
         arrow = function() {
             var a = [], i;
             for (i = 0; i < e.col; i++) {
                 a.push('.');
             }
             a.push('^');
             return a.join('');
         };

         if (e.info.what === 'syntax_error') {
             type = 'Syntax error';
         }
         else if (e.info.what === 'unknown_macro') {
             type = 'Macro error';
         }
         else {
             juice.error.raise('cant_format_error', {e: e});
         }

         source_filename = source_filename ? (' ' + source_filename + ',') : '';
         error = [];
         error.push(type + ':' + source_filename + ' line ' + e.info.line + ' column ' + e.info.col + '.\n');
         error.push(source.slice((e.info.pos - e.info.col), e.info.pos + 1));
         error.push(arrow());
         if (e.info.expected) {
             encountered = e.info.encountered === '' ? 'end of file' : e.info.encountered;
             error.push('\nExpected ' + e.info.expected + ', but encountered ' + encountered + '.');
         }
         return error.join('\n');
     };
 })(juice);
