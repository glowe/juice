(function(juice, proj) {

     juice.decorator = {
         define: function(name, constructor) {
             if (proj.decorators[name]) {
                 juice.error.raise('decorator_already_defined', {name: name});
             }
             proj.decorators[name] = constructor;
         },
         apply: function(name, that, my, spec) {
             if (!proj.decorators[name]) {
                 juice.error.raise('decorator_not_defined', {name: name});
             }
             proj.decorators[name](that, my, spec);
             return that;
         }
     };

 })(juice, proj);
