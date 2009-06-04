(function(juice) {

     var format_ts_offset;

     format_ts_offset = function(t, use_local_tz, show_time) {
         var time_of_day, day_of_year, full_date, d, now, strtime;

         time_of_day = function(d) {
             var hh = d.getHours();
             var mi = d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes();
             var meridian = 'am';

             if (hh >= 12) {
                 meridian = 'pm';
                 if (hh > 12) {
                     hh -= 12;
                 }
             }
             else if (hh === 0) {
                 hh = 12;
             }

             return hh + ':' + mi + ' ' + meridian;
         };

         day_of_year = function(d) {
             var mon;
             switch (d.getMonth()) {
             case  0: mon = 'Jan';  break;
             case  1: mon = 'Feb';  break;
             case  2: mon = 'Mar';  break;
             case  3: mon = 'Apr';  break;
             case  4: mon = 'May';  break;
             case  5: mon = 'June'; break;
             case  6: mon = 'July'; break;
             case  7: mon = 'Aug';  break;
             case  8: mon = 'Sep';  break;
             case  9: mon = 'Oct';  break;
             case 10: mon = 'Nov';  break;
             case 11: mon = 'Dec';  break;
             }
             return mon + ' ' + d.getDate();
         };

         // Formats d as a full date (month, day, and year).
         full_date = function(d) {
             var yy = d.getFullYear() % 100;
             if (yy < 10)
             {
                 yy = '0' + yy;
             }
             return (d.getMonth() + 1) + '/' + d.getDate() + '/' + yy;
         };

         d = new Date(t * 1000);
         if (!use_local_tz) {
             d.setTime(d.getTime() + ((d.getTimezoneOffset() * 60) * 1000));
         }

         now = new Date();
         strtime = '';
         if (show_time) {
             strtime = ', ' + time_of_day(d);
         }

         if (d.getFullYear() == now.getFullYear()) {
             if (d.getMonth() == now.getMonth() && d.getDate() == now.getDate()) {
                 if (show_time) {
                     strtime = 'Today at ';
                 }
                 return strtime + time_of_day(d);
             }
             return day_of_year(d) + strtime;
         }
         return full_date(d) + strtime;
     };

     juice.modifiers = {

         _: function(o) {
             var s;
             if (juice.is_object(o)) {
                 if (o.hasOwnProperty('render') &&
                     o.hasOwnProperty('fire_domify')) {
                     // It's a widget, no safing needed.
                     return o.toString();
                 }
             }
             else if (juice.is_null(o)) {
                 return null;
             }
             else if (juice.is_undefined(o)) {
                 return undefined;
             }
             s = o.toString();
             return s
                 .replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;');
         },

         date: function(t) {
             return format_ts_offset(t, true, true);
         },

         integer: function(n) {
             var chunks = [], s = String(n);
             while (s) {
                 chunks.push(s.slice(-3));
                 s = s.slice(0,-3);
             }
             return chunks.reverse().join(",");
         },

         json: juice.dump
     };

 })(juice);
