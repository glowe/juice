// This code is duplicated for robustness. We don't want a syntax error in
// build.js to mess up this test.
quit(typeof write_file !== 'undefined' ? 0 : 2);
