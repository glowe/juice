#ifndef v8_juice_util_h
#define v8_juice_util_h

#define ASSERT_N_ARGS(num_args)                                                                \
    if (args.Length() != num_args) {                                                           \
        return v8::ThrowException(                                                             \
           v8::Exception::Error(                                                               \
               v8::String::New(v8_juice::format_args_error(num_args, args.Length(), false)))); \
    }

#define ASSERT_ATLEAST_N_ARGS(num_args)                                                       \
    if (args.Length() < num_args) {                                                           \
        return v8::ThrowException(                                                            \
           v8::Exception::Error(                                                              \
               v8::String::New(v8_juice::format_args_error(num_args, args.Length(), true)))); \
    }

namespace v8_juice {

const char* format_args_error(const int num_expected, const int num_actual, const bool atleast);

}

#endif
