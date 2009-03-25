#include "crypt.h"
#include <v8.h>
#include <openssl/sha.h>
#include <sstream>

namespace {
v8::Handle<v8::Value> sha1(const v8::Arguments& args)
{
    v8::String::AsciiValue s(args[0]);

    unsigned char md[SHA_DIGEST_LENGTH];
    SHA1(reinterpret_cast<unsigned char *>(*s), s.length(), md);

    std::stringstream ss;
    ss << std::hex << std::noshowbase;
    for (int i = 0; i < SHA_DIGEST_LENGTH; i++)
    {
        ss.width(2);
        ss.fill('0');
        ss << static_cast<unsigned short>(md[i]);
    }
    return v8::String::New(ss.str().c_str());

}

}

v8::Local<v8::ObjectTemplate> v8_juice::crypt_module()
{
    v8::Local<v8::ObjectTemplate> crypt = v8::ObjectTemplate::New();
    crypt->Set(v8::String::New("sha1"), v8::FunctionTemplate::New(sha1));
    return crypt;
}
