(function(juice) {

     juice.program_options = function(spec) {
         var options = {}, parse_argv;

         // parse our options specification

         juice.foreach(spec,
                       function(name, details) {
                           var expects_value = false,
                           default_value,
                           description,
                           multiple = false,
                           required,
                           spec_error;

                           spec_error = function(msg) {
                               juice.error.raise('error in program_options specification here: '
                                                 +juice.dump(details)+'; '+msg);
                           };

                           if (name.slice(-1) == '=') {
                               name = name.slice(0, -1);
                               expects_value = true;
                           }
                           else if (name.slice(-3) == '=[]') {
                               name = name.slice(0, -3);
                               expects_value = true;
                               multiple = true;
                           }

                           if (juice.is_array(details)) {
                               if (details.length !== 2) {
                                   spec_error('at most two values allowed');
                               }
                               if (!expects_value) {
                                   spec_error('optional arguments require a default value');
                               }
                               description = details[0];
                               default_value = details[1];
                               required = false;
                           }
                           else if (juice.is_string(details)) {
                               description = details;
                               required = expects_value;
                           }
                           else {
                               spec_error('must be array or string');
                           }

                           options[name] = {default_value: default_value,
                                            description: description,
                                            expects_value: expects_value,
                                            multiple: multiple,
                                            required: required};
                       });

         // Given the array of command line arguments, returns a pair of
         // values: a mapping from keywords to values and a list of unconsumed
         // arguments. For example, the command line "--a=b --c d --e=f g h
         // --i" would be returned as [{"a" => "b", "c" => true, "e" => "f",
         // "i" => true}, ["d", "g", "h"]].

         parse_argv = function(argv) {
             var
             equals,
             i,
             key,
             match,
             options = {},
             set_option,
             unconsumed = [],
             value;

             set_option = function(name, value) {
                 if (!options.hasOwnProperty(name)) {
                     options[name] = [];
                 }
                 options[name].push(value);
             };

             for (i = 0; i < argv.length; i++) {
                 match = /^--([\w-]+)\s*(=?)\s*(.*)/i.exec(argv[i]);

                 if (!match) {
                     unconsumed.push(argv[i]);
                     continue;
                 }

                 key = match[1];
                 equals = match[2];
                 value = match[3];

                 if (equals == '=') {
                     if (value == '') {
                         if (i == argv.length-1) {
                             juice.error.raise('found (=) without a value');
                         }
                         set_option(key, argv[++i]);
                     }
                     else {
                         set_option(key, value);
                     }
                 }
                 else if (i == argv.length-1) {
                     set_option(key, true); // no equal sign, and at end of argv; must be boolean option
                 }
                 else if (argv[i+1] == '=') {
                     set_option(key, argv[i += 2]);
                 }
                 else if ((match = /^=\s*(.*)/.exec(argv[i+1]))) {
                     set_option(key, match[1]);
                     ++i;
                 }
                 else {
                     set_option(key, true); // no equal sign, and next arg does not begin with equal sign; must be boolean option
                 }
             }

             return {options: options, unconsumed: unconsumed};
         };

         return {
             parse_arguments: function(argv) {
                 var args = parse_argv(juice.args(argv)), result = {};

                 juice.foreach(args.options,
                               function(name, value) {
                                   if (!options.hasOwnProperty(name)) {
                                       juice.error.raise('unrecognized option "'+name+'"');
                                   }
                               });

                 juice.foreach(options,
                               function(name, attr) {
                                   if (args.options.hasOwnProperty(name)) {
                                       if (!attr.multiple && args.options[name].length != 1) {
                                           juice.error.raise('option "'+name+'" does not support multiple values');
                                       }
                                       if (attr.expects_value) {
                                           if (juice.any(args.options[name], juice.is_boolean)) {
                                               juice.error.raise('option "'+name+'" requires a value');
                                           }
                                       }
                                       else if (args.options[name][0] !== true) {
                                           juice.error.raise('option "'+name+'" should not have a value');
                                       }
                                       result[name] = attr.multiple ? args.options[name] : args.options[name][0];
                                   }
                                   else if (attr.expects_value) {
                                       if (attr.required) {
                                           juice.error.raise('required option "'+name+'" not supplied');
                                       }
                                       else {
                                           result[name] = attr.default_value;
                                       }
                                   }
                                   else {
                                       result[name] = false;
                                   }
                               });

                 return {options:result, unconsumed:args.unconsumed};
             },

             toString: function() {
                 // FIXME: return a nicely formatted help screen.
                 return juice.dump(options);
             }
         };
     };

 })(juice);
