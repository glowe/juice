#include <cerrno>
#include <cstdlib>
#include <exception>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>
#include <v8.h>

#include "crypt.h"
#include "os.h"

namespace {

class FileIOError : std::exception {
public:
    FileIOError(const char* filename, const char* err)
    {
        std::ostringstream buf;
        buf << "file IO error (" << filename << ") : " << err;
        msg = buf.str();
    }

    virtual ~FileIOError() throw() {}

    virtual const char* what() throw()
    {
        return msg.c_str();
    }
private:
    std::string msg;
};

// Stolen from GOOGLE
void report_exception(const v8::TryCatch& try_catch)
{
    v8::HandleScope handle_scope;
    v8::String::Utf8Value exception(try_catch.Exception());

    v8::Handle<v8::Message> message = try_catch.Message();

    if (message.IsEmpty()) {
        std::cout << *exception << std::endl;
        return;
    }

    v8::String::Utf8Value filename(message->GetScriptResourceName());
    int linenum = message->GetLineNumber();
    std::cout << *filename << ":" << linenum << ": " << *exception << std::endl;

    v8::String::Utf8Value source_line(message->GetSourceLine());
    std::cout << *source_line << std::endl;
    const int start = message->GetStartColumn();
    for (int i = 0; i < start; i++) {
        std::cout << " ";
    }
    const int end = message->GetEndColumn();
    for (int i = start; i < end; i++) {
        std::cout << "^";
    }
    std::cout << std::endl;
}

std::string read_file(const char* filename) throw (FileIOError)
{
    struct stat file_info;
    int stat_ret = stat(filename, &file_info);
    if (stat_ret == 0) {
        if (!S_ISREG(file_info.st_mode))
            throw FileIOError(filename, "attempting to read a non-file");
    }
    else if (errno == ENOENT)
        throw FileIOError(filename, "file not found");
    else {
        std::ostringstream err;
        err << "error no: " << errno;
        throw FileIOError(filename, err.str().c_str());
    }

    std::ifstream file;

    file.open(filename, std::ifstream::in);
    if (!file.is_open())
        throw FileIOError(filename, "can't open");

    std::ostringstream source;
    for (;;) {
        char c = (char) file.get();
        if (file.eof()) break;
        source << c;
    }

    file.close();

    return source.str();
}

v8::Handle<v8::Value> compile_and_run(v8::Handle<v8::String> source,
                                      v8::Handle<v8::String> name)
{
    v8::HandleScope handle_scope;
    v8::Local<v8::Script> script = v8::Script::Compile(source, name);

    // If compilation failed.
    if (script.IsEmpty()) return v8::Handle<v8::Value>();

    return script->Run();
}

v8::Handle<v8::Value> load(const v8::Arguments& args)
{
    for (int i = 0; i < args.Length(); i++) {
        v8::HandleScope handle_scope;
        v8::String::Utf8Value filename(args[i]);

        v8::Local<v8::String> source;
        try {
            source = v8::String::New(read_file(*filename).c_str());
        }
        catch (FileIOError &e) {
            return v8::ThrowException(
                v8::Exception::Error(
                    v8::String::New(e.what())));
        }

        v8::Handle<v8::Value> result = compile_and_run(source, args[i]->ToString());
        if (result.IsEmpty()) return result;
    }

    return v8::Handle<v8::Value>();
}


void run_shell(v8::Handle<v8::Context> context)
{
    std::cout << "V8 version "
              << v8::V8::GetVersion()
              << std::endl;

    for (;;) {
        std::cout << "> ";

        std::string source;
        std::getline(std::cin, source);

        if (std::cin.eof()) break;

        if (source.length() == 0) continue; // Empty line

        v8::HandleScope handle_scope;
        v8::TryCatch try_catch;
        v8::Handle<v8::Value> result =
            compile_and_run(v8::String::New(source.c_str()),
                            v8::String::New("*shell*"));
        if (try_catch.HasCaught())
            report_exception(try_catch);
        else if (!result.IsEmpty() && !result->IsUndefined())
            std::cout << *v8::String::AsciiValue(result);
    }

    std::cout << std::endl << "Goodbye!" << std::endl;
}


v8::Handle<v8::Value> print(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;
    if (args.Length() == 0) {
        std::cout << std::endl;
        return v8::Handle<v8::Value>();
    }

    std::cout << *v8::String::Utf8Value(args[0]);

    for (int i = 1; i < args.Length(); i++) {
        std::cout << " " << *v8::String::Utf8Value(args[i]);
    }

    std::cout << std::endl;

    return v8::Handle<v8::Value>();
}

v8::Handle<v8::Value> version(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;
    return v8::String::New(v8::V8::GetVersion());
}

// Quits.
v8::Handle<v8::Value> quit(const v8::Arguments& args)
{
    // If arguments are not supplied, args[0] will yield undefined, which
    // converts to the integer value 0.
    int exit_code = args[0]->Int32Value();
    exit(exit_code);
    return v8::Undefined();
}

};

int main(int argc, char* argv[])
{
    v8::HandleScope handle_scope;

    v8::Local<v8::ObjectTemplate> global = v8::ObjectTemplate::New();
    global->Set(v8::String::New("load"),    v8::FunctionTemplate::New(load));
    global->Set(v8::String::New("print"),   v8::FunctionTemplate::New(print));
    global->Set(v8::String::New("quit"),    v8::FunctionTemplate::New(quit));
    global->Set(v8::String::New("version"), v8::FunctionTemplate::New(version));

    v8::Local<v8::ObjectTemplate> sys = v8::ObjectTemplate::New();
    sys->Set(v8::String::New("crypt"), v8_juice::crypt_module());
    sys->Set(v8::String::New("os"),    v8_juice::os_module());
    sys->Set(v8::String::New("v8"),    v8::Boolean::New(true));
    global->Set(v8::String::New("sys"), sys);

    v8::Handle<v8::Context> context = v8::Context::New(NULL, global);
    v8::Context::Scope context_scope(context);

    run_shell(context);

    return 0;
}
