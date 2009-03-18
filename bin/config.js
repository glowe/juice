
/*
 *
 * TODO: set up a "bin" dir for juice executables
 *
 * 1) command-line arguments:
 *
 * --js=path_to_executable (optional: use "js" in path by default)
 * --with-lib=juice-bar:/path/to/juice-bar/lib
 * --with-lib=jquery:/path/to/jquery/lib
 *
 * 1.5) juice/build/juice-config-nice.js (does what you think)
 *
 * 2) analyze site widgets to find external library dependencies (and do so
 * recursively with external libraries)
 *
 * 2.5) insure that all external libraries can be located, either in the
 * default juice lib path (specified in ~/.juice) or in the path specified on
 * the command-line to this program
 *
 * 3) store settings (library name => path mapping, original command line
 * settings (for nice config), etc.) in ./.juice-config.json
 *
 * NOTES:
 *
 * - During compilation, insure that dependencies on external libraries have
 not changed since the last time we ran configure.
 *
 */

// "JUICE_HOME"


var program_options =
    juice.tools.program_options(
        {"with-lib=[]": ["specify path to an external library", []]});

//print(program_options);
print(juice.dump(program_options.parse_arguments(argv)));
