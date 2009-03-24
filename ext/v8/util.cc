#include "util.h"
#include <sstream>
#include <v8.h>

const char* v8_juice::format_args_error(const int num_expected, const int num_actual, const bool atleast)
{
    std::ostringstream error;
    error << "expected " << (atleast ? "at least " : "") << num_expected
          << " argument" << ((num_expected == 0 || num_expected > 1) ? "s" : "")
          << ", but got " << num_actual;
    return error.str().c_str();
}
