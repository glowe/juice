#include "os.h"
#include "util.h"
#include <cerrno>
#include <cstdlib>
#include <cstring>
#include <dirent.h>
#include <libgen.h>
#include <sstream>
#include <string>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>
#include <v8.h>
#include <vector>

namespace {

v8::Handle<v8::Value> os_error(const int errnum)
{
    v8::Handle<v8::ObjectTemplate> exception = v8::ObjectTemplate::New();
    exception->Set(v8::String::New("message"), v8::String::New(strerror(errno)));
    exception->Set(v8::String::New("errno"), v8::Integer::New(errnum));
    return v8::ThrowException(exception->NewInstance());
}

FILE* convert_arg_to_file(v8::Handle<v8::Value> arg)
{
    v8::HandleScope handle_scope;

    if (!arg->IsObject()) {
        v8::ThrowException(
            v8::Exception::Error(
                v8::String::New("can't convert argument to file object")));
        printf("args was not an object\n");
        return NULL;
    }

    v8::Local<v8::Object> file_object = arg->ToObject();
    return  (FILE*) (v8::Local<v8::External>::Cast(file_object->GetInternalField(0))->Value());
}

v8::Handle<v8::Object> convert_file_to_object(FILE* file)
{
    // Create the file object (stolen from k7).
    v8::Handle<v8::FunctionTemplate> clazz = v8::FunctionTemplate::New();
    v8::Handle<v8::ObjectTemplate> file_object = clazz->InstanceTemplate();
    // Internal fields are not accessible from JS
    file_object->SetInternalFieldCount(1);
    v8::Handle<v8::Object> file_instance = file_object->NewInstance();
    file_instance->SetInternalField(0, v8::External::New((void*) file));
}

v8::Handle<v8::Value> os_basename(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;
    v8::String::AsciiValue path(args[0]);
    return v8::String::New(basename(*path));
}

v8::Handle<v8::Value> os_dirname(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;
    v8::String::AsciiValue path(args[0]);
    return v8::String::New(dirname(*path));

}

v8::Handle<v8::Value> os_fclose(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    FILE* file = convert_arg_to_file(args[0]);

    if (file == NULL) { // Conversion failed
        return v8::Undefined();
    }

    if (fclose(file) == 0) return os_error(errno);

    return v8::Undefined();
}

v8::Handle<v8::Value> os_feof(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    FILE* file = convert_arg_to_file(args[0]);

    if (file == NULL) { // Conversion failed
        return v8::Undefined();
    }

    return v8::Boolean::New(feof(file));
}

v8::Handle<v8::Value> os_fopen(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_N_ARGS(2);

    v8::String::AsciiValue path(args[0]);
    v8::String::AsciiValue mode(args[1]);

    FILE* file = fopen(*path, *mode);

    if (file == NULL) return os_error(errno);


    return convert_file_to_object(file);
}

// Unline posix fread, the stream is the first argument
v8::Handle<v8::Value> os_fread(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;
    ASSERT_N_ARGS(2);

    FILE* file = convert_arg_to_file(args[0]);

    if (file == NULL) { // Conversion failed
        return v8::Undefined();
    }

    const int amount = (int) args[1]->Int32Value();
    const int size = sizeof(char);

    char* buf = new char[size * amount];
    size_t chunk = fread(buf, size, amount, file);
    v8::Handle<v8::String> contents = v8::String::New(buf, chunk);
    delete [] buf;
    return contents;
}

v8::Handle<v8::Value> os_fseek(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;
    ASSERT_N_ARGS(3);

    FILE* file = convert_arg_to_file(args[0]);

    if (file == NULL) { // Conversion failed
        return v8::Undefined();
    }

    long offset = (long) args[1]->Uint32Value();
    int whence = (int) args[2]->Int32Value();

	if (fseek(file, offset, whence) != 0) return os_error(errno);

    return v8::Undefined();
}

v8::Handle<v8::Value> os_ftell(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    FILE* file = convert_arg_to_file(args[0]);

    if (file == NULL) { // Conversion failed
        return v8::Undefined();
    }

    const int tell = ftell(file);

    if (tell == -1) return os_error(errno);

	return v8::Integer::New(tell);
}

// Unlike posix fwrite, this procedure accepts only 2 arguments: the
// file object, and the content to write.
v8::Handle<v8::Value> os_fwrite(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_N_ARGS(3);

    FILE* file = convert_arg_to_file(args[0]);

    if (file == NULL) { // Conversion failed
        return v8::Undefined();
    }

    v8::Local<v8::String> contents = v8::String::Cast(*args[1]);
    const unsigned int size = contents->Length();
    char* chars = new char[size];
    contents->WriteAscii(chars, 0, size);

    if (fwrite(chars, 1, size, file) != size) {
        delete [] chars;
        return os_error(errno);
    }

    delete [] chars;

    return v8::Undefined();
}

v8::Handle<v8::Value> os_getenv(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    v8::String::AsciiValue name(args[0]);

    const char* value = getenv(*name);
    if (value == NULL) {
        return v8::Undefined();
    }

    return v8::String::New(value);
}

v8::Handle<v8::Value> os_listdir(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    DIR *dp;
    struct dirent *ep;

    v8::String::AsciiValue path(args[0]);
    dp = opendir(*path);

    if (dp == NULL) return os_error(errno);

    std::vector<const char*> dir_entries;

    while ((ep = readdir(dp))) {
        dir_entries.push_back(ep->d_name);
    }

    if (ep == NULL) {
        const int errnum = errno;
        closedir(dp);
        return os_error(errnum);
    }

    closedir(dp);

    v8::Handle<v8::Array> entries = v8::Array::New();
    for (unsigned int i = 0; i < dir_entries.size(); i++)
        entries->Set(v8::Number::New(i), v8::String::New(dir_entries[i]));
    return entries;
}

v8::Handle<v8::Value> os_mkdir(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_ATLEAST_N_ARGS(1);

    v8::String::AsciiValue path(args[0]);

    mode_t oct_mode;
    if (args.Length() == 2) {
        v8::String::AsciiValue mode(args[1]);
        std::string mode_str(*mode);
        std::istringstream in_mode(mode_str);
        in_mode >> std::oct;
        in_mode >> oct_mode;
    }
    else {
        oct_mode = 0777;
    }

    mode_t old_umask = umask(0);
    if (mkdir(*path, oct_mode) != 0) {
        const int errnum = errno;
        umask(old_umask);
        return os_error(errno);
    }

    umask(old_umask);
    return v8::Undefined();
}



v8::Handle<v8::Value> os_realpath(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    v8::String::AsciiValue path(args[0]);
    char* real_path = realpath(*path, NULL);

    if (real_path == NULL) return os_error(errno);

    v8::Handle<v8::String> v8_real_path = v8::String::New(real_path);
    free(real_path);
    return v8_real_path;
}

v8::Handle<v8::Value> os_stat(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    v8::String::AsciiValue path(args[0]);

    struct stat file_info;

    if (stat(*path, &file_info) != 0)
        return os_error(errno);

    v8::Handle<v8::ObjectTemplate> statted = v8::ObjectTemplate::New();

    statted->Set(v8::String::New("st_mode"), v8::Integer::New(file_info.st_mode));
    statted->Set(v8::String::New("st_size"), v8::Integer::New(file_info.st_size));
    statted->Set(v8::String::New("st_atime"), v8::Integer::New(file_info.st_atime));
    statted->Set(v8::String::New("st_mtime"), v8::Integer::New(file_info.st_mtime));
    statted->Set(v8::String::New("st_ctime"), v8::Integer::New(file_info.st_ctime));

    return statted->NewInstance();
}

v8::Handle<v8::Value> os_stat_S_ISREG(const v8::Arguments& args)
{
   v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    return v8::Boolean::New(S_ISREG(args[0]->Int32Value()));
}

v8::Handle<v8::Value> os_stat_S_ISDIR(const v8::Arguments& args)
{
   v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    return v8::Boolean::New(S_ISDIR(args[0]->Int32Value()));
}

v8::Handle<v8::Value> os_stat_S_ISCHR(const v8::Arguments& args)
{
   v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    return v8::Boolean::New(S_ISCHR(args[0]->Int32Value()));
}

v8::Handle<v8::Value> os_stat_S_ISBLK(const v8::Arguments& args)
{
   v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    return v8::Boolean::New(S_ISBLK(args[0]->Int32Value()));
}

v8::Handle<v8::Value> os_stat_S_ISFIFO(const v8::Arguments& args)
{
   v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    return v8::Boolean::New(S_ISFIFO(args[0]->Int32Value()));
}


v8::Handle<v8::Value> os_system(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    v8::String::AsciiValue command(args[0]);

    int status = system(*command);

    if (status == -1) return os_error(errno);


    return v8::Number::New(WEXITSTATUS(status));
}

v8::Handle<v8::Value> os_unlink(const v8::Arguments& args)
{
    v8::HandleScope handle_scope;

    ASSERT_N_ARGS(1);

    v8::String::AsciiValue path(args[0]);

    if (unlink(*path) != 0 && errno != ENOENT)
        return os_error(errno);

    return v8::Undefined();
}

};

