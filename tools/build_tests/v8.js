// This code is duplicated for robustness. We don't want a syntax error in
// build.js to mess up this test.
quit(v8() === 'v8' ? 0 : 2);