v8::Local<v8::ObjectTemplate> v8_juice::os_module()
{
    v8::Local<v8::ObjectTemplate> os = v8::ObjectTemplate::New();
    os->Set(v8::String::New("basename"), v8::FunctionTemplate::New(os_basename));
    os->Set(v8::String::New("dirname"),  v8::FunctionTemplate::New(os_dirname));
    os->Set(v8::String::New("fclose"),   v8::FunctionTemplate::New(os_fclose));
    os->Set(v8::String::New("feof"),     v8::FunctionTemplate::New(os_feof));
    os->Set(v8::String::New("fopen"),    v8::FunctionTemplate::New(os_fopen));
    os->Set(v8::String::New("fread"),    v8::FunctionTemplate::New(os_fread));
    os->Set(v8::String::New("fseek"),    v8::FunctionTemplate::New(os_fseek));
    os->Set(v8::String::New("ftell"),    v8::FunctionTemplate::New(os_ftell));
    os->Set(v8::String::New("fwrite"),   v8::FunctionTemplate::New(os_fwrite));
    os->Set(v8::String::New("getenv"),   v8::FunctionTemplate::New(os_getenv));
    os->Set(v8::String::New("listdir"),  v8::FunctionTemplate::New(os_listdir));
    os->Set(v8::String::New("mkdir"),    v8::FunctionTemplate::New(os_mkdir));
    os->Set(v8::String::New("realpath"), v8::FunctionTemplate::New(os_realpath));
    os->Set(v8::String::New("stat"),     v8::FunctionTemplate::New(os_stat));
    os->Set(v8::String::New("system"),   v8::FunctionTemplate::New(os_system));
    os->Set(v8::String::New("unlink"),   v8::FunctionTemplate::New(os_unlink));

    os->Set(v8::String::New("SEEK_CUR"), v8::Integer::New(SEEK_CUR));
    os->Set(v8::String::New("SEEK_END"), v8::Integer::New(SEEK_END));
    os->Set(v8::String::New("SEEK_SET"), v8::Integer::New(SEEK_SET));

    os->Set(v8::String::New("S_ISREG"),  v8::FunctionTemplate::New(os_stat_S_ISREG));
    os->Set(v8::String::New("S_ISDIR"),  v8::FunctionTemplate::New(os_stat_S_ISDIR));
    os->Set(v8::String::New("S_ISCHR"),  v8::FunctionTemplate::New(os_stat_S_ISCHR));
    os->Set(v8::String::New("S_ISBLK"),  v8::FunctionTemplate::New(os_stat_S_ISBLK));
    os->Set(v8::String::New("S_ISFIFO"), v8::FunctionTemplate::New(os_stat_S_ISFIFO));

    return os;

}

